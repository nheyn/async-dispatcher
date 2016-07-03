jest.unmock('../src/Dispatcher');

import Immutable from 'immutable';
import Store from '../src/Store';
import {
  createGetStoreNameMiddleware,
  createGetCurrentStateMiddleware,
  createPauseMiddleware,
  createDispatchMiddleware
} from '../src/middleware';
import Dispatcher from '../src/Dispatcher';

// Set up mocks
function createStore(initialState, isMutable) {
  const store = new Store(initialState);

  store.dispatch.mockImplementation(() => Promise.resolve(!isMutable? store: createStore(initialState, isMutable)));
  store.getState.mockReturnValue(initialState);

  return store;
}

const getStoreName = jest.fn().mockImplementation((s, a, p, next) => next(s, a, p));
const getCurrentState = jest.fn().mockImplementation((s, a, p, next) => next(s, a, p));
const pause = jest.fn().mockImplementation((s, a, p, next) => next(s, a, p));
const dispatch = jest.fn().mockImplementation((s, a, p, next) => next(s, a, p));

createGetStoreNameMiddleware.mockReturnValue(getStoreName);
createGetCurrentStateMiddleware.mockReturnValue(getCurrentState);
createPauseMiddleware.mockReturnValue(pause);
createDispatchMiddleware.mockReturnValue(dispatch);

