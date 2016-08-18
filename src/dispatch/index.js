/* @flow */
import DispatcherDispatchHandler from './DispatcherDispatchHandler';
import StoreDispatchHandler from './StoreDispatchHandler';

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
  return (action) => {
    const dispatchHandler = DispatcherDispatchHandler.createDispatchHandler(action, middleware);

    return performDispatcherDispatch(dispatchHandler, updateStores);
  };
}

function performDispatcherDispatch(
  dispatchHandler: DispatcherDispatchHandler,
  updateStores: WrappedUpdateStoresFunc,
  initialPausePoints?: PausePointMap
): Promise<StoresMap> {
  return new Promise((resolve) => {
    updateStores((stores) =>  {
      // Perform dispatch
      const updatedStoresPromise = dispatchHandler.dispatch(stores, initialPausePoints);

      return updatedStoresPromise.then(({ pausePoints, updatedStores }) => {
        // Wait for any pause points, before resolving for this function
        resolve(
          pausePoints?
            performDispatcherDispatch(dispatchHandler, updateStores, pausePoints):
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