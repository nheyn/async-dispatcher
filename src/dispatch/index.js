/* @flow */
import DispatcherDispatchHandler from './DispatcherDispatchHandler';
import StoreDispatchHandler from './StoreDispatchHandler';

import type { Action } from 'async-dispatcher';
import type {
  UpdaterList,
  MiddlewareList,
  StoresMap,
  PausePointMap,
  UpdateStoresFunc,
  DispatcherDispatch,
  StoreDispatch,
} from './types';

type WrappedUpdateStoresFunc = (updater: UpdateStoresFunc) => Promise<StoresMap>;

/**
 * Create a function that will perform a Dispatchers dispatch.
 *
 */
export function createDispatchForDispatcher(
  middleware: MiddlewareList<any>,
  updateStores: WrappedUpdateStoresFunc,
): DispatcherDispatch {
  const dispatchHandler = DispatcherDispatchHandler.createDispatchHandler(middleware);

  return (action) => performDispatcherDispatch(dispatchHandler, updateStores, action);
}

function performDispatcherDispatch(
  dispatchHandler: DispatcherDispatchHandler,
  updateStores: WrappedUpdateStoresFunc,
  action: Action,
  initialPausePoints?: PausePointMap
): Promise<StoresMap> {
  return new Promise((resolve) => {
    updateStores((stores) =>  {
      // Perform dispatch
      const updatedStoresPromise = dispatchHandler.dispatch(stores, action, initialPausePoints);

      return updatedStoresPromise.then(({ pausePoints, updatedStores }) => {
        // Wait for any pause points, before resolving for this function
        resolve(
          pausePoints?
            performDispatcherDispatch(dispatchHandler, updateStores, action, pausePoints):
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
export function createDispatchForStore<S>(updaters: UpdaterList<S>): StoreDispatch<S> {
  const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

  return (state, action, middleware) => dispatchHandler.dispatch(state, action, middleware);
}