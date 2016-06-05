jest.unmock('../src/Dispatcher');

import Dispatcher from '../src/Dispatcher';

describe('Dispatcher', () => {
  describe('dispatch(...)', () => {
    it('calls dispatch, with same action, in each store', () => {
      //TODO
    });

    it('returns a Promise with updated states for all the stores', () => {
      //TODO
    });

    it('throws an error if no action is given', () => {
      //TODO
    });

    it('throws and error if something other then a basic object is given as the action', () => {
      //TODO
    });
  });

  describe('getStateForAll()', () => {
    it('returns the initial states for all the stores', () => {
      //TODO
    });

    it('returns the updated states for all the stores, after a dispatch has finished', () => {
      //TODO
    });
  });

  describe('getStateFor(...)', () => {
    it('returns the initial states for an individual stores', () => {
      //TODO
    });

    it('returns the updated states for an individual stores, after a dispatch has finished', () => {
      //TODO
    });

    it('throws an error if no store name is given', () => {
      //TODO
    });

    it('throws an error if a non existent store name is given', () => {
      //TODO
    });

    it('throws an error if a non string is given as the store name', () => {
      //TODO
    });
  });

  describe('subscribeToAll(...)', () => {
    it('call the given functions every time a store is updated, with the updated states', () => {
      //TODO
    });

    it('does not call the the given function after a dispatch, if no stores state changes', () => {
      //TODO
    });

    it('throws an error if no subscriber function is given', () => {
      //TODO
    });

    it('throws an error if a non function is given as the subscriber', () => {
      //TODO
    });
  });

  describe('subscribeTo(...)', () => {
    it('call the given functions every time the given store is updated, with the updated state', () => {
      //TODO
    });

    it('does not call the the given function after a dispatch, if the given stores state did not change', () => {
      //TODO
    });

    it('throws an error if no store name is given', () => {
      //TODO
    });

    it('throws an error if a non existent store name is given', () => {
      //TODO
    });

    it('throws an error if a non string is given as the store name', () => {
      //TODO
    });

    it('throws an error if no subscriber function is given', () => {
      //TODO
    });

    it('throws an error if a non function is given as the subscriber', () => {
      //TODO
    });
  });
});
