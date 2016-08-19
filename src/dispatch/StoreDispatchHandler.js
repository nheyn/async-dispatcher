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

  /**
   * StoreDispatchHandler constructor.
   *
   */
  constructor(updaters: UpdaterList<S>) {
    this._updaters = updaters;
  }

  /**
   * Create a new StoreDispatchHandler.
   *
   *
   * @return            {StoreDispatchHandler}  The dispatch for the given action
   */
  static createDispatchHandler(updaters: UpdaterList<S>): StoreDispatchHandler<S> {
    return new StoreDispatchHandler(updaters);
  }

  /**
   * Perform the dispatch.
   *
   * @param state       {any}               The initial state
   * @param action      {List<Updater>}     The action that is being dispatched
   * @param middleware  {List<Middleware>}  THe middleware to use for this dispatch
   */
  dispatch(state: S, action: Action, middleware: MiddlewareList<S>): Promise<S> {
    const { size } = this._updaters;
    if(size === 0) return Promise.resolve(state);

    // Go through each updater
    return asyncReduce(this._updaters, (currState, updater, index) => {
      const dispatch = createDispatchFunc(updater, index, size, middleware);

      // $FlowIssue - currState can NOT be a promise, but flow thinks it is
      return dispatch(currState, action);
    }, state);
  }
}

function createDispatchFunc<S>(
  updater: Updater<S>,
  updaterIndex: number,
  updaterCount: number,
  middleware: MiddlewareList<S>
): CombinedUpdater<S> {
  return combineMiddleware(middleware, updater, {
    getUpdaterIndex() {
      return updaterIndex;
    },
    getUpdaterCount() {
      return updaterCount;
    },
  });
}