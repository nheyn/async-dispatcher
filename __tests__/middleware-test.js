jest.unmock('../src/middleware');

import Dispatcher from '../src/Dispatcher';
import {
  createGetStoreNameMiddleware,
  createGetCurrentStateMiddleware,
  createPauseMiddleware,
  createDispatchMiddleware
} from '../src/middleware';

describe('middleware', () => {
  describe('createGetStoreNameMiddleware', () => {
    it('passes through the state and action, un-changed', () => {
      // Test Data
      const passedInState = { data: 'state' };
      const passedInAction = { type: 'TEST_ACTION' };
      const middleware = createGetStoreNameMiddleware('storeName');

      // Perform Test
      middleware(passedInState, passedInAction, {}, (state, action) => {
        expect(state).toBe(passedInState);
        expect(action).toBe(passedInAction);
      });
    });

    pit('to return the value returned from the "next" argument', () => {
      // Test Data
      const finalState = { data: 'state' };
      const next = () => Promise.resolve(finalState);
      const middleware = createGetStoreNameMiddleware('storeName');

      // Perform Test
      return middleware({}, {}, {}, next).then((state) => {
        expect(state).toBe(finalState);
      });
    });

    it('creates middleware that adds getStoreName() plugin, that returns the given store name', () => {
      // Test Data
      const storeName = 'storeName';
      const middleware = createGetStoreNameMiddleware(storeName);

      // Perform Test
      middleware({}, {}, {}, (state, action, plugins) => {
        expect(plugins.getStoreName()).toEqual(storeName);
      });
    });
  });

  describe('createGetCurrentStateMiddleware', () => {
    it('passes through the state and action, un-changed', () => {
      // Test Data
      const passedInState = { data: 'state' };
      const passedInAction = { type: 'TEST_ACTION' };
      const middleware = createGetCurrentStateMiddleware(jest.fn());

      // Perform Test
      middleware(passedInState, passedInAction, { getStoreName: jest.fn() }, (state, action) => {
        expect(state).toBe(passedInState);
        expect(action).toBe(passedInAction);
      });
    });

    pit('to return the value returned from the "next" argument', () => {
      // Test Data
      const finalState = { data: 'state' };
      const next = () => Promise.resolve(finalState);
      const middleware = createGetCurrentStateMiddleware(jest.fn());

      // Perform Test
      return middleware({}, {}, { getStoreName: jest.fn() }, next).then((state) => {
        expect(state).toBe(finalState);
      });
    });

    it('get the state from dispatcher for the current store', () => {
      // Test Data
      const testStoreName = 'storeName';
      const testStoreState = { data: 'state' };
      const getCurrentState = jest.fn().mockReturnValue(testStoreState);

      const middleware = createGetCurrentStateMiddleware(getCurrentState);
      const getStoreName = jest.fn().mockReturnValue(testStoreName);

      // Perform Test
      middleware({}, {}, { getStoreName }, (_, __, plugins) => {
        expect(plugins.getCurrentState()).toEqual(testStoreState);

        const { calls } = getCurrentState.mock;
        expect(calls.length).toEqual(1);

        const [ storeName ] = calls[0];
        expect(storeName).toEqual(testStoreName);
      });
    });
  });

  describe('createPauseMiddleware', () => {
    it('passes through the state and action, un-changed', () => {
      // Test Data
      const passedInState = { data: 'state' };
      const passedInAction = { type: 'TEST_ACTION' };
      const middleware = createPauseMiddleware({
        restartDispatch: jest.fn(),
        rejectDispatch: jest.fn(),
        pauseError: new Error()
      });
      const plugins = { getUpdaterIndex: jest.fn(), getStoreName: jest.fn() };

      // Perform Test
      middleware(passedInState, passedInAction, plugins, (state, action) => {
        expect(state).toBe(passedInState);
        expect(action).toBe(passedInAction);
      });
    });

    pit('to return the value returned from the "next" argument', () => {
      // Test Data
      const finalState = { data: 'state' };
      const next = () => Promise.resolve(finalState);
      const middleware = createPauseMiddleware({
        restartDispatch: jest.fn(),
        rejectDispatch: jest.fn(),
        pauseError: new Error()
      });
      const plugins = { getUpdaterIndex: jest.fn(), getStoreName: jest.fn() };

      // Perform Test
      return middleware({}, {}, plugins, next).then((state) => {
        expect(state).toBe(finalState);
      });
    });

    xdescribe('pause(...) plugin', () => {
      pit('is added to the plugins object', () => {
        // Test Data
        const plugins = {
          getUpdaterIndex: () => 0,
          getStoreName: () => 'storeName'
        };
        const middleware = createPauseMiddleware({
          restartDispatch: jest.fn(),
          rejectDispatch: jest.fn(),
          pauseError: new Error()
        });

        // Perform Test
        middleware({}, {}, plugins, (state, action, { pause }) => {
          expect(pause).toBeDefined();

          return state;
        });
      });

      //TODO, need to update for DispatcherDispatchHandler
      pit('will throw the given pauseError if it is used', () => {
        // Test Data
        const pauseError = new Error();
        const plugins = {
          getUpdaterIndex: () => 0,
          getStoreName: () => 'storeName'
        };
        const middleware = createPauseMiddleware({
          restartDispatch: jest.fn(),
          rejectDispatch: jest.fn(),
          pauseError
        });

        // Perform Test
        const dispatchPromise = middleware({}, {}, plugins, (state, action, { pause }) => {
          return pause(Promise.resolve(state));
        });

        return dispatchPromise.then((state) => {
          expect('not').toBe('called');
        }).catch((err) => {
          expect(err).toBe(pauseError);
        });
      });

      //TODO, need to update for DispatcherDispatchHandler
      pit('will call restartDispatch after the promise given to it is resolved', () => {
        // Test Data
        const initialState = { data: 'initialState' };
        const dispatchedAction = { type: 'UPDATER_ACTION'};
        const index = 0;
        const storeName = 'storeName';
        const plugins = {
          getUpdaterIndex: () => index,
          getStoreName: () => storeName
        };
        const restartDispatch = jest.fn();
        const middleware = createPauseMiddleware({
          restartDispatch,
          rejectDispatch: jest.fn(),
          pauseError: new Error()
        });

        // Perform Test
        const dispatchPromise = middleware(initialState, dispatchedAction, plugins, (state, action, { pause }) => {
          return pause(Promise.resolve(state));
        });

        return dispatchPromise.catch((err) => null).then(() => {
          expect(restartDispatch).toBeCalledWith(storeName, initialState, dispatchedAction, index + 1);
        });
      });

      //TODO, need to update for DispatcherDispatchHandler
      pit('will call rejectDispatch after the promise given to it is rejected', () => {
        // Test Data
        const dispatchedAction = { type: 'DISPATCHED_ACTION' };
        const plugins = {
          getUpdaterIndex: () => 0,
          getStoreName: () => 'storeName'
        };
        const rejectDispatch = jest.fn();
        const dispatchError = new Error();
        const middleware = createPauseMiddleware({
          restartDispatch: jest.fn(),
          rejectDispatch,
          pauseError: new Error()
        });

        // Perform Test
        const dispatchPromise = middleware({}, dispatchedAction, plugins, (state, action, { pause }) => {
          return pause(new Promise((resolve, reject) => {
            reject(dispatchError);
          }))
        });

        return dispatchPromise.catch((err) => null).then(() => {
          expect(rejectDispatch).toBeCalledWith(dispatchError, dispatchedAction);
        });
      });

      //TODO, need to update for DispatcherDispatchHandler
      pit('calls all .then and .catch callbacks before restartDispatch or rejectDispatch from spec is called', () => {
        // Test Data
        const initialState = { data: 'initialState' };
        const finalState = { data: 'finalState' };
        const dispatchedAction = { type: 'DISPATCHED_ACTION' };
        const thenError = new Error();
        const pauseError = new Error();
        const thenCallback = jest.fn().mockReturnValue(initialState);
        const errorCallback = jest.fn().mockImplementation(() => { throw thenError; });
        const catchCallback = jest.fn().mockReturnValue(finalState);
        const plugins = {
          getUpdaterIndex: () => 0,
          getStoreName: () => 'storeName'
        };
        const middleware = createPauseMiddleware({
          restartDispatch: jest.fn(),
          rejectDispatch: jest.fn(),
          pauseError,
        });

        // Perform Test
        const waitForPromise = new Promise((resolve) => {
          middleware(initialState, dispatchedAction, plugins, (state, action, { pause }) => {
            const pausePromise = pause(Promise.resolve(state));

            return pausePromise.then(thenCallback).then(errorCallback).catch(catchCallback).then((currState) => {
              resolve(currState);
              return currState;
            });
          }).catch((err) => {
            expect(err).toBe(pauseError);
          })
        });

        return waitForPromise.then((stateAfterCallbacks) => {
          expect(stateAfterCallbacks).toBe(finalState);
          expect(thenCallback).toBeCalledWith(initialState);
          expect(errorCallback).toBeCalled();
          expect(catchCallback).toBeCalledWith(thenError);
        });
      });
    });
  });

  describe('createDispatchMiddleware', () => {
    it('passes through the state and action, un-changed', () => {
      // Test Data
      const passedInState = { data: 'state' };
      const passedInAction = { type: 'TEST_ACTION' };
      const middleware = createDispatchMiddleware();
      const plugins = { pause: jest.fn(), getCurrentState: jest.fn(), getStoreName: jest.fn() };

      // Perform Test
      middleware(passedInState, passedInAction, plugins, (state, action) => {
        expect(state).toBe(passedInState);
        expect(action).toBe(passedInAction);
      });
    });

    pit('to return the value returned from the "next" argument', () => {
      // Test Data
      const finalState = { data: 'state' };
      const next = () => Promise.resolve(finalState);
      const middleware = createDispatchMiddleware();
      const plugins = { pause: jest.fn(), getCurrentState: jest.fn(), getStoreName: jest.fn() };

      // Perform Test
      return middleware({}, {}, plugins, next).then((state) => {
        expect(state).toBe(finalState);
      });
    });

    pit('will use pause middleware to return value state after dispatch', () => {
      // Test Data
      const dispatchedAction = { type: 'TEST_ACTION' };
      const finalState = { data: 'state' };
      const pause = jest.fn().mockImplementation((promise) => promise);
      const getCurrentState = jest.fn().mockReturnValue(finalState);

      const middleware = createDispatchMiddleware();

      // Perform Test
      /*return middleware({}, {}, { pause, getCurrentState }, (_, __, { dispatch }) => {
        return dispatch(dispatchedAction);
      }).then((state) => {
        const { calls } = pause.mock;
        expect(calls.length).toBe(1);

        //TODO, how to test
      });*/
    });
  });
});