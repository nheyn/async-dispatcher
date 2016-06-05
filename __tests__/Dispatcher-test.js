jest.unmock('../src/Dispatcher');

import Store from '../src/Store';
import { createDispatcher } from '../src/Dispatcher';

function createStore(initialState) {
  const store = new Store(initialState);

  store.dispatch.mockReturnValue(Promise.resolve(store));   // NOTE: not immutable, to make testing easier
  store.getState.mockReturnValue(initialState);

  return store;
}

describe('Dispatcher', () => {
  describe('dispatch(...)', () => {
    pit('calls dispatch in each store, every time it is called', () => {
      // Test Data
      const stores = {
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      ];
      const dispatcher = createDispatcher(stores);
      const dispatchCount = 3;

      // Perform Test
      let dispatchPromise = null;
      for(let i=0; i<dispatchCount; i++) {
        dispatchPromise = dispatcher.dispatch({});
      }

      return dispatchPromise.then(() => {
        for(let storeName in stores) {
          const { calls } = stores[storeName].mock;

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
      const dispatcher = createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch(action).then(() => {
        for(let storeName in stores) {
          const { calls } = stores[storeName].mock;

          expect(calls.length).toBe(1);
          expect(calls[0][0]).toBe(action);
        }
      });
    });

    pit('returns a Promise with updated states for all the stores', () => {
      // Test Data
      const states = {
        storeA: { data: 'a' },
        storeB: { data: 'b' },
        storeC: { data: 'c' }
      };
      const dispatcher = createDispatcher({
        storeA: createStore(states.storeA),
        storeB: createStore(states.storeB),
        storeC: createStore(states.storeC)
      });

      // Perform Test
      return dispatcher.dispatch(action).then((newStates) => {
        expect(Object.keys(newStates)).Equal(Object.keys(sates));

        for(let storeName in newStates) {
          expect(newStates).toEqual(states[storeName]);
        }
      });
    });

    it('throws an error if the action is not a basic javascript object', () => {
      // Test Data
      const dispatcher = createDispatcher({});
      const actions = [
        'not an object',
        1,
        null,
        undefined,
        true,
        function() { },
        { error: function() {} }
      ];

      // Preform Tests
      actions.forEach((action) => {
        const performDispatch = () => {
          dispatcher.dispatch(action);
        };

        expect(performDispatch).toThrow();
      });
    });

    pit('will return a rejected promise if a store has an error', () => {
      // Test Data
      const initialStates = {
        storeA: { data: 'a' },
        storeB: { data: 'b' },
        storeC: { data: 'c' }
      };
      const dispatcher = createDispatcher({
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      });
      const testError = new Error();
      stores.storeB.dispatch = jest.fn(() => throw testError);

      // Perform Test
      return dispatcher.then(() => {
        expect('not').toBe('called');
      }).catch((err) => {
        expect(err).toBe(testError);
      });
    });

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
      stores.storeA.dispatch.mockReturnValue(createStore(updatedStates.storeA));
      stores.storeB.dispatch = jest.fn(() => throw new Error());
      stores.storeC.dispatch.mockReturnValue(createStore(updatedStates.storeC));

      const dispatcher = createDispatcher(stores);

      // Perform Test
      return dispatcher.catch(() => {
        for(let storeName in stores) {
          const initialState = initialStates[storeName];
          const currState = dispatcher.getStateFor(storeName);

          expect(currState).toEqual(initialState);
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
      const dispatcher = createDispatcher({
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      });

      // Perform Test
      expect(dispatcher.getStateFor('storeA')).toEqual(initialStates.storeA);
      expect(dispatcher.getStateFor('storeB')).toEqual(initialStates.storeB);
      expect(dispatcher.getStateFor('storeC')).toEqual(initialStates.storeC);
    });

    it('returns the updated states for each individual stores, after a dispatch has finished', () => {
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
      stores.storeA.dispatch.mockReturnValue(createStore(updatedStates.storeA));
      stores.storeB.dispatch.mockReturnValue(createStore(updatedStates.storeB));
      stores.storeC.dispatch.mockReturnValue(createStore(updatedStates.storeC));

      const dispatcher = createDispatcher(stores);

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        expect(dispatcher.getStateFor('storeA')).toEqual(updatedStates.storeA);
        expect(dispatcher.getStateFor('storeB')).toEqual(updatedStates.storeB);
        expect(dispatcher.getStateFor('storeC')).toEqual(updatedStates.storeC);
      });
    });

    pit('returns the initial states for each individual stores, during a dispatch', () => {
      // Test Data
      const initialState = {
        storeA: { data: 'a', state: 'initial' },
        storeB: { data: 'b', state: 'initial' },
        storeC: { data: 'c', state: 'initial' }
      };
      const updatedStates = {
        storeA: { data: 'a', state: 'wrong' },
        storeB: { data: 'b', state: 'wrong' },
        storeC: { data: 'c', state: 'wrong' }
      };
      let storeB = createStore(initialState.storeB);
      storeB.dispatch = jest.fn(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(updatedStates.storeB)
          }, 200));
      });
      let stores = {
        storeA: createStore(initialStates.storeA),
        storeB,
        storeC: createStore(initialStates.storeC)
      };
      stores.storeA.dispatch.mockReturnValue(createStore(updatedStates.storeA));
      stores.storeC.dispatch.mockReturnValue(createStore(updatedStates.storeC));
      const dispatcher = createDispatcher(stores);

      // Perform Test
      const dispatchPromise = dispatcher.dispatch({});

      expect(dispatcher.getStateFor('storeA')).toEqual(initialStates.storeA);
      expect(dispatcher.getStateFor('storeB')).toEqual(initialStates.storeB);
      expect(dispatcher.getStateFor('storeC')).toEqual(initialStates.storeC);
      setTimeout(() => {
        expect(dispatcher.getStateFor('storeA')).toEqual(initialStates.storeA);
        expect(dispatcher.getStateFor('storeB')).toEqual(initialStates.storeB);
        expect(dispatcher.getStateFor('storeC')).toEqual(initialStates.storeC);
      }, 100));

      jest.runAllTimers();
      return dispatchPromise;
    });

    it('throws an error if a non existent store name is given', () => {
      // Test Data
      const dispatcher = createDispatcher({ validStoreName: createStore({}) });

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
      const dispatcher = createDispatcher({ validStoreName: createStore({}) });

      // Perform Test
      storeNames.forEach((storeName) => {
        const tryInvalidStore = () => dispatcher.getStateFor(storeName);
        expect(tryInvalidStore).toThrow();
      });
    });
  });

  describe('subscribeToAll(...)', () => {
    pit('call the given functions every time a store is updated', () => {
      // Test Data
      const totalDispatchCalls = 3;
      const subscribers = [
        jest.fn(),
        jest.fn(),
        jest.fn()
      ];
      const dispatcher = createDispatcher({
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      });
      let count = 0;  // NOTE, updating state, otherwise subscribers will not be called
      stores.storeA.getState.mockReturnValue({ count });
      stores.storeB.getState.mockReturnValue({ count });
      stores.storeC.getState.mockReturnValue({ count });
      subscribers.forEach((subscriber) => {
        dispatcher.subscribeToAll(subscriber);
      });

      // Performs Test
      let dispatchPromise = null;
      for(let i=0; i<totalDispatchCalls; i++) {
        dispatchPromise = dispatcher.dispatch({});
      }

      return dispatchPromise.then(() => {
        subscribers.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(totalDispatchCalls);
        });
      });
    });

    it('call the given functions with the updated states', () => {
      // Test Data
      const subscribers = [
        jest.fn(),
        jest.fn(),
        jest.fn()
      ];
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
      stores.storeA.dispatch.mockReturnValue(createStore(updatedStates.storeA));
      stores.storeB.dispatch.mockReturnValue(createStore(updatedStates.storeB));
      stores.storeC.dispatch.mockReturnValue(createStore(updatedStates.storeC));
      let dispatcher = createDispatcher(stores);
      subscribers.forEach((subscriber) => {
        dispatcher.subscribeToAll(subscriber);
      });

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        subscribers.forEach((subscriber) => {
          const { calls } = subscribers.mock;

          expect(calls.length).toBe(1);
          expect(calls[0][1]).toEqual(updatedStates);
        });
      });
    });

    pit('does not call the the given function after a dispatch, if no stores state changes', () => {
      // Test Data
      const subscribers = [
        jest.fn(),
        jest.fn(),
        jest.fn()
      ];
      const initialStates = {
        storeA: { data: 'a' },
        storeB: { data: 'b' },
        storeC: { data: 'c' }
      };
      const dispatcher = createDispatcher({
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      });
      subscribers.forEach((subscriber) => {
        dispatcher.subscribeToAll(subscriber);
      });

      // Perform Test
      return dispatcher.dispatch({}).then(() => {
        subscribers.forEach((subscriber) => {
          const { calls } = subscribers.mock;

          expect(calls.length).toBe(0);
        });
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
      const dispatcher = createDispatcher({});

      // Performs Test
      updaters.forEach((updater) => {
        const performSubscribe = () => dispatcher.subscribeToAll(updater);

        expect(performSubscribe).toThrow();
      });
    });
  });

  describe('subscribeTo(...)', () => {
    it('call the given functions every time the given store is updated', () => {
      // Test Data
      const totalDispatchCalls = 3;
      const subscribers = {
        storeA: [ jest.fn(), jest.fn(), jest.fn() ],
        storeB: [ jest.fn(), jest.fn(), jest.fn() ],
        storeC: [ jest.fn(), jest.fn(), jest.fn() ]
      };
      const dispatcher = createDispatcher({
        storeA: createStore({}),
        storeB: createStore({}),
        storeC: createStore({})
      });
      let count = 0;  // NOTE, updating state, otherwise subscribers will not be called
      stores.storeA.getState.mockReturnValue({ count });
      stores.storeB.getState.mockReturnValue({ count });
      stores.storeC.getState.mockReturnValue({ count });
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
      let dispatchPromise = null;
      for(let i=0; i<totalDispatchCalls; i++) {
        dispatchPromise = dispatcher.dispatch({});
      }

      return dispatchPromise.then(() => {
        subscribers.storeA.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(totalDispatchCalls);
        });
        subscribers.storeB.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(totalDispatchCalls);
        });
        subscribers.storeC.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(totalDispatchCalls);
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
      stores.storeA.dispatch.mockReturnValue(createStore(updatedStates.storeA));
      stores.storeB.dispatch.mockReturnValue(createStore(updatedStates.storeB));
      stores.storeC.dispatch.mockReturnValue(createStore(updatedStates.storeC));

      let dispatcher = createDispatcher(stores);
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
          expect(calls[0][1]).toEqual(updatedStates);
        });

        subscribers.storeB.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(1);
          expect(calls[0][1]).toEqual(updatedStates);
        });

        subscribers.storeC.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(1);
          expect(calls[0][1]).toEqual(updatedStates);
        });
      });
    });

    it('does not call the the given function after a dispatch, if the given stores state did not change', () => {
      // Test Data
      const subscribers = {
        storeA: [ jest.fn(), jest.fn(), jest.fn() ],
        storeB: [ jest.fn(), jest.fn(), jest.fn() ],
        storeC: [ jest.fn(), jest.fn(), jest.fn() ]
      };
      const stores = {
        storeA: createStore(initialStates.storeA),
        storeB: createStore(initialStates.storeB),
        storeC: createStore(initialStates.storeC)
      };
      let dispatcher = createDispatcher(stores);
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

          expect(calls.length).toBe(0);
        });

        subscribers.storeB.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(0);
        });

        subscribers.storeC.forEach((subscriber) => {
          const { calls } = subscriber.mock;

          expect(calls.length).toBe(0);
        });
      });
    });

    it('throws an error if a non existent store name is given', () => {
      // Test Data
      const dispatcher = createDispatcher({ validStoreName: createStore({}) });

      // Perform Test
      const tryInvalidStore = () => dispatcher.subscribeTo('invalidStore'. () => null);
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
      const dispatcher = createDispatcher({ validStoreName: createStore({}) });

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
      const dispatcher = createDispatcher({ testStore: createStore({}) });

      // Performs Test
      updaters.forEach((updater) => {
        const performSubscribe = () => dispatcher.subscribeTo('testStore', updater);

        expect(performSubscribe).toThrow();
      });
    });
  });
});
