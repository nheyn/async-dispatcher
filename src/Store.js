/*
 * @flow
 */
import Immutable from 'immutable';

import type { Action, StoreSpec, StoreDispatchSettings, Updater } from 'async-dispatcher';

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
  static createStore({ initialState, updaters }: StoreSpec<S>): Store<S> {
    return new Store(initialState, Immutable.List(updaters));
  }

  /**
   * Update the Store by calling the actions in all the updaters.
   *
   *  //TODO, return this (for === check) if no changes are made
   *
   * @param action    {Object}          The action to pass to each of the updaters
   * @param settings  {[Object]}        The settings for this dispatch
   *
   * @throws                            An error when the action is not a plain object
   * @throws                            An error if skip is not a number or an invalid number to skip
   *
   * @return          {Promise<Store>}  A Promise with the new Store with the state after calling the updaters
   */
  dispatch(action: Action, settings: StoreDispatchSettings<S> = {}): Promise<Store<S>> {
    if(!action || typeof action !== 'object')                   throw new Error('actions must be objects');
    if(settings.skip && typeof settings.skip !== 'number')      throw new Error('settings.skip must be a number');
    if(settings.skip && settings.skip < 0)                      throw new Error('settings.skip must be positive');
    if(settings.skip && settings.skip > this._updaters.count()) throw new Error('settings.skip is too large');

    const currState = settings.replaceState !== undefined? settings.replaceState: this._state;
    const currUpdaters = settings.skip !== undefined? this._updaters.slice(settings.skip): this._updaters;

    // Create new store from the new state
    return dispatch(currState, action, currUpdaters).then((updatedState) => {
      // Check for valid state
      if(typeof updatedState === 'undefined') throw new Error('a state must be returned from each updater');

      // Return 'this' if the state has not changed, else create Store with the updated state
      return this._state === updatedState? this: new Store(updatedState, this._updaters);;
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
}

/**
 * Perform a dispatch using the given updaters.
 *
 * @param state   {any}             The initial state to send through the updaters
 * @param action  {Action}          The action to pass to the updaters
 * @param updater {List<Updaters>}  The updaters to call
 *
 * @return        {Promise<any>}    The updated state in a Promise
 */
function dispatch<S>(state: S, action: Action, updaters: Immutable.List<Updater<S>>): Promise<S> {
  // Go through each updater (wrapped in a promise)
  return updaters.reduce((currStatePromise, updater, index) => {
    return currStatePromise.then((state) => {
      // Call current updater
      const newState = updater(state, action);

      return Promise.resolve(newState);
    });
  }, Promise.resolve(state));
}