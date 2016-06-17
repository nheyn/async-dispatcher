jest.unmock('../src/Store');

import Immutable from 'immutable';
import Store, { createStore } from '../src/Store';

function createUpdater(finalState) {
  return jest.fn().mockImplementation((initialState) => finalState? finalState: initialState);
}

describe('Store', () => {
  describe('register(...)', () => {
    pit('will return a new store, with the given function registered as an updater', () => {
      // Test Data
      const updaters = [ createUpdater(), createUpdater(), createUpdater() ];
      let store = createStore({});

      // Perform Tests
      store = store.register(updaters[0]);
      store = store.register(updaters[1]);
      store = store.register(updaters[2]);

      return store.dispatch({}).then(() => {
        // Check the registered updaters where called
        updaters.forEach((updater) => {
          const { calls } = updater.mock;
          expect(calls.length).toBe(1);
        });
      });
    });

    it('throws an error if given value is not a function', () => {
      // Test Data
      const updaters = [
        'not a function',
        1,
        null,
        undefined,
        true,
        {}
      ];
      const store = createStore();

      // Preform Tests
      updaters.forEach((updater) => {
        const performRegister = () => {
          store.register(updater);
        };

        expect(performRegister).toThrow();
      });
    });
  });

  describe('dispatch(...)', () => {
    pit('will call each updater, with the given action', () => {
      // Test Data
      const action = { type: 'TEST_ACTION' };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      let store = createStore({});
      for(let i=0; i<updaters.length; i++) {
        store = store.register(updaters[i]);
      }

      // Perform Tests
      return store.dispatch(action).then(() => {
        updaters.forEach((updater) => {
          const { calls } = updater.mock;
          expect(calls.length).toBe(1);

          const [_, dispatchedAction] = calls[0];
          expect(dispatchedAction).toBe(action);
        });
      });
    });

    pit('will call the first updaters, with given the state', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      let store = createStore(initialState);
      for(let i=0; i<updaters.length; i++) {
        store = store.register(updaters[i]);
      }

      // Perform Tests
      return store.dispatch({ }).then(() => {
        const { calls } = updaters[0].mock;
        expect(calls.length).toBe(1);

        const [dispatchedState] = calls[0];
        expect(dispatchedState).toBe(initialState);
      });
    });

    pit('will call all but the first updaters, with the value returned from the previous updater', () => {
      // Test Data
      const updatedStates = [
        null,
        { data: 'updated state 1' },
        { data: 'updated state 2' }
      ];
      const updaters = [
        createUpdater(updatedStates[1]),
        createUpdater(Promise.resolve(updatedStates[2])),
        createUpdater()
      ];
      let store = createStore({});
      for(let i=0; i<updaters.length; i++) {
        store = store.register(updaters[i]);
      }

      // Perform Tests
      return store.dispatch({ }).then(() => {
        for(let i=1; i<updaters.length; i++) {
          const { calls } = updaters[i].mock;
          expect(calls.length).toBe(1);

          const [dispatchedState] = calls[0];
          expect(dispatchedState).toBe(updatedStates[i]);
        }
      });
    });

    pit('will return a promise with the state from the final updater', () => {
      // Test Data
      const finalState = { data: 'test state' };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater(finalState)
      ];
      let store = createStore({});
      for(let i=0; i<updaters.length; i++) {
        store = store.register(updaters[i]);
      }

      // Perform Tests
      return store.dispatch({ }).then((newStore) => {
        expect(newStore.getState()).toEqual(finalState);
      });
    });

    pit('will return a reject promise if an updater throws an error', () => {
      // Test Data
      const testError = new Error();
      const updaters = [
        createUpdater(),
        jest.fn(() => { throw testError; }),
        createUpdater()
      ];
      let store = createStore({});
      for(let i=0; i<updaters.length; i++) {
        store = store.register(updaters[i]);
      }

      // Perform Tests
      return store.dispatch({ }).then(() => {
        expect('this not').toBe('called');
      }).catch((err) => {
        expect(err).toBe(err);

        expect(updaters[0]).toBeCalled();
        expect(updaters[1]).toBeCalled();
        expect(updaters[2]).not.toBeCalled();
      });
    });

    it('throw an error if the action is not a basic javascript object', () => {
      // Test Data
      const actions = [
        'not an object',
        1,
        null,
        undefined,
        true,
        function() { },
        //{ error: function() {} }          //TODO, add deep checks
      ];

      const store = createStore();

      // Preform Tests
      actions.forEach((action) => {
        const performDispatch = () => {
          store.dispatch(action);
        };

        expect(performDispatch).toThrow();
      });
    });
  });

  describe('getState()', () => {
    it('will get the initial state, if dispatch was not called', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const store = createStore(initialState)

      // Perform Tests
      expect(store.getState()).toBe(initialState);
    });

    pit('will get the updated state, if returned from the dispatch(...) method', () => {
      // Test Data
      const updatedState = { data: 'test state' };
      const store = createStore({}).register(createUpdater(updatedState));

      // Perform Tests
      return store.dispatch({}).then((newStore) => {
        expect(newStore.getState()).toBe(updatedState);
      });
    });
  });
});
