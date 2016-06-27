/*
 * @flow
 */
import Immutable from 'immutable';

import type { Action, Middleware, StoreSpec, Updater } from 'async-dispatcher';

/**
 * A store that uses updaters to dispatch changes to its state.
 */
export default class Store<S> {
  _state: S;
  _updaters: Immutable.List<Updater<S>>;
  _middleware: Immutable.List<Middleware<S>>;

  /**
   * Store constuctor (use Store.createStore).
   *
   * @param state       {any}               The current state of the object
   * @param updaters    {List<Updater>}     The updaters that can mutate the Store
   * @param middleware  {List<Middleware>}  The middleware functions to use
   */
  constructor(state: S, updaters: Immutable.List<Updater<S>>, middleware: Immutable.List<Middleware<S>>) {
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
   * @return                {Store} The new Store
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
   * @param action    {Object}          The action to pass to each of the updaters
   *
   * @throws                            An error when the action is not a plain object
   *
   * @return          {Promise<Store>}  A Promise with the new Store with the state after calling the updaters
   */
  dispatch(action: Action): Promise<Store<S>> {
    if(!action || typeof action !== 'object') throw new Error('actions must be objects');

    // Perform dispatch
    const updatedStatePromise = dispatch(this._state, action, this._updaters, this._middleware);

    // Create new store from the new state
    return updatedStatePromise.then((updatedState) => {
      // Check for valid state
      if(typeof updatedState === 'undefined') throw new Error('a state must be returned from each updater');

      // Return 'this' if the state has not changed, else create Store with the updated state
      return this._state !== updatedState?
              new Store(updatedState, this._updaters, this._middleware):
              this;
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
function dispatch<S>(
  state: S,
  action: Action,
  updaters: Immutable.List<Updater<S>>,
  middleware: Immutable.List<Middleware<S>>
): Promise<S> {
  // Go through each updater
  return asyncReduce(updaters, (currState, updater, index) => {
    // Add middleware to updater //TODO, add dispatch/updater specific middleware)
    const currMiddleware = Immutable.List([]).concat(middleware);
    const updaterWithMiddleware = combineMiddleware(currMiddleware, updater);

    // Call current updater
    return updaterWithMiddleware(currState, action);
  }, state);
}

function combineMiddleware<S>(middlewareList: Immutable.List<Middleware<S>>, updater: Updater<S>): Updater<S> {
  return middlewareList.reverse().reduce((next, middleware) => (stateMaybePromise, action) => {
    return Promise.resolve(stateMaybePromise).then((state) => middleware(state, action, next));
  }, updater);
}

function asyncReduce<V, R>(
  list: Immutable.List<V>,
  reducer: (reduction: R, value: V, index: number) => R | Promise<R>,
  initialReduction?: R | Promise<R>
): Promise<R> {
  return list.reduce((reductionPromise, value, index) => {
    return reductionPromise.then((reduction) => {
      return Promise.resolve(
        reducer(reduction, value, index)
      );
    });
  }, Promise.resolve(initialReduction));
}
