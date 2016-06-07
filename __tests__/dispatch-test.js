jest.unmock('../src/Store');

import dispatch from '../src/dispatch';

xdescribe('dispatch(...)', () => {
  pit('will call each updater, with the given action', () => {
    // Test Data
    const action = { type: 'TEST_ACTION' };
    const updaters = [
      jest.fn(),
      jest.fn(),
      jest.fn()
    ];

    // Perform Tests
    return dispatch({}, action, updaters).then(() => {
      updaters.forEach((updater) => {
        const { calls } = updater.mock;

        expect(calls.length).toBe(1);
        expect(calls[1]).toBe(action);
      })
    });
  });

  pit('will call the first updaters, with given the state', () => {
    // Test Data
    const initialState = { data: 'test state' };
    const updaters = [
      jest.fn(),
      jest.fn(),
      jest.fn()
    ];

    // Perform Tests
    return dispatch(initialState, { type: 'TEST_ACTION' }, updaters).then(() => {
      const { calls } = updaters[0].mock;

      expect(calls.length).toBe(1);
      expect(calls[0]).toBe(initialState);
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
      jest.fn().mockReturnValue(updatedStates[1]),
      jest.fn().mockReturnValue(Promise.resolove(updatedStates[2])),
      jest.fn()
    ];

    // Perform Tests
    return dispatch({}, { type: 'TEST_ACTION' }, updaters).then(() => {
      updaters.forEach((updater, index) => {
        // Skip first state
        if(index === 0) return;

        const { calls } = updater.mock;

        expect(calls.length).toBe(1);
        expect(calls[0]).toBe(updatedStates[index]);
      });
    });
  });

  pit('will return a promise with the state from the final updater', () => {
    // Test Data
    const finalState = { data: 'test state' };
    const updaters = [
      jest.fn(),
      jest.fn(),
      jest.fn().mockReturnValue(finalState)
    ];

    // Perform Tests
    return dispatch({}, { type: 'TEST_ACTION' }, updaters).then((newState) => {
      expect(newState).toEqual(finalState);
    });
  });

  pit('will return a reject promise if an updater throws an error', () => {
    // Test Data
    const testError = new Error();
    const updaters = [
      jest.fn(),
      jest.fn(() => { throw testError; }),
      jest.fn()
    ];

    // Perform Tests
    return dispatch({}, { type: 'TEST_ACTION' }, updaters).catch((err) => {
      expect(err).toBe(err);

      expect(updaters[0]).toBeCalled();
      expect(updaters[1]).toBeCalled();
      expect(updaters[2]).not.toBeCalled();
    });
  });
});