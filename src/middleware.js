/*
 * @flow
 */
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
export function createPauseMiddleware(): Middleware {
  return (state, action, plugins, next) => {
    //Add plugin
    //TODO, how to pause ???

    return next(state, action, plugins);
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