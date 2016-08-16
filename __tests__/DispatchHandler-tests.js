jest.unmock('../src/DispatchHandler');

import Immutable from 'immutable';
import DispatchHandler from '../src/DispatchHandler';
import Store from '../src/Store';
import { createPauseMiddleware } from '../src/middleware';

const pause = jest.fn().mockImplementation((s, a, p, next) => next(s, a, p));
createPauseMiddleware.mockReturnValue(pause);

function createStore(simulatePause = false) {
  let store = new Store();

  if(simulatePause) {
    store.dispatch.mockImplementation(() => {
      //TODO, simulate pause
    });
  }
  else {
    store.dispatch.mockReturnValue(Promise.resolve(store));
  }

  return store;
}

function createUpdateStoresFunc(initialStores, returnValues = []) {
  return jest.fn().mockImplementation((updateFunc) => {
    const updatedStores = updateFunc(initialStores);

    returnValues.push(updatedStores);

    return updatedStores;
  });
}

describe('DispatchHandler', () => {
  describe('dispatch(...)', () => {
    pit('calls dispatch on each store, with the given action and middleware', () => {
      // Test Data
      const dispatchedAction = { type: 'TEST_ACTION' };
      const passedInMiddleware = Immutable.List([
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ]);
      const initialStores = Immutable.Map({
        store0: createStore(),
        store1: createStore(),
        store2: createStore(),
      });
      const updateStoresFunc = createUpdateStoresFunc(initialStores);
      const dispatchHandler = DispatchHandler.createDispatchHandler(passedInMiddleware, updateStoresFunc);

      // Perform Test
      return dispatchHandler.dispatch(dispatchedAction).then(() => {
        initialStores.forEach((store) => {
          const { calls } = store.dispatch.mock;
          expect(calls.length).toEqual(1);

          const [action, middleware] = calls[0];
          expect(action).toBe(dispatchedAction);
          passedInMiddleware.forEach((currMiddleware) => {
            expect(middleware.includes(currMiddleware)).toBeTrue();
          });
        })
      });
    });

    pit('calls the updateFunc to be able to perform updates on the stores', () => {
      // Test Data
      const updateStoresFunc = createUpdateStoresFunc(Immutable.Map({
        store0: createStore(),
        store1: createStore(),
        store2: createStore(),
      }));
      const dispatchHandler = DispatchHandler.createDispatchHandler(Immutable.List(), updateStoresFunc)

      // Perform Test
      return dispatchHandler.dispatch({}).then(() => {
        expect(updateFunc).toBeCalled();
      });
    });

    pit('returns each Store after its dispatch(...) method has been called', () => {
      // Test Data
      const finalStores = Immutable.Map({
        store0: createStore(),
        store1: createStore(),
        store2: createStore(),
      });
      const initialStores = finalStores.map((finalStore) => {
        let initialStore = createStore();
        initialStore.dispatch.mockReturnValue(Promise.resolve(finalStore));

        return initialStore;
      });
      const updateStoresFunc = createUpdateStoresFunc(initialStores);
      const dispatchHandler = DispatchHandler.createDispatchHandler(Immutable.List(), updateStoresFunc)

      // Perform Test
      return dispatchHandler.dispatch({}).then((stores) => {
        stores.forEach((store) => {
          expect(finalStores.includes(store)).toBeTrue();
        });
      });
    });

    pit('adds pause plugin to the middleware', () => {
      // Test Data
      const passedInMiddleware = Immutable.List([
        jest.fn(),
        jest.fn(),
        jest.fn(),
      ]);
      const initialStores = Immutable.Map({
        store0: createStore(),
        store1: createStore(),
        store2: createStore(),
      });
      const updateStoresFunc = createUpdateStoresFunc(initialStores);
      const dispatchHandler = DispatchHandler.createDispatchHandler(passedInMiddleware, updateStoresFunc);

      // Perform Test
      return dispatchHandler.dispatch({}).then(() => {
        initialStores.forEach((store) => {
          const { calls } = store.dispatch.mock;
          expect(calls.length).toEqual(1);

          const [_, middleware] = calls[0];
          expect(middleware.includes(pause)).toBeTrue();
        })
      });
    });

    pit('will return the initial store from updaterFunc for each Store that\'s dispatch method called pause', () => {
      // Test Data
      const finalStores = Immutable.Map({
        store0: createStore(),
        store1: createStore(),
        store2: createStore(),
      });
      let initialStores = finalStores.map((finalStore) => {
        let initialStore = createStore();
        initialStore.dispatch.mockReturnValue(Promise.resolve(finalStore));

        return initialStore;
      });
      const pauseStore0 = createStore(true);
      const pauseStore1 = createStore(true);
      initialStores = initialStores.set('pauseStore0', pauseStore0);
      initialStores = initialStores.set('pauseStore1', pauseStore1);
      const updatedStores = [];
      const updateStoresFunc = createUpdateStoresFunc(initialStores, updatedStores);
      const dispatchHandler = DispatchHandler.createDispatchHandler([], updateStoresFunc);

      // Perform Test
      return dispatchHandler.dispatch({}).then(() => {
        expect(updatedStores.length).toBe(1);

        const [ currUpdatedStores ] = updatedStores;
        updatedStores[0].forEach((store, storeName) => {
          if(storeName === 'pauseStore0' || storeName === 'pauseStore1') {
            expect(initialStores.includes(store)).toBeTrue();
          }
          else {
            expect(finalStores.includes(store)).toBeTrue();
          }
        });
      });
    });

    pit('will call the updateFunc a second time after each of the pause promise finished', () => {
      // Test Data
      const finalStores = Immutable.Map({
        store0: createStore(),
        store1: createStore(),
        store2: createStore(),
        pauseStore0: createStore(),
        pauseStore1: createStore(),
      });
      let initialStores = finalStores.map((finalStore, storeName) => {
        let storeToDispatch = null;
        if(storeName === 'pauseStore0' || storeName === 'pauseStore1') {
          storeToDispatch = createStore(new Promise((resolve) => {
            setTimeout(() => {
              resolve(finalStore);
            }, 500);
          }));
        }
        else {
          storeToDispatch = finalStore;
        }

        let initialStores = createStore();
        initialStore.dispatch.mockReturnValue(Promise.resolve(storeToDispatch));
        return initialStore;
      });
      const pauseStore0 = createStore(true);
      const pauseStore1 = createStore(true);
      initialStores = initialStores.set('pauseStore0', pauseStore0);
      initialStores = initialStores.set('pauseStore1', pauseStore1);
      const updatedStores = [];
      const updateStoresFunc = createUpdateStoresFunc(initialStores, updatedStores);
      const dispatchHandler = DispatchHandler.createDispatchHandler(passedInMiddleware, updateStoresFunc);

      // Perform Test
      return dispatchHandler.dispatch({}).then(() => {
        jest.runAllTimers();

        expect(updatedStores.length).toBe(2);

        const [ currUpdatedStores ] = updatedStores;
        updatedStores[1].forEach((store) => {
          expect(finalStores.includes(store)).toBeTrue();
        });
      });
    });
  });
});