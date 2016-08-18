/* @flow */
import Immutable from 'immutable';

import {
  createGetStoreNameMiddleware,
  createPauseMiddleware,
  createPauseWithMergeMiddleware,
  createPausePointMiddlware,
} from '../middleware';
import mapOfPromisesToMapPromise from '../utils/mapOfPromisesToMapPromise';

import type { Action } from 'async-dispatcher';
import type Store from '../Store';
import type { PausePoint } from '../middleware';
import type { MiddlewareList, StoresMap, PausePointMap } from './types';

type StoresWithPauses = {
  updatedStores: StoresMap,
  pausePoints?: ?PausePointMap,
};
type StoreWithPause = {
  updatedStore: Store<any>,
  pausePoint?: ?PausePoint,
};

/**
 * A class that keeps track of all the information for a Dispatcher's dispatch.
 */
export default class DispatcherDispatchHandler {
  _middleware: MiddlewareList;

  /**
   * DispatcherDispatchHandler constructor.
   *
   * @param middleware  {List<Middleware>}  The middleware to use during the dispatch
   */
  constructor(middleware: MiddlewareList) {
    this._middleware = middleware;
  }

  /**
   * Create a new DispatcherDispatchHandler.
   * @param middleware  {List<Middleware>}           The middleware to use during the dispatch
   *
   * @return            {DispatcherDispatchHandler}  The dispatch for the given action
   */
  static createDispatchHandler(middleware?: MiddlewareList): DispatcherDispatchHandler {
    return new DispatcherDispatchHandler(middleware? middleware: Immutable.List());
  }

  /**
   * Perform the dispatch using the given stores.
   *
   * @param stores              {Map<Store>}        The stores to dispatch to
   * @param action              {Action}            The action that is being dispatched
   * @param initialPausePoints  {[Map<PausePoint>]} If given, the location to start the given stores
   *
   * @return                    {Object}            The updated stores, along with any pauses that occurred
   */
  dispatch(stores: StoresMap, action: Action, initialPausePoints?: PausePointMap): Promise<StoresWithPauses> {
    // Keep track of stores that paused
    let pausePoints = Immutable.Map();

    // Go through each store, unless there are pause then only dispatch to the paused stores
    const currStores = stores.filter((_, storeName) => !initialPausePoints || initialPausePoints.has(storeName));
    const updatedStorePromises = currStores.map((store, storeName) => {
      // Start at correct updater w/ state after pause
      let pausePoint = null;
      if(initialPausePoints && initialPausePoints.has(storeName)) {
        pausePoint = initialPausePoints.get(storeName);
      }

      // Preform dispatch
      const dispatchPromise = this._dispatchStore(store, action, storeName, pausePoint)

      // Track this store if pause was used
      return dispatchPromise.then(({ pausePoint, updatedStore }) => {
        if(pausePoint) pausePoints = pausePoints.set(storeName, pausePoint);

        return updatedStore;
      });
    });

    // Wait for all stores to finish
    return mapOfPromisesToMapPromise(updatedStorePromises).then((updatedStores) => {
      return {
        updatedStores: stores.merge(updatedStores),
        pausePoints: pausePoints.size > 0? pausePoints: null,
      };
    });
  }

  _dispatchStore(
    store: Store<any>,
    action: Action,
    storeName: string,
    initialPausePoint?: ?PausePoint
  ): Promise<StoreWithPause> {
    // Add middleware
    let pausePoint = null;
    const pauseMiddleware = createPauseMiddleware((currPausePoint) => { pausePoint = currPausePoint; });
    const pauseWithMergeMiddleware = createPauseWithMergeMiddleware();
    const getStoreNameMiddleware = createGetStoreNameMiddleware(storeName);
    const pausePointMiddleware = initialPausePoint? createPausePointMiddlware(initialPausePoint): null;

    let middleware = this._middleware;
    middleware = middleware.unshift(pauseMiddleware, getStoreNameMiddleware);
    middleware = middleware.push(pauseWithMergeMiddleware);
    if(pausePointMiddleware) middleware = middleware.unshift(pausePointMiddleware);

    // Perform dispatch
    let updatedStorePromise = store.dispatch(action, middleware);

    // Return the initial store, if waiting for pause
    updatedStorePromise = updatedStorePromise.catch((err) => {
      if(pausePoint)  return store;
      else            throw err;
    });

    return updatedStorePromise.then((updatedStore) => {
      return {
        pausePoint,
        updatedStore,
      };
    });
  }
}