describe('Dispatcher', () => {
  describe('dispatch(...)', () => {
    pit('calls dispatch in each store, every time it is called', () => {
      // Test Data
      const stores = {
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      };
      const dispatcher = Dispatcher.createDispatcher(stores);
      const dispatchCount = 3;

      // Perform Test
      let dispatchPromise = Promise.resolve(dispatcher);
      for(let i=0; i<dispatchCount; i++) {
        // Call dispatch after last dispatch is finished
        dispatchPromise = dispatchPromise.then((dispatcher) => {
          return dispatcher.dispatch({})
        });
      }

      return dispatchPromise.then(() => {
        for(let storeName in stores) {
          const { calls } = stores[storeName].dispatch.mock;

          expect(calls.length).toBe(dispatchCount);
        }
      });
    });

    pit('calls dispatch, with same action, in each store', () => {
      // Test Data
      const action = { type: 'TEST_ACTION' };
      const stores = {
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      };
      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch(action).then(() => {
        for(let storeName in stores) {
          const { calls } = stores[storeName].dispatch.mock;

          expect(calls.length).toBe(1);
          expect(calls[0][0]).toBe(action);
        }
      });
    });

    pit('returns a Promise with the Dispatcher', () => {
      // Test Data
      const dispatcher = Dispatcher.createDispatcher({ });

      // Perform Test
      return dispatcher.dispatch({}).then((returnedDispatcher) => {
        expect(returnedDispatcher).toBe(dispatcher);
      });
    });

    pit('will return a rejected promise if a store has an error', () => {
      // Test Data
      const initialStates = {
        storeA: { data: 'a' },
        storeB: { data: 'b' },
        storeC: { data: 'c' }
      };
      const stores = {
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      };
      const dispatcher = Dispatcher.createDispatcher(stores);
      const testError = new Error();
      stores.storeB.dispatch = jest.fn().mockImplementation(() => Promise.reject(testError));

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        expect('not').toBe('called');
      }).catch((err) => {
        expect(err).toBe(testError);
      });
    });

    // INTERNAL ERROR
    pit('does not update(replace) any of the stores if a store has an error', () => {
      // Test Data
      const initialStates = {
        storeA: { data: 'a', state: 'initial' },
        storeB: { data: 'b', state: 'initial' },
        storeC: { data: 'c', state: 'initial' }
      };
      const updatedStates = {
        storeA: { data: 'a', state: 'wrong' },
        storeB: { data: 'b', state: 'wrong' },
        storeC: { data: 'c', state: 'wrong' }
      };
      let stores = {
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      };
      stores.storeA.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeA)));
      stores.storeB.dispatch.mockReturnValue(Promise.reject(new Error()));
      stores.storeC.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeC)));

      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).catch(() => {
        for(let storeName in stores) {
          const initialState = initialStates[storeName];
          const currState = dispatcher.getStateFor(storeName);

          expect(currState).toEqual(initialState);
        }
      });
    });

    pit('will queue each action passed in, if another action is currently being dispatched', () => {
      // Test Data
      const actions = [
        { type: 'TEST_ACTION', index: 0 },
        { type: 'TEST_ACTION', index: 1 },
        { type: 'TEST_ACTION', index: 2 }
      ];
      let store = createStore({});
      store.dispatch.mockReturnValue(new Promise((resolve) => {
        setTimeout(() => {
          resolve(store);
        }, 100);
      }));
      const dispatcher = Dispatcher.createDispatcher({ store });

      // Perform Test
      let dispatchPromise = null;
      actions.forEach((action) => {
        dispatchPromise = dispatcher.dispatch(action);
      });

      jest.runAllTimers();
      return dispatchPromise.then(() => {
        const { calls } = store.dispatch.mock;
        expect(calls.length).toEqual(actions.length);

        calls.forEach(([ currAction ], index) => {
          expect(currAction).toEqual(actions[index]);
        });
      });
    });

    pit('will use middleware that adds plugin getStoreName', () => {
      createGetStoreNameMiddleware.mockClear();

      // Test Data
      const stores = {
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      };
      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        expect(createGetStoreNameMiddleware).toBeCalled();

        for(let storeName in stores) {
          const { calls } = stores[storeName].dispatch.mock;
          expect(calls.length).toEqual(1);

          const [ _, middleware ] = calls[0];
          expect(middleware).toContain(getStoreName);
        }
      });
    });

    pit('will use middleware that adds plugin getCurrentState', () => {
      createGetCurrentStateMiddleware.mockClear();

      // Test Data
      const initialStates = {
        storeA: { data: 'a', state: 'initial' },
        storeB: { data: 'b', state: 'initial' },
        storeC: { data: 'c', state: 'initial' }
      };
      const stores = {
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      };
      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        expect(createGetCurrentStateMiddleware).toBeCalled();

        for(let storeName in stores) {
          const { calls } = stores[storeName].dispatch.mock;
          expect(calls.length).toEqual(1);

          const [ _, middleware ] = calls[0];
          expect(middleware).toContain(getCurrentState);
        }
      });
    });

    pit('will use middleware that adds plugin pause', () => {
      createPauseMiddleware.mockClear();

      // Test Data
      const stores = {
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      };
      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        expect(createDispatchMiddleware).toBeCalled();

        for(let storeName in stores) {
          const { calls } = stores[storeName].dispatch.mock;
          expect(calls.length).toEqual(1);

          const [ _, middleware ] = calls[0];
          expect(middleware).toContain(pause);
        }
      });
    });

    pit('will use middleware that adds plugin dispatch', () => {
      // Test Data
      const stores = {
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      };
      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        for(let storeName in stores) {
          const { calls } = stores[storeName].dispatch.mock;
          expect(calls.length).toEqual(1);

          const [ _, middleware ] = calls[0];
          expect(middleware).toContain(dispatch);
        }
      });
    });
  });

  describe('getStateFor(...)', () => {
    it('returns the initial states for each individual stores', () => {
      // Test Data
      const initialStates = {
        storeA: { data: 'a' },
        storeB: { data: 'b' },
        storeC: { data: 'c' }
      };
      const dispatcher = Dispatcher.createDispatcher({
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      });

      // Perform Test
      expect(dispatcher.getStateFor('storeA')).toEqual(initialStates.storeA);
      expect(dispatcher.getStateFor('storeB')).toEqual(initialStates.storeB);
      expect(dispatcher.getStateFor('storeC')).toEqual(initialStates.storeC);
    });

    pit('returns the updated states for each individual stores, after a dispatch has finished', () => {
      // Test Data
      const initialStates = {
        storeA: { data: 'a', state: 'initial' },
        storeB: { data: 'b', state: 'initial' },
        storeC: { data: 'c', state: 'initial' }
      };
      const updatedStates = {
        storeA: { data: 'a', state: 'updated' },
        storeB: { data: 'b', state: 'updated' },
        storeC: { data: 'c', state: 'updated' }
      };
      let stores = {
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      };
      stores.storeA.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeA)));
      stores.storeB.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeB)));
      stores.storeC.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeC)));

      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        expect(dispatcher.getStateFor('storeA')).toEqual(updatedStates.storeA);
        expect(dispatcher.getStateFor('storeB')).toEqual(updatedStates.storeB);
        expect(dispatcher.getStateFor('storeC')).toEqual(updatedStates.storeC);
      });
    });

    pit('returns the initial states for each individual stores, during a dispatch', () => {
      // Test Data
      const initialStates = {
        storeA: { data: 'a', state: 'initial' },
        storeB: { data: 'b', state: 'initial' },
        storeC: { data: 'c', state: 'initial' }
      };
      const updatedStates = {
        storeA: { data: 'a', state: 'wrong' },
        storeB: { data: 'b', state: 'wrong' },
        storeC: { data: 'c', state: 'wrong' }
      };
      let storeB = createStore(initialStates.storeB);
      storeB.dispatch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(createStore(updatedStates.storeB));
          }, 200);
        });
      });
      let stores = {
        storeA: createStore(initialStates.storeA),
        storeB,
        storeC: createStore(initialStates.storeC)
      };
      stores.storeA.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeA)));
      stores.storeC.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeC)));
      const dispatcher = Dispatcher.createDispatcher(stores);

      // Perform Test
      const dispatchPromise = dispatcher.dispatch({});

      expect(dispatcher.getStateFor('storeA')).toEqual(initialStates.storeA);
      expect(dispatcher.getStateFor('storeB')).toEqual(initialStates.storeB);
      expect(dispatcher.getStateFor('storeC')).toEqual(initialStates.storeC);
      setTimeout(() => {
        expect(dispatcher.getStateFor('storeA')).toEqual(initialStates.storeA);
        expect(dispatcher.getStateFor('storeB')).toEqual(initialStates.storeB);
        expect(dispatcher.getStateFor('storeC')).toEqual(initialStates.storeC);
      }, 100);

      jest.runAllTimers();
      return dispatchPromise;
    });

    it('throws an error if a non existent store name is given', () => {
      // Test Data
      const dispatcher = Dispatcher.createDispatcher({ validStoreName: createStore({}) });

      // Perform Test
      const tryInvalidStore = () => dispatcher.getStateFor('invalidStore');
      expect(tryInvalidStore).toThrow();
    });

    it('throws an error if a non string is given as the store name', () => {
      // Test Data
      const storeNames = [
        undefined,
        null,
        1,
        true,
        {},
        function() { }
      ];
      const dispatcher = Dispatcher.createDispatcher({ validStoreName: createStore({}) });

      // Perform Test
      storeNames.forEach((storeName) => {
        const tryInvalidStore = () => dispatcher.getStateFor(storeName);
        expect(tryInvalidStore).toThrow();
      });
    });
  });

  describe('subscribeTo(...)', () => {
    pit('call the given functions every time the given store is updated', () => {
      // Test Data
      const dispatchCount = 3;
      const subscribers = {
        storeA: [ jest.fn(), jest.fn(), jest.fn() ],
        storeB: [ jest.fn(), jest.fn(), jest.fn() ],
        storeC: [ jest.fn(), jest.fn(), jest.fn() ]
      };
      let storeC = createStore({});
      storeC.dispatch
        .mockReturnValueOnce(storeC)
        .mockReturnValueOnce(storeC)
        .mockReturnValueOnce(Promise.resolve(createStore({})));
      let dispatcher = Dispatcher.createDispatcher({
        storeA: createStore({}),
        storeB: createStore({}, true),
        storeC
      });
      subscribers.storeA.forEach((subscriber) => {
        dispatcher.subscribeTo('storeA', subscriber);
      });
      subscribers.storeB.forEach((subscriber) => {
        dispatcher.subscribeTo('storeB', subscriber);
      });
      subscribers.storeC.forEach((subscriber) => {
        dispatcher.subscribeTo('storeC', subscriber);
      });

      // Performs Test
      let dispatchPromise = Promise.resolve(dispatcher);
      for(let i=0; i<dispatchCount; i++) {
        // Call dispatch after last dispatch is finished
        dispatchPromise = dispatchPromise.then((dispatcher) => {
          return dispatcher.dispatch({})
        });
      }

      return dispatchPromise.then(() => {
        subscribers.storeA.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(0);
        });
        subscribers.storeB.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(dispatchCount);
        });
        subscribers.storeC.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(1);
        });
      });
    });

    it('call the given functions with the updated state', () => {
      // Test Data
      const subscribers = {
        storeA: [ jest.fn(), jest.fn(), jest.fn() ],
        storeB: [ jest.fn(), jest.fn(), jest.fn() ],
        storeC: [ jest.fn(), jest.fn(), jest.fn() ]
      };
      const initialStates = {
        storeA: { data: 'a', state: 'initial' },
        storeB: { data: 'b', state: 'initial' },
        storeC: { data: 'c', state: 'initial' }
      };
      const updatedStates = {
        storeA: { data: 'a', state: 'updated' },
        storeB: { data: 'b', state: 'updated' },
        storeC: { data: 'c', state: 'updated' }
      };
      let stores = {
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      };
      stores.storeA.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeA)));
      stores.storeB.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeB)));
      stores.storeC.dispatch.mockReturnValue(Promise.resolve(createStore(updatedStates.storeC)));

      let dispatcher = Dispatcher.createDispatcher(stores);
      subscribers.storeA.forEach((subscriber) => {
        dispatcher.subscribeTo('storeA', subscriber);
      });
      subscribers.storeB.forEach((subscriber) => {
        dispatcher.subscribeTo('storeB', subscriber);
      });
      subscribers.storeC.forEach((subscriber) => {
        dispatcher.subscribeTo('storeC', subscriber);
      });

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        subscribers.storeA.forEach((subscriber) => {
          const { calls } = subscriber.mock;
          expect(calls.length).toBe(1);

          const [ currUpdatedState ] = calls[0];
          expect(currUpdatedState).toEqual(updatedStates.storeA);
        });

        subscribers.storeB.forEach((subscriber) => {
          const { calls } = subscriber.mock;
          expect(calls.length).toBe(1);

          const [ currUpdatedState ] = calls[0];
          expect(currUpdatedState).toEqual(updatedStates.storeB);
        });

        subscribers.storeC.forEach((subscriber) => {
          const { calls } = subscriber.mock;
          expect(calls.length).toBe(1);

          const [ currUpdatedState ] = calls[0];
          expect(currUpdatedState).toEqual(updatedStates.storeC);
        });
      });
    });

    it('throws an error if a non existent store name is given', () => {
      // Test Data
      const dispatcher = Dispatcher.createDispatcher({ validStoreName: createStore({}) });

      // Perform Test
      const tryInvalidStore = () => dispatcher.subscribeTo('invalidStore', () => null);
      expect(tryInvalidStore).toThrow();
    });

    it('throws an error if a non string is given as the store name', () => {
       // Test Data
      const storeNames = [
        undefined,
        null,
        1,
        true,
        {},
        function() { }
      ];
      const dispatcher = Dispatcher.createDispatcher({ validStoreName: createStore({}) });

      // Perform Test
      storeNames.forEach((storeName) => {
        const tryInvalidStore = () => dispatcher.subscribeTo(storeName, () => null);
        expect(tryInvalidStore).toThrow();
      });
    });

    it('throws an error if a non function is given as the subscriber', () => {
      // Test Data
      const updaters = [
        'not a function',
        1,
        null,
        undefined,
        true,
        {}
      ];
      const dispatcher = Dispatcher.createDispatcher({ testStore: createStore({}) });

      // Performs Test
      updaters.forEach((updater) => {
        const performSubscribe = () => dispatcher.subscribeTo('testStore', updater);

        expect(performSubscribe).toThrow();
      });
    });
  });
});
