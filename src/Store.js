/*
 * @flow
 */
import Immutable from 'immutable';

import dispatch from './dispatch';

/**
 * A store that uses updaters to dispatch changes to its state.
 */
export default class Store<S> {
  _state: S;
  _updaters: Immutable.List<Updater<S>>;

  /**
   * Store constuctor (use Store.createStore).
   *
   * @param state     {any}                 The current state of the object
   * @param updaters  {List<Updater>}  The updaters that can mutate the Store
   */
  constructor(state: S, updaters: Immutable.List<Updater<S>>) {
    this._state = state;
    this._updaters = updaters;
  }

  /**
   * Create a new Store.
   *
   * @param initialState  {any} The initial state of the object
   *
   * @return              {Store} The new Store
   */
  static createStore(initialState: S): Store<S> {
    return new Store(initialState, Immutable.List());
  }

  /**
   * Registers a new upator in the store.
   *
   * @param updater {Updater}       The new function that is able to update the store's state
   *
   * @throws                        An error when the given updater is not a function
   *
   * @return      {Store}           A new Store with the new updater
   */
  register(updater: Updater<S>): Store<S> {
    if(typeof updater !== 'function') throw new Error('updaters must be functions');

    // Make sure updater always returns a promise
    const promiseUpdater = (state, action) => Promise.resolve(updater(state, action));

    return new Store(this._state, this._updaters.push(promiseUpdater));
  }

  /**
   * Update the Store by calling the actions in all the updaters.
   *
   * @param action    {Object}          The action to pass to each of the updaters
   * @param settings  {[Object]}        The settings for this dispatch
   *
   * @return          {Promise<Store>}  A Promise with the new Store with the state after calling the updaters
   */
  dispatch(action: Action, settings: DispatchSettings<S> = {}): Promise<Store<S>> {
    // Check args
    if(!action || typeof action !== 'object') throw new Error('actions must be objects');
    if(settings.skip && typeof settings.skip !== 'number') throw new Error('settings.skip must be a number');

    const startingState = settings.replaceState !== undefined ? settings.replaceState: this._state;

    // Don't try to modify state if there are no updaters to perform
    const numberOfUpdater = this._updaters.count();
    if(numberOfUpdater === 0 || numberOfUpdater === settings.skip) {
      return Promise.resolve(new Store(startingState, this._updaters));
    }

    // Get updaters
    const updatersToCall = settings.skip !== undefined? this._updaters.slice(settings.skip): this._updaters;

    // Reduce the state over the updaters
    const updatedStatePromise = dispatch(startingState, action, updatersToCall);

    // Create new store from the new state
    return updatedStatePromise.then((newState) => {
      // Check for valid state
      if(!this._isValidState(newState)) throw new Error('a state must be returned from each updater');

      return new Store(newState, this._updaters);
    });
  }

  /**
   * Gets the current state of the Store.
   *
   * @return {any}  The state of the Store
   */
  getState(): S {
    return this._state;
  }

  _isValidState(testState: any): boolean {
    return typeof testState !== 'undefined';
  }
}

/**
 * See static method Store.createStore(...)
 */
export function createStore<S>(initialState: S): Store<S> {
  return Store.createStore(initialState);
}