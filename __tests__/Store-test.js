jest.unmock('../src/Store');

import Store from '../src/Store';

function createStore(initialState, dispatch) {
  return new Store(initialState, dispatch? dispatch: jest.fn().mockReturnValue(initialState));
}

describe('Store', () => {
  describe('register(...)', () => {
    pit('will return a new store, with the given function registered as an updater', () => {
      // Test Data
      const updaters = [ jest.fn(), jest.fn(), jest.fn() ];
      const dispatch = jest.fn();
      const store = updaters.reduce(
        (currStore, updater) => currStore.register(updater),
        createStore({}, dispatch)
      );

      // Perform Tests
      return store.dispatch({}).then(() => {
        const { calls } = dispatch.mock;

        expect(calls.length).toBe(1);

        const usedUpdaters = calls[0][2];

        expect(usedUpdaters).toEqual(updaters);
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
      const store = createStore({});

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
      const updaters = [ jest.fn(), jest.fn(), jest.fn() ];
      const dispatch = jest.fn();
      const store = updaters.reduce(
        (currStore, updater) => currStore.register(updater),
        createStore(initialState, dispatch)
      );

      // Perform Tests
      return store.dispatch({}).then(() => {
        const { calls } = dispatch.mock;

        expect(calls.length).toBe(1);
        expect(calls[0]).toBe(initialState);
      });
    });

    pit('will call the dispatch(...) function, with the given action', () => {
      // Test Data
      const updaters = [ jest.fn(), jest.fn(), jest.fn() ];
      const dispatch = jest.fn();
      const store = updaters.reduce(
        (currStore, updater) => currStore.register(updater),
        createStore({}, dispatch)
      );
      const action = { type: 'TEST_ACTION' };

      // Perform Tests
      return store.dispatch(action).then(() => {
        const { calls } = dispatch.mock;

        expect(calls.length).toBe(1);

        const { action: currAction } = calls[0][1];

        expect(currAction).toEqual(action);
      });
    });

    pit('will call the dispatch(...) function, with the registered updaters', () => {
      // Test Data
      const updaters = [ jest.fn(), jest.fn(), jest.fn() ];
      const dispatch = jest.fn();
      const store = updaters.reduce(
        (currStore, updater) => currStore.register(updater),
        createStore({}, dispatch)
      );
      const dispatchCount = 3;

      // Perform Tests
      let storePromise = Promise.resolve(store);
      for(let i=0; i<dispatchCount; i++) {
        storePromise = storePromise.then((currStore) => currStore.dispatch({}));
      }

      return storePromise.then(() => {
        const { calls } = dispatch.mock;

        expect(calls.length).toBe(dispatchCount);

        calls.forEach((args) => {
          const currUpdaters = args[2];

          expect(currUpdaters).toEqual(updaters);
        });
      });
    });

    it('will return the updated Store, who\'s state is what was returned from the dispatch(...) function', () => {
      // Test Data
      const finalState = { data: 'test state' };
      const updaters = [ jest.fn(), jest.fn(), jest.fn() ];
      const dispatch = jest.fn().mockImplementation(() => finalState);
      const store = updaters.reduce(
        (currStore, updater) => currStore.register(updater),
        createStore({}, dispatch)
      );

      // Perform Tests
      return store.dispatch({}).then((newStore) => {
        const newState = newStore.getState();

        expect(newState).toEqual(finalState);
      });
    });

    it('throw an error if the action is not a basic javascript object', () => {
      // Test Data
      const store = createStore({});
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
      const dispatch = jest.fn().mockImplementation(() => updatedState);
      const store = createStore(initialState, dispatch);

      // Perform Tests
      return store.dispatch({}).then((newStore) => {
        expect(newStore.getState()).toBe(updatedState);
      });
    });
  });
});
