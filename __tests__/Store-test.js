jest.unmock('../src/Store');

import Immutable from 'immutable';
import Store from '../src/Store';

function createUpdater(finalState) {
  return jest.fn().mockImplementation((initialState) => finalState? finalState: initialState);
}

function createMiddlware(impl) {
  return jest.fn().mockImplementation(impl? impl: (state, action, next) => next(state, action));
}

describe('Store', () => {
  describe('dispatch(...)', () => {
    pit('will call each updater, with the given action', () => {
      // Test Data
      const action = { type: 'TEST_ACTION' };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters
      });

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
      const store = Store.createStore({
        initialState,
        updaters
      });

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
      const store = Store.createStore({
        initialState: {},
        updaters
      });

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
      const store = Store.createStore({
        initialState: {},
        updaters: [
          createUpdater(),
          createUpdater(),
          createUpdater(finalState)
        ]
      });

      // Perform Tests
      return store.dispatch({ }).then((newStore) => {
        expect(newStore.getState()).toEqual(finalState);
      });
    });

    pit('will call all the middleware in the store for each updater', () => {
      // Test Data
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const middleware = [
        createMiddlware(),
        createMiddlware(),
        createMiddlware()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters,
        middlware
      });

       // Perform Tests
      return store.dispatch({ }).then(() => {
        for(let i=0; i<middlware.length; i++) {
          const { calls } = middlware[i].mock;
          expect(calls.length).toBe(updaters.length);
        }
      });
    });

    pit('will call the middlware with stores state', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const middleware = [
        createMiddlware(),
        createMiddlware(),
        createMiddlware()
      ];
      const store = Store.createStore({
        initialState,
        updaters: [
          createUpdater(),
          createUpdater(),
          createUpdater()
        ],
        middlware
      });

       // Perform Tests
      return store.dispatch({ }).then(() => {
        for(let i=0; i<middlware.length; i++) {
          const { calls } = middlware[i].mock;
          for(let j=0; j<calls.length; j++) {
            const [ state ] = calls[j];

            expect(state).toEqual(initialState);
          }
        }
      });
    });

    pit('will call the middlware with dispatched action', () => {
      // Test Data
      const action = { type: 'TEST_ACTION' };
      const middleware = [
        createMiddlware(),
        createMiddlware(),
        createMiddlware()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters: [
          createUpdater(),
          createUpdater(),
          createUpdater()
        ],
        middlware
      });

       // Perform Tests
      return store.dispatch(action).then(() => {
        for(let i=0; i<middlware.length; i++) {
          const { calls } = middlware[i].mock;
          for(let j=0; j<calls.length; j++) {
            const [ _, dispatchedAction ] = calls[j];

            expect(dispatchedAction).toBe(action);
          }
        }
      });
    });

    it('will have a next function, that can call the updaters and "lower" middlware with a modified state', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const updatedState = { data: 'modified test state' };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const middleware = [
        createMiddlware(),
        createMiddlware((_, action, next) => next(updatedState, action)),
        createMiddlware()
      ];
      const store = Store.createStore({
        initialState,
        updaters,
        middlware
      });

       // Perform Tests
      return store.dispatch({}).then(() => {
        for(let i=0; i<middlware.length; i++) {
          // Check if the middlware is passed the correct state
          const { calls } = middlware[i].mock;
          for(let j=0; j<calls.length; j++) {
            const [ state ] = calls[j];

            if(i === 0) expect(state).toEqual(initialState);
            else        expect(state).toEqual(updatedState);
          }

          // Check if the updaters are passed the updated state
          for(let j=0; j<updater.length; j++) {
            const [ state ] = updater.mock.calls[j];

            expect(state).toEqual(updatedState);
          }
        }
      });
    });

    it('will have a next function, that can call the updaters and "lower" middlware  with a modified action', () => {
      // Test Data
      const initialAction = { type: 'TEST_ACTION' };
      const updatedAction = { type: 'TEST_ACTION', isUpdated: true };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const middleware = [
        createMiddlware(),
        createMiddlware((state, _, next) => next(state, updatedAction)),
        createMiddlware()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters,
        middlware
      });

       // Perform Tests
      return store.dispatch(initialAction).then(() => {
        for(let i=0; i<middlware.length; i++) {
          // Check if the middlware is passed the correct action
          const { calls } = middlware[i].mock;
          for(let j=0; j<calls.length; j++) {
            const [ _, action ] = calls[j];

            if(i === 0) expect(action).toEqual(initialAction);
            else        expect(action).toEqual(updatedAction);
          }

          // Check if the updaters are passed the updated action
          for(let j=0; j<updater.length; j++) {
            const [ _, action ] = updater.mock.calls[j];

            expect(action).toEqual(updatedAction);
          }
        }
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
      const store = Store.createStore({
        initialState: {},
        updaters
      });

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
      const store = Store.createStore({}, []);

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
      const store = Store.createStore({ initialState, updaters: [] })

      // Perform Tests
      expect(store.getState()).toBe(initialState);
    });

    pit('will get the updated state, if returned from the dispatch(...) method', () => {
      // Test Data
      const updatedState = { data: 'test state' };
      const store = Store.createStore({
        initialState: {},
        updaters: [ createUpdater(updatedState) ]
      });

      // Perform Tests
      return store.dispatch({}).then((newStore) => {
        expect(newStore.getState()).toBe(updatedState);
      });
    });
  });
});
