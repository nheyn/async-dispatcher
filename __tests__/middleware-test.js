jest.unmock('../src/middleware');

import Dispatcher from '../src/Dispatcher';
import {
  createGetStoreNameMiddleware,
  createGetCurrentStateMiddleware,
  createPauseMiddleware,
  createDispatchMiddleware
} from '../src/middleware';

// Create mock
function createDispatcher() {
  const dispatcher = new Dispatcher();

  return dispatcher;
}

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
      const middleware = createGetCurrentStateMiddleware(createDispatcher());

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
      const middleware = createGetCurrentStateMiddleware(createDispatcher());

      // Perform Test
      return middleware({}, {}, { getStoreName: jest.fn() }, next).then((state) => {
        expect(state).toBe(finalState);
      });
    });

    it('get the state from dispatcher for the current store', () => {
      // Test Data
      const testStoreName = 'storeName';
      const testStoreState = { data: 'state' };
      let dispatcher = createDispatcher();
      dispatcher.getStateFor.mockReturnValue(testStoreState);

      const middleware = createGetCurrentStateMiddleware(dispatcher);
      const getStoreName = jest.fn().mockReturnValue(testStoreName);

      // Perform Test
      middleware({}, {}, { getStoreName }, (_, __, plugins) => {
        expect(plugins.getCurrentState()).toEqual(testStoreState);

        const { calls } = dispatcher.getStateFor.mock;
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

    it('', () => {
      //TODO, how to test pause
      // Test Data

      // Perform Test
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