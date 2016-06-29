/*
 * @flow
 */
import type Immutable from 'immutable';
import type { Action, Middleware, NextUpdater, Updater } from 'async-dispatcher';

type MiddlewareUpdater<S> = (statePromise: Promise<S>, action: Action) => Promise<S>;
type MiddlewareList<S> = Immutable.List<Middleware<S>>;

/**
 * Combine the current middlware together with the updater.
 */
export default function combineMiddleware<S>(middlewareList: MiddlewareList, updater: Updater<S>): NextUpdater<S> {
  const updaterForMiddleware = wrapUpdater(updater);

  // Create an updater that calls all the middleware then the updater
  const combinedMiddlewareUpdater = middlewareList.reverse().reduce(applyMiddlware, updaterForMiddleware);

  return unwrapUpdater(combinedMiddlewareUpdater);
}

// Helper funcs
function applyMiddlware<S>(nextUpdater: MiddlewareUpdater<S>, middleware: Middleware<S>): MiddlewareUpdater<S> {
  return (statePromise, action) => statePromise.then((state) => {
    const next = unwrapUpdater(nextUpdater);

    return middleware(state, action, next);
  });
}

function wrapUpdater<S>(updater: Updater<S> | NextUpdater<S>): MiddlewareUpdater<S> {
  return (statePromise, action) => statePromise.then((state) => updater(state, action));
}

function unwrapUpdater<S>(middlewareUpdater: MiddlewareUpdater<S>): NextUpdater<S> {
  return (state, action) => middlewareUpdater(Promise.resolve(state), action);
}