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
  xdescribe('dispatch(...)', () => {
    //TODO, needs to updated for StoreDispatchHandler.js
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

    //TODO, needs to updated for StoreDispatchHandler.js
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

    /*/TODO, need to update for DispatcherDispatchHandler
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
    });//*/
  });
});
