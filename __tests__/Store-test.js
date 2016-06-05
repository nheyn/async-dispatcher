jest.unmock('../src/Store');

import Store from '../src/Store';

describe('Store', () => {
  describe('register(...)', () => {
    it('will return a new store, with the given function registered as an updater', () => {
      //TODO
    });

    it('throws an error if given value is not a function', () => {
      //TODO
    });
  });

  describe('dispatch(...)', () => {
    it('will call each of the updaters, in the order they where registered', () => {
      //TODO
    });

    it('will call each of the updaters, with the given action', () => {
      //TODO
    });

    it('will call the first updaters, with the state of the store', () => {
      //TODO
    });

    it('will call all but the first updaters, with the value returned from the previous updater', () => {
      //TODO
    });

    it('will return a promise with a new store with the state equal to returned from the final updater', () => {
      //TODO
    });

    it('will return a reject promise if the action is not a basic javascript object', () => {
      //TODO
    });

    it('will return a reject promise if an updater throws an error', () => {
      //TODO
    });
  });

  describe('getState()', () => {
    it('will get the initial state, if dispatch was not called', () => {
      //TODO
    });

    it('will get the new state, when returned from a dispatch call', () => {
      //TODO
    });
  });
});
