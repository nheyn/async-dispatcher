/* @flow */
import DispatcherDispatchHandler from './DispatcherDispatchHandler';
import StoreDispatchHandler from './StoreDispatchHandler';

import type Immutable from 'immutable';
import type { Action, Middleware, Store, Updater } from 'async-dispatcher';

type MiddlewareList<S> = Immutable.List<Middleware<S>>;
type StoresMap = Immutable.Map<string, Store<any>>;
type PausePoint = { };
type PausePointList = Immutable.List<PausePoint>;
type UpdaterList<S> = Immutable.List<Updater<S>>;

export type UpdateStoresFunc = (update: (stores: StoresMap) => StoresMap | Promise<StoresMap>) => Promise<StoresMap>;
export type DispatcherDispatch = (action: Action) => Promise<StoresMap>;
export type StoreDispatch<S> = (state: S, action: Action, middleware?: MiddlewareList<S>) => Promise<S>;

/**
 * Create a function that will perform a Dispatchers dispatch.
 *
 */
export function createDispatchForDispatcher(
  middleware: MiddlewareList<any>,
  updateStores: UpdateStoresFunc,
): DispatcherDispatch {
  return (action) => {
    const dispatchHandler = DispatcherDispatchHandler.createDispatchHandler(action, middleware);

    return performDispatcherDispatch(dispatchHandler, updateStores);
  };
}

function performDispatcherDispatch(
  dispatchHandler: DispatcherDispatchHandler,
  updateStores: UpdateStoresFunc,
  initialPausePoints?: PausePointList
): Promise<StoresMap> {
  return new Promise((resolve) => {
    updateStores((stores) =>  {
      // Perform dispatch
      const updatedStoresPromise = dispatchHandler.dispatch(stores, initialPausePoints);

      return updatedStoresPromise.then(({ pausePoints, updatedStores }) => {
        // Wait for any pause points, before resolving for this function
        resolve(
          pausePoints?
            performDispatcherDispatch(dispatchHandler, pausePoints):
            updatedStores
        )

        return updatedStores;
      });
    });
  });
}

/**
 * Create a function that will perform a Dispatchers dispatch.
 *
 */
export function createDispatchForStore<S>(updaters: UpdaterList<S>, middleware: MiddlewareList<S>): StoreDispatch {
  return (state, action, extraMiddleware) => {
    const currMiddleware = extraMiddleware? middleware.concat(extraMiddleware): middleware;
    const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters, currMiddleware);

    return dispatchHandler.dispatch(state, action);
  };
}