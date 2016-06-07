jest.unmock('../src/Store');

import Immutable from 'immutable';
import Store from '../src/Store';

function createStore(args) {
  if(!args) args = {};

  if(!args.initialState)  args.initialState = {};
  if(!args.updaters)      args.updaters = Immutable.List();
  if(!args.dispatch)      args.dispatch = jest.fn().mockReturnValue(Promise.resolve(args.initialState));

  return new Store(
    args.initialState,
    args.updaters,
    args.dispatch
  );
}

describe('Store', () => {
  describe('register(...)', () => {
    pit('will return a new store, with the given function registered as an updater', () => {
      // Test Data
      const updaters = [ jest.fn(), jest.fn(), jest.fn() ];

      let args = {};
      let store = createStore(args);

      // Perform Tests
      store = store.register(updaters[0]);
      store = store.register(updaters[1]);
      store = store.register(updaters[2]);

      return store.dispatch({}).then(() => {
        const { calls } = args.dispatch.mock;
        expect(calls.length).toBe(1);

        // Get updaters passed to dispatch
        const [ _, __, dispatchedUpdaters ] = calls[0];
        expect(dispatchedUpdaters.count()).toBe(updaters.length);

        // Call updaters passed to dispatch
        dispatchedUpdaters.forEach((dispatchedUpdater) => {
          dispatchedUpdater();
        });

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
    pit('will call the dispatch(...) function, with the stores current state', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const updaters = Immutable.List([ jest.fn(), jest.fn(), jest.fn() ]);

      let args = { initialState, updaters };
      const store = createStore(args);

      // Perform Tests
      return store.dispatch({}).then(() => {
        const { calls } = args.dispatch.mock;
        expect(calls.length).toBe(1);

        // Get state passed to dispatch
        const [ currState ] = calls[0];

        // Check initial state is passed to dispatch
        expect(currState).toBe(initialState);
      });
    });

    pit('will call the dispatch(...) function, with the given action', () => {
      // Test Data
      const updaters = Immutable.List([ jest.fn(), jest.fn(), jest.fn() ]);
      const action = { type: 'TEST_ACTION' };

      let args = { updaters };
      const store = createStore(args);

      // Perform Tests
      return store.dispatch(action).then(() => {
        const { calls } = args.dispatch.mock;
        expect(calls.length).toBe(1);

        // Check correct action was dispatched
        const dispatchedAction = calls[0][1];
        expect(dispatchedAction).toEqual(action);
      });
    });

    pit('will call the dispatch(...) function, with the registered updaters', () => {
      // Test Data
      const updaters = Immutable.List([ jest.fn(), jest.fn(), jest.fn() ]);
      const dispatchCount = 3;

      const store = createStore({
        updaters,
        dispatch(state, action, dispatchedUpdaters) {
          dispatchedUpdaters.forEach((dispatchedUpdater) => dispatchedUpdater());

          return Promise.resolve(state);
        }
      });

      // Perform Tests
      let storePromise = Promise.resolve(store);
      for(let i=0; i<dispatchCount; i++) {
        storePromise = storePromise.then((currStore) => currStore.dispatch({}));
      }

      return storePromise.then(() => {
        updaters.forEach((updater) => {
          const { calls } = updater.mock;
          expect(calls.length).toBe(dispatchCount);
        });
      });
    });

    it('will return the updated Store, who\'s state is what was returned from the dispatch(...) function', () => {
      // Test Data
      const finalState = { data: 'test state' };
      const updaters = Immutable.List([ jest.fn(), jest.fn(), jest.fn() ]);

      const store = createStore({
        updaters,
        dispatch(state, action, dispatchedUpdaters) {
          return Promise.resolve(finalState);
        }
      });

      // Perform Tests
      return store.dispatch({}).then((newStore) => {
        const newState = newStore.getState();

        expect(newState).toEqual(finalState);
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
      const store = createStore({ initialState })

      // Perform Tests
      expect(store.getState()).toBe(initialState);
    });

    pit('will get the updated state, if returned from the dispatch(...) method', () => {
      // Test Data
      const updaters = Immutable.List([ jest.fn() ]);
      const updatedState = { data: 'test state' };
      const store = createStore({
        updaters,
        dispatch() {
          return Promise.resolve(updatedState);
        }
      });

      // Perform Tests
      return store.dispatch({}).then((newStore) => {
        expect(newStore.getState()).toBe(updatedState);
      });
    });
  });
});
