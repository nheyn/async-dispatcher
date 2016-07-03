/*
 * @flow
 */
import PausePromise from './utils/PausePromise';

import type { Middleware } from 'async-dispatcher';
import type Dispatcher from './Dispatcher';

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
export function createPauseMiddleware(
  restartDispatch: (state: S, action: Action, startAt: number) => void,
  rejectDispatch: (err: Error, action: Action) => void,
  pauseErr: Error
): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getUpdaterIndex !== 'function') throw new Error('pause requires getUpdaterIndex plugin');
    const pausedIndex = plugins.getUpdaterIndex();

    //Add plugin
    plugins.pause = (promise) => PausePromise.createPausePromise(promise);

    // Call Updater
    const nextStatePromise = next(state, action, plugins);

    // Return if action has not been paused
    if(!PausePromise.isPausePromise(nextStatePromise)) return nextStatePromise;

    // $FlowSkip
    const pausedStatePromise: PausePromise = nextStatePromise;

    // Return pause error while waiting for pause value
    pausedStatePromise.waitFor().then((stateAfterPause) => {
      restartDispatch(stateAfterPause, action, pausedIndex + 1);
    }).catch((err) => {
      rejectDispatch(err, action);
    });

    return Promise.reject(pauseErr);
  };
}

/**
 * Create a middleware that adds 'dispatch()' to plugins.
 *
 * @param dispatcher  {Dispatcher} The dispatcher to get the state from
 *
 * @return            {Middleware}  The middleware that adds the plugin function
 */
export function createDispatchMiddleware(dispatcher: Dispatcher): Middleware {
  return (state, action, plugins, next) => {
    if(typeof plugins.getCurrentState !== 'function') throw new Error('dispatch requires getCurrentState middleware');
    if(typeof plugins.pause !== 'function')           throw new Error('dispatch requires pause middleware');

    //Add plugin
    plugins.dispatch = (action) => {
      const dispatchPromise = dispatcher.dispatch(action);
      const newStatePromise = dispatchPromise.then(() => plugins.getCurrentState());

      // Pause this dispatch until the action has been dispatched
      return plugins.pause(newStatePromise);
    };

    return next(state, action, plugins);
  };
}