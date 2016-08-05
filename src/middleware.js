/*
 * @flow
 */
import PausePromise from './utils/PausePromise';

import type { Action, Middleware } from 'async-dispatcher';
import type Dispatcher from './Dispatcher';

type PauseMiddlewareSpec<S> = {
  restartDispatch: (storeName: string, state: S, action: Action, startAt: number) => void,
  rejectDispatch: (err: Error, action: Action) => void,
  pauseError: Error
};
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
export function createGetCurrentStateMiddleware(dispatcher: Dispatcher): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getStoreName !== 'function') throw new Error('getCurrentState requires getStoreName plugin');
    const storeName = plugins.getStoreName();

    //Add plugin
    plugins.getCurrentState = () => dispatcher.getStateFor(storeName);

    return next(state, action, plugins);
  };
}

/**
 * Create a middleware that adds 'pause()' to plugins.
 *
 * @return          {Middleware}  The middleware that adds the plugin function
 */
export function createPauseMiddleware<S>(spec: PauseMiddlewareSpec<S>): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getUpdaterIndex !== 'function') throw new Error('pause requires getUpdaterIndex plugin');
    if(typeof plugins.getStoreName !== 'function') throw new Error('getCurrentState requires getStoreName plugin');

    const { restartDispatch, rejectDispatch, pauseError } = spec;
    const pausedIndex = plugins.getUpdaterIndex();
    const storeName = plugins.getStoreName();

    // Add plugin
    plugins.pause = (promise) => PausePromise.createPausePromise(promise);

    // Call Updater
    const nextStatePromise = next(state, action, plugins);

    // Return if action has not been paused
    if(!PausePromise.isPausePromise(nextStatePromise)) return nextStatePromise;

    // $FlowSkip
    const stateAfterPausePromise: Promise<S> = nextStatePromise.waitFor();

    // Return pause error while waiting for pause value
    stateAfterPausePromise.then((stateAfterPause) => {
      restartDispatch(storeName, stateAfterPause, action, pausedIndex + 1);
    }).catch((err) => {
      rejectDispatch(err, action);
    });

    return Promise.reject(pauseError);
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
    if(typeof plugins.getStoreName !== 'function') throw new Error('getCurrentState requires getStoreName plugin');

    const storeName = plugins.getStoreName();

    //Add plugin
    plugins.dispatch = (updatedStateMaybePromise, action) => {
      const dispatchPromise = Promise.resolve(updatedStateMaybePromise).then((updatedState) => {
        return dispatchWithState(storeName, updatedState, action);
      });

      // Pause this dispatch until the action has been dispatched
      return plugins.pause(dispatchPromise);
    };

    return next(state, action, plugins);
  };
}

/**
 * Created a middleware that skips the first few updaters in the given store.
 *
 * @return          {Middleware}  The middlware that skips some of the updaters
 */
export function createSkipUpdaterMiddleware(storeName: string, startAt: number): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getStoreName !== 'function') throw new Error('getCurrentState requires getStoreName plugin');
    if(typeof plugins.getUpdaterIndex !== 'function') throw new Error('pause requires getUpdaterIndex plugin');

    const currStoreName = plugins.getStoreName();
    const pausedIndex = plugins.getUpdaterIndex();

    if(currStoreName !== storeName) return next(state, action, plugins);
    else if(pausedIndex >= startAt) return next(state, action, plugins);
    else                            return Promise.resolve(state);
  };
}
