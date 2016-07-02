/*
 * @flow
 */
import type { Middleware } from 'async-dispatcher';
import type Dispatcher from './Dispatcher';

export function createGetStoreNameMiddleware(storeName: string): Middleware {
  return (state, action, plugins, next) => {
    //Add plugin
    //TODO

    return next(state, action, plugins);
  };
}

export function createGetCurrentStateMiddleware(): Middleware {
  return (state, action, plugins, next) => {
    //Add plugin
    //TODO

    return next(state, action, plugins);
  };
}

export function createPauseMiddleware(): Middleware {
  return (state, action, plugins, next) => {
    //Add plugin
    //TODO

    return next(state, action, plugins);
  };
}

export function createDispatchMiddleware(): Middleware {
  return (state, action, plugins, next) => {
    //Add plugin
    //TODO

    return next(state, action, plugins);
  };
}