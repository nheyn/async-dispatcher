jest.unmock('../../src/dispatch/DispatcherDispatchHandler');

import Immutable from 'immutable';
import DispatcherDispatchHandler from '../../src/dispatch/DispatcherDispatchHandler';
import Store from '../../src/Store';

// Set up mocks
function createStore(initialState, isMutable) {
  const store = new Store(initialState);

  store.dispatch.mockImplementation(() => Promise.resolve(!isMutable? store: createStore(initialState, isMutable)));
  store.getState.mockReturnValue(initialState);

  return store;
}
Store.isStore.mockReturnValue(true);

describe('DispatcherDispatchHandler', () => {
  describe('dispatch(...)', () => {
    it('does stuff (only herer so jest doesn\'t fail)', () => {

    });
  });
});
