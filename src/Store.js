/*
 * @flow
 */
import Immutable from 'immutable';

import asyncReduce from './utils/asyncReduce';
import combineMiddleware from './utils/combineMiddleware';

import type { Action, Middleware, StoreSpec, Updater } from 'async-dispatcher';
import type { CombinedUpdater } from './utils/combineMiddleware';

type UpdaterList<S> = Immutable.List<Updater<S>>;
type MiddlewareList<S> = Immutable.List<Middleware<S>>;

/**
 * A store that uses updaters to dispatch changes to its state.
 */
export default class Store<S> {
  _state: S;
  _updaters: UpdaterList<S>;
  _middleware: MiddlewareList<S>;

  /**
   * Store constuctor (use Store.createStore).
   *
   * @param state       {any}               The current state of the object
   * @param updaters    {List<Updater>}     The updaters that can mutate the Store
   * @param middleware  {List<Middleware>}  The middleware functions to use
   */
  constructor(state: S, updaters: UpdaterList<S>, middleware: MiddlewareList<S>) {
    this._state = state;
    this._updaters = updaters;
    this._middleware = middleware;
  }

  /**
   * Create a new Store.
   *
   * @param {
   *          initialState  {any}               The initial state of the store
   *          updaters      {Array<Updater>}    The updaters that can mutate the Store
   *          middleware    {Array<Middleware>} The middleware functions to use
   *        }
   *
   * @return                {Store}             The new Store
   */
  static createStore({ initialState, updaters, middleware }: StoreSpec<S>): Store<S> {
    if(initialState === 'undefined')              throw new Error('An initialState is required to create a Store');
    if(!Array.isArray(updaters))                  throw new Error('An array of updaters is required to create a Store');
    if(middleware && !Array.isArray(middleware))  throw new Error('Middleware must be an array when creating a Store');

    return new Store(initialState, Immutable.List(updaters), Immutable.List(middleware? middleware: []));
  }

  /**
   * Update the Store by calling the actions in all the updaters.
   *
   * @param action      {Object}            The action to pass to each of the updaters
   * @param middleware  {List<Middleware>}  The middleware to use
   *
   * @throws                                An error when the action is not a plain object
   *
   * @return            {Promise<Store>}    A Promise with the new Store with the state after calling the updaters
   */
  dispatch(action: Action, middleware?: MiddlewareList<S>): Promise<Store<S>> {
    if(!action || typeof action !== 'object') throw new Error('actions must be objects');

    // Get all middleware for current dispatch
    const currMiddleware = middleware? middleware.concat(this._middleware): this._middleware;

    // Perform dispatch
    const updatedStatePromise = dispatch(this._state, action, this._updaters, currMiddleware);

    // Create new store from the new state
    return updatedStatePromise.then((updatedState) => {
      // Check for valid state
      if(typeof updatedState === 'undefined') throw new Error('a state must be returned from each updater');

      return this.replaceState(updatedState);
    });
  }

  /**
   * Replace the state of the Store.
   *
   * @param newState  {amy}   The state to use
   *
   * @return          {Store} The Store with the replaced state
   */
  replaceState(newState: S): Store<S> {
    // Return 'this' if the state has not changed
    if(this._state === newState) return this;

    return new Store(newState, this._updaters, this._middleware);
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
 * @param state       {any}               The initial state to send through the updaters
 * @param action      {Action}            The action to pass to the updaters
 * @param updater     {List<Updaters>}    The updaters to call
 * @param middleware  {List<Middleware>}  The middleware to use
 *
 * @return            {Promise<any>}      The updated state in a Promise
 */
function dispatch<S>(state: S, action: Action, updaters: UpdaterList<S>, middleware: MiddlewareList<S>): Promise<S> {
  // Go through each updater
  return asyncReduce(updaters, (currState, updater, index) => {
    // Built in plugins
    const initPlugins = {
      getUpdaterIndex() {
        return index;
      },
      getUpdaterCount() {
        return updaters.size;
      },
    };

    // Call updater with middleware/plugins for this dispatch/updater (not sure why type is neeed ???)
    const currUpdater: CombinedUpdater<S> = combineMiddleware(middleware, updater, initPlugins);

    return currUpdater(currState, action);
  }, state);
}
