jest.unmock('../../src/dispatch/StoreDispatchHandler');

import Immutable from 'immutable';
import StoreDispatchHandler from '../../src/dispatch/StoreDispatchHandler';

function createUpdater(finalState) {
  return jest.fn().mockImplementation((initialState) => finalState? finalState: initialState);
}

function createMiddleware(impl) {
  return jest.fn().mockImplementation(impl? impl: (state, action, plugins, next) => next(state, action, plugins));
}

describe('StoreDispatchHandler', () => {
  describe('dispatch(...)', () => {
    pit('will call each updater, with the given action', () => {
      // Test Data
      const action = { type: 'TEST_ACTION' };
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

      // Perform Tests
      return dispatchHandler.dispatch({}, action, Immutable.List()).then(() => {
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
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

      // Perform Tests
      return dispatchHandler.dispatch(initialState, {}, Immutable.List()).then(() => {
        const { calls } = updaters.get(0).mock;
        expect(calls.length).toBe(1);

        const [dispatchedState] = calls[0];
        expect(dispatchedState).toBe(initialState);
      });
    });

    pit('will call the rest of the updaters with the value returned from the previous updater', () => {
      // Test Data
      const updatedStates = [
        null,
        { data: 'updated state 1' },
        { data: 'updated state 2' }
      ];
      const updaters = Immutable.List([
        createUpdater(updatedStates[1]),
        createUpdater(Promise.resolve(updatedStates[2])),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);


      // Perform Tests
      return dispatchHandler.dispatch({}, {}, Immutable.List()).then(() => {
        updaters.forEach((updater, index) => {
          if(index === 0) return;

          const { calls } = updater.mock;
          expect(calls.length).toBe(1);

          const [dispatchedState] = calls[0];
          expect(dispatchedState).toBe(updatedStates[index]);
        });
      });
    });

    pit('will call the updaters with a plugins object', () => {
      // Test Data
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

      // Perform Tests
      return dispatchHandler.dispatch({}, {}, Immutable.List()).then(() => {
        updaters.forEach((updater) => {
          const { calls } = updater.mock;
          expect(calls.length).toBe(1);

          const [ _, __, plugins ] = calls[0];
          expect(plugins).toBeDefined();
        });
      });
    });

    pit('will call the updaters with the getUpdaterIndex plugin, that returns the current index of the updater', () => {
      // Test Data
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

      // Perform Tests
      return dispatchHandler.dispatch({}, {}, Immutable.List()).then(() => {
        updaters.forEach((updater, index) => {
          const { calls } = updater.mock;
          expect(calls.length).toBe(1);

          const [ _, __, plugins ] = calls[0];
          expect(plugins.getUpdaterIndex()).toEqual(index);
        });
      });
    });

    pit('will call the updaters with the getUpdaterIndex plugin, that returns the current index of the updater', () => {
      // Test Data
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

      // Perform Tests
      return dispatchHandler.dispatch({}, {}, Immutable.List()).then(() => {
        updaters.forEach((updater) => {
          const { calls } = updater.mock;
          expect(calls.length).toBe(1);

          const [ _, __, plugins ] = calls[0];
          expect(plugins.getUpdaterCount()).toEqual(updaters.size);
        });
      });
    });

    pit('will return a promise with the state from the final updater', () => {
      // Test Data
      const finalState = { data: 'test state' };
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater(finalState)
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

      // Perform Tests
      return dispatchHandler.dispatch({}, {}, Immutable.List()).then((newState) => {
        expect(newState).toEqual(finalState);
      });
    });

    pit('will call all the middleware in the store / passed to the dispatch method for each updater', () => {
      // Test Data
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const middleware = Immutable.List([
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

       // Perform Tests
      return dispatchHandler.dispatch({}, {}, middleware).then(() => {
        middleware.forEach((currMiddleware) => {
          const { calls } = currMiddleware.mock;
          expect(calls.length).toBe(updaters.size);
        })
      });
    });

    pit('will call the middleware with stores state', () => {
      // Test Data
      const initialState = { data: 'test state' };
      const dispatchedAction = { type: 'TEST_ACTION' };
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater(),
        createUpdater()
      ]);
      const middleware = Immutable.List([
        createMiddleware(),
        createMiddleware(),
        createMiddleware()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);

       // Perform Tests
      return dispatchHandler.dispatch(initialState, dispatchedAction, middleware).then(() => {
        middleware.forEach((currMiddleware) => {
          const { calls } = currMiddleware.mock;
          for(let j=0; j<calls.length; j++) {
            const [ state, action ] = calls[j];

            expect(state).toEqual(initialState);
            expect(action).toEqual(dispatchedAction);
          }
        });
      });
    });

    pit('will return a promise with any error called during the dispatch', () => {
      // Test Data
      const testError = new Error('test error');
      const updaters = Immutable.List([
        createUpdater(),
        createUpdater().mockImplementation(() => {
          throw testError;
        }),
        createUpdater()
      ]);
      const dispatchHandler = StoreDispatchHandler.createDispatchHandler(updaters);


       // Perform Tests
      return dispatchHandler.dispatch({}, {}, Immutable.List()).then(() => {
        expect('not').toBe('called');
      }).catch((err) => {
        expect(err).toEqual(testError);
      });
    });
  });
});
