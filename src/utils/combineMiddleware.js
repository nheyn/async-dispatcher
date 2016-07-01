/*
 * @flow
 */
import type Immutable from 'immutable';
import type { Action, Middleware, NextUpdater, Plugins, Updater } from 'async-dispatcher';

export type CombinedUpdater<S> = (state: S, action: Action) => Promise<S>;
type MiddlewareUpdater<S> = (statePromise: Promise<S>, action: Action, plugins: Plugins) => Promise<S>;
type MiddlewareList<S> = Immutable.List<Middleware<S>>;

/**
 * Combine the current middlware together with the updater.
 */
export default function combineMiddleware<S>(
  middlewareList: MiddlewareList,
  updater: Updater<S>,
  plugins: Plugins
): CombinedUpdater<S> {
  const updaterForMiddleware = wrapUpdater(updater);

  // Create an updater that calls all the middleware then the updater
  const combinedMiddlewareUpdater = middlewareList.reverse().reduce(applyMiddlware, updaterForMiddleware);

  return injectPlugins(combinedMiddlewareUpdater, plugins);
}

// Helper funcs
function applyMiddlware<S>(nextUpdater: MiddlewareUpdater<S>, middleware: Middleware<S>): MiddlewareUpdater<S> {
  return (statePromise, action, plugins) => statePromise.then((state) => {
    return middleware(state, action, plugins, createNext(nextUpdater));
  });
}

function wrapUpdater<S>(updater: Updater<S> | NextUpdater<S>): MiddlewareUpdater<S> {
  return (statePromise, action, plugins) => statePromise.then((state) => updater(state, action, plugins));
}

function createNext<S>(middlewareUpdater: MiddlewareUpdater<S>): NextUpdater<S> {
  return (state, action, plugins) => middlewareUpdater(Promise.resolve(state), action, plugins);
}

function injectPlugins<S>(middlewareUpdater: MiddlewareUpdater<S>, plugins: Plugins): CombinedUpdater<S> {
  return (state, action) => middlewareUpdater(Promise.resolve(state), action, plugins);
}