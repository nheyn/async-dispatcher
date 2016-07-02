jest.unmock('../src/Store');

import Immutable from 'immutable';
import Store from '../src/Store';

function createUpdater(finalState) {
  return jest.fn().mockImplementation((initialState) => finalState? finalState: initialState);
}

function createMiddleware(impl) {
  return jest.fn().mockImplementation(impl? impl: (state, action, plugins, next) => next(state, action, plugins));
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

    pit('will call the updaters with a plugins object', () => {
      // Test Data
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
      return store.dispatch({}).then(() => {
        for(let u=0; u<updaters.length; u++) {
          const { calls } = updaters[u].mock;
          expect(calls.length).toBe(1);

          const [ _, __, plugins ] = calls[0];
          expect(plugins).toBeDefined();
        }
      });
    });

    pit('will call the updaters with the getUpdaterIndex plugin, that returns the current index of the updater', () => {
      // Test Data
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
      return store.dispatch({}).then(() => {
        for(let u=0; u<updaters.length; u++) {
          const { calls } = updaters[u].mock;
          expect(calls.length).toBe(1);

          const [ _, __, plugins ] = calls[0];
          expect(plugins.getUpdaterIndex()).toEqual(u);
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

    pit('will call all the middleware in the store / passed to the dispatch method for each updater', () => {
      // Test Data
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const storeMiddleware = [
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ];
      const dispatchMiddleware = [
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters,
        middleware: storeMiddleware
      });

       // Perform Tests
      return store.dispatch({ }, Immutable.List(dispatchMiddleware)).then(() => {
        for(let i=0; i<storeMiddleware.length; i++) {
          const { calls } = storeMiddleware[i].mock;
          expect(calls.length).toBe(updaters.length);
        }

        for(let i=0; i<dispatchMiddleware.length; i++) {
          const { calls } = dispatchMiddleware[i].mock;
          expect(calls.length).toBe(updaters.length);
        }
      });
    });

    pit('will call all the middleware in the store for each updater', () => {
      // Test Data
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const storeMiddleware = [
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters,
        middleware: storeMiddleware
      });

       // Perform Tests
      return store.dispatch({ }).then(() => {
        for(let i=0; i<storeMiddleware.length; i++) {
          const { calls } = storeMiddleware[i].mock;
          expect(calls.length).toBe(updaters.length);
        }
      });
    });

    pit('will call all the middleware passed to the dispatch method for each updater', () => {
      // Test Data
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const dispatchMiddleware = [
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ];
      const store = Store.createStore({
        initialState: {},
        updaters
      });

       // Perform Tests
      return store.dispatch({ }, Immutable.List(dispatchMiddleware)).then(() => {
        for(let i=0; i<dispatchMiddleware.length; i++) {
          const { calls } = dispatchMiddleware[i].mock;
          expect(calls.length).toBe(updaters.length);
        }
      });
    });

    pit('will call the middleware with stores state', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const dispatchedAction = { type: 'TEST_ACTION' };
      const storeMiddleware = [
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ];
      const dispatchMiddleware = [
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ];
      const store = Store.createStore({
        initialState,
        updaters: [
          createUpdater(),
          createUpdater(),
          createUpdater()
        ],
        middleware: storeMiddleware
      });

       // Perform Tests
      return store.dispatch(dispatchedAction, Immutable.List(dispatchMiddleware)).then(() => {
        for(let i=0; i<storeMiddleware.length; i++) {
          const { calls } = storeMiddleware[i].mock;
          for(let j=0; j<calls.length; j++) {
            const [ state, action ] = calls[j];

            expect(state).toEqual(initialState);
            expect(action).toEqual(dispatchedAction);
          }
        }

        for(let i=0; i<dispatchMiddleware.length; i++) {
          const { calls } = storeMiddleware[i].mock;
          for(let j=0; j<calls.length; j++) {
            const [ state, action ] = calls[j];

            expect(state).toEqual(initialState);
            expect(action).toEqual(dispatchedAction);
          }
        }
      });
    });

    pit('will have middleware with next(), that calls updaters/middleware with updated action/state/plugins', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const updatedState = { data: 'modified test state' };
      const initialAction = { type: 'TEST_ACTION' };
      const updatedAction = { type: 'TEST_ACTION', isUpdated: true };
      const updatedPlugin = { test: 'plugin' };
      const updaters = [
        createUpdater(),
        createUpdater(),
        createUpdater()
      ];
      const dispatchMiddleware = [
        createMiddleware((_, action, plugins, next) => next(updatedState, action, plugins)),
        createMiddleware((state, _, plugins, next) => next(state, updatedAction, plugins)),
        createMiddleware()
      ];
      const storeMiddleware = [
        createMiddleware(),
        createMiddleware((state, action, plugins, next) => {
          plugins.testPlugin = updatedPlugin;
          return next(state, updatedAction, plugins);
        }),
        createMiddleware()
      ];
      const store = Store.createStore({
        initialState,
        updaters,
        middleware: storeMiddleware
      });

      // Perform Tests
      return store.dispatch(initialAction, Immutable.List(dispatchMiddleware)).then(() => {
        for(let m=0; m<dispatchMiddleware.length + storeMiddleware.length; m++) {
          // Check if the middleware is passed the correct state / action
          const { calls } = m < dispatchMiddleware.length?
                                  dispatchMiddleware[m].mock:
                                  storeMiddleware[m - dispatchMiddleware.length].mock;

          for(let c=0; c<calls.length; c++) {
            const [ state, action, plugins ] = calls[c];

            if(c === 0 && m <= 0) expect(state).toBe(initialState);
            else                  expect(state).toBe(updatedState);

            if(m <= 1)            expect(action).toBe(initialAction);
            else                  expect(action).toBe(updatedAction);

            //NOTE, can't check before/after because plugins is mutable
            if(m > 4)             expect(plugins.testPlugin).toBe(updatedPlugin);
            //if(m <= 2)            expect(plugins.testPlugin).toBeUndefined();
            //else                  expect(plugins.testPlugin).toBe(updatedPlugin);
          }
        }

        // Check if the updaters are passed the updated state
        for(let u=0; u<updaters.length; u++) {
          const { calls } = updaters[u].mock;
          expect(calls.length).toBe(1);

          const [ state, action, plugins ] = calls[0];
          expect(state).toEqual(updatedState);
          expect(action).toEqual(updatedAction);
          expect(plugins.testPlugin).toBe(updatedPlugin);
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
      const store = Store.createStore({
        initialState: {},
        updaters: []
      });

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
