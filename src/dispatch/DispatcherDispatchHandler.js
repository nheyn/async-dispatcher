/* @flow */
import Immutable from 'immutable';

import { createGetStoreNameMiddleware, createPauseMiddleware, createPausePointMiddlware } from './middleware';
import mapOfPromisesToMapPromise from './utils/mapOfPromisesToMapPromise';

import type { Action, Middleware } from 'async-dispatcher';

type MiddlewareList = Immutable.List<Middleware<any>>;
type StoresWithPauses = {
  updatedStores: StoresMap,
  pausePoints: Immutable.Map<string, *>,
};

/**
 * A class that keeps track of all the information for a Dispatcher's dispatch.
 */
export default class DispatcherDispatchHandler {
  _action: Action;
  _middleware: MiddlewareList;

  /**
   * DispatcherDispatchHandler constructor.
   *
   * @param action      {Action}            The action that is being dispatched
   * @param middleware  {List<Middleware>}  The middleware to use during the dispatch
   */
  constructor(action: Action, middleware: MiddlewareList) {
    this._action = action;
    this._middleware = middleware;
  }

  /**
   * Create a new DispatcherDispatchHandler.
   *
   * @param action      {Action}              The action that is being dispatched
   * @param middleware  {List<Middleware>}    The middleware to use during the dispatch
   *
   * @return            {DispatcherDispatchHandler}  The dispatch for the given action
   */
  static createDispatchHandler(action: Action, middleware?: MiddlewareList): DispatcherDispatchHandler {
    return new DispatcherDispatchHandler(action, middleware? middleware: Immutable.List());
  }

  /**
   * Perform the dispatch using the given stores.
   *
   * @param stores              {Map<Store>}        The stores to dispatch to
   * @param initialPausePoints  {[Map<PausePoint>]} If given, the location to start the given stores
   *
   * @return                    {Object}            The updated stores, along with any pauses that occurred
   */
  dispatch(stores: StoresMap, initialPausePoints?: PausePoints): Promise<StoresWithPauses> {
    // Dispatch to all stores, unless there are pause then only dispatch to the paused stores
    let currStores = initialPausePoints? stores.filter((_, storeName) => initialPausePoints.has(storeName));

    // Keep track of stores that paused
    let pausePoints = Immutable.Map();

    // Go through each store
    const updatedStorePromises = currStores.map((store, storeName) => {
      // Start at correct updater w/ state after pause
      let pausePoint = null;
      if(initialPausePoints && initialPausePoints.has(storeName)) {
        pausePoint = initialPausePoints.get(storeName);
      }

      // Preform dispatch
      const dispatchPromise = this._dispatchStore(currStores, storeName, pausePoint)

      // Track this store if pause was used
      return dispatchPromise.then({ pausePoint, updatedStore }) => {
        if(pausePoint) pausePoints = pausePoints.set(storeName, pausePoint);

        return updatedStore;
      })
    });

    // Wait for all stores to finish
    return mapOfPromisesToMapPromise(updatedStorePromises).then((updatedStores) => {
      return {
        updatedStores,
        pausePoints: pausePoints.size > 0? pausePoints: null,
      };
    });
  }

  _dispatchStore(store: Store<any>, storeName: stirng, initialPausePoint?: PausePoint): Promise<StoreWithPause> {
    // Add middleware
    let pausePoint = null;
    const pauseMiddleware = createPauseMiddleware((currPausePoint) => { pausePoint = currPausePoint; });
    const getStoreNameMiddleware = createGetStoreNameMiddleware(storeName);
    const pausePointMiddleware = initialPausePoint? createPausePointMiddlware(initialPausePoint): null;

    let middleware = this._middleware;
    middleware = middleware.unshift(pauseMiddleware);
    middleware = middleware.unshift(getStoreNameMiddleware);
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
