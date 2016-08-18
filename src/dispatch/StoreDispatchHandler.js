/* @flow */
import Immutable from 'immutable';

import asyncReduce from '../utils/asyncReduce';
import combineMiddleware from '../utils/combineMiddleware';

import type { Action, Updater } from 'async-dispatcher';
import type { UpdaterList, MiddlewareList } from './types';

type CombinedUpdater<S> = (state: S, action: Action) => Promise<S>;

/**
 * A class that keeps track of all the information for a Store's dispatch.
 */
export default class StoreDispatchHandler<S> {
  _updaters: UpdaterList<S>;
  _middleware: MiddlewareList<S>;

  /**
   * StoreDispatchHandler constructor.
   *
   * @param action      {List<Updater>}     The action that is being dispatched
   * @param middleware  {List<Middleware>}  The middleware to use during the dispatch
   */
  constructor(updaters: UpdaterList<S>, middleware: MiddlewareList<S>) {
    this._updaters = updaters;
    this._middleware = middleware;
  }

  /**
   * Create a new StoreDispatchHandler.
   *
   * @param middleware  {List<Middleware>}  The middleware to use during the dispatch
   *
   * @return            {StoreDispatchHandler}     The dispatch for the given action
   */
  static createDispatchHandler(updaters: UpdaterList<S>, middleware?: MiddlewareList<S>): StoreDispatchHandler {
    return new StoreDispatchHandler(updaters, middleware? middleware: Immutable.List());
  }

  /**
   * Perform the dispatch.
   *
   * @param state       {any}               The initial state
   * @param action      {List<Updater>}     The action that is being dispatched
   */
  dispatch(state: S, action: Action): Promise<S> {
    const { size } = this._updaters;
    if(size === 0) return Promise.resolve(state);

    // Go through each updater
    return asyncReduce(this._updaters, (currState, updater, index) => {
      const dispatch = this._createDispatchFunc(updater, index, size);

      // Perform Dispatch
      return dispatch(currState, action);
    }, state);
  }

  _createDispatchFunc(updater: Updater<S>, updaterIndex: number, updaterCount: number): CombinedUpdater<S> {
    return combineMiddleware(this._middleware, updater, {
      getUpdaterIndex() {
        return updaterIndex;
      },
      getUpdaterCount() {
        return updaterCount;
      },
    });
  }
}
