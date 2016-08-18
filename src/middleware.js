/*
 * @flow
 */
import type { Action, MergeStoreFunc, Middleware } from 'async-dispatcher';
import type Dispatcher from './Dispatcher';

export type PausePoint = { pausePromise: Promise<any>, index: number };

type GetStateFunc<S> = (storeName: string) => S;
type OnPauseFunc = (pausePoint: PausePoint) => void;
type DispatchWithState<S> = (storeName: string, state: S, action: Action) => Promise<S>;

/**
 * Create a middleware that adds 'getStoreName()' to plugins.
 *
 * @param storeName {string}      The name to return from the plugin function
 *
 * @return          {Middleware}  The middleware that adds the plugin function
 */
export function createGetStoreNameMiddleware(storeName: string): Middleware {
  return (state, action, plugins, next) => {
    //Add plugin
    plugins.getStoreName = () => storeName;

    return next(state, action, plugins);
  };
}

/**
 * Create a middleware that adds 'getCurrentState()' to plugins.
 *
 * @param dispatcher  {Dispatcher} The dispatcher to get the state from
 *
 * @return            {Middleware}  The middleware that adds the plugin function
 */
export function createGetCurrentStateMiddleware<S>(getStateFor: GetStateFunc<S>): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getStoreName !== 'function') throw new Error('getCurrentState requires getStoreName plugin');
    const storeName = plugins.getStoreName();

    //Add plugin
    plugins.getCurrentState = () => getStateFor(storeName);

    return next(state, action, plugins);
  };
}

/**
 * Create a middleware that adds 'pause()' to plugins.
 *
 *
 *
 * @return          {Middleware}  The middleware that adds the plugin function
 */
export function createPauseMiddleware<S>(onPause: OnPauseFunc): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getUpdaterIndex !== 'function') throw new Error('pause requires getUpdaterIndex plugin');

    // Add plugin
    let hasPaused = false;
    plugins.pause = (promise) => {
      hasPaused = true;
      return promise;
    };

    // Call Updater
    let nextStatePromise = next(state, action, plugins);;

    // Return if action has not been paused //NOTE, pause must be called sync for this to work
    if(!hasPaused) return nextStatePromise;

    onPause({
      pausePromise: nextStatePromise,
      index: plugins.getUpdaterIndex(),
    });

    return Promise.reject(new Error('Pause has been called - DO NOT handle this error'));
  };
}

/**
 *
 */
export function createPauseWithMergeMiddleware(mergeFunc: MergeStoreFunc): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.pause !== 'function') {
      console.log({ plugins });
      throw new Error('pauseWithMerge requires pause plugin');
    }
    if(typeof plugins.getCurrentState !== 'function') throw new Error('pauseWithMerge requires pause getCurrentState');

    // Replace pause with function that merges
    const { pause } = plugins;
    plugins.pause = (promise) => {
      return pause(promise).then((stateAfterPause) => {
        const currState = plugins.getCurrentState();

        // Skip merge if is not needed
        if(currState === state)           return stateAfterPause;
        if(currState === stateAfterPause) return stateAfterPause;

        return mergeFunc(currState, stateAfterPause, action);
      });
    };

    return next(state, action, plugins);
  };
}

/**
 * Create a middleware that restarts after the 'pause()' plugin was called.
 *
 * @return          {Middleware}  The middleware that adds the plugin function
 */
export function createPausePointMiddlware({ pausePromise, index }: PausePoint): Middleware {
  let hasRestarted = false;
  return (state, action, plugins, next) => {
    if(typeof plugins.getUpdaterIndex !== 'function') throw new Error('pause requires getUpdaterIndex plugin');
    if(hasRestarted) return next(state, action, plugins);

    const currIndex = plugins.getUpdaterIndex();
    if(currIndex <= index) return Promise.resolve(state);

    return pausePromise.then((stateAfterPause) => {
      hasRestarted = true;
      return next(stateAfterPause, action, plugins);
    });
  };
}

/**
 * Create a middleware that adds 'dispatch()' to plugins.
 *
 * @return            {Middleware}  The middleware that adds the plugin function
 */
export function createDispatchMiddleware<S>(dispatchWithState: DispatchWithState): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getCurrentState !== 'function') throw new Error('dispatch requires getCurrentState middleware');
    if(typeof plugins.pause !== 'function')           throw new Error('dispatch requires pause middleware');
    if(typeof plugins.getStoreName !== 'function')    throw new Error('dispatch requires getStoreName plugin');

    const storeName = plugins.getStoreName();

    //Add plugin
    plugins.dispatch = (updatedStateMaybePromise, action) => {
      const dispatchPromise = Promise.resolve(updatedStateMaybePromise).then((updatedState) => {
        return dispatchWithState(storeName, updatedState, action);
      });

      // Pause this dispatch until the action has been dispatched
      return plugins.pause(dispatchPromise).then(() => plugins.getCurrentState());
    };

    return next(state, action, plugins);
  };
}
