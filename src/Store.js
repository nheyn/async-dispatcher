/*
 * @flow
 */
import Immutable from 'immutable';

import { createDispatchForStore } from './dispatch';
import { createPauseWithMergeMiddleware } from './middleware';

import type { Action, Middleware, StoreSpec, Updater } from 'async-dispatcher';
import type { StoreDispatch } from './dispatch/types';

type UpdaterList<S> = Immutable.List<Updater<S>>;
type MiddlewareList<S> = Immutable.List<Middleware<S>>;

/**
 * A store that uses updaters to dispatch changes to its state.
 */
export default class Store<S> {
  _state: S;
  _middleware: MiddlewareList<S>;
  _dispatch: StoreDispatch;

  /**
   * Store constuctor (use Store.createStore).
   *
   * @param state       {any}               The current state of the object
   * @param middleware  {List<Middleware>}  The middleware functions to use
   * @param dispatch    {Function}          A function that will perform the dispatch for the store
   */
  constructor(state: S, middleware: MiddlewareList<S>, dispatch: StoreDispatch) {
    this._state = state;
    this._middleware = middleware;
    this._dispatch = dispatch;
  }

  /**
   * Check if the given value is a store.
   *
   * @param maybeStore  {any} The value to check
   *
   * @return                  TRUE if the value is a Store, else FALSE
   *                            NOTE: This checks the api, so the correct interface will return true
   */
  static isStore(maybeStore: any): bool {
    if(typeof maybeStore.dispatch !== 'function')     return false;
    if(typeof maybeStore.replaceState !== 'function') return false;
    if(typeof maybeStore.getState !== 'function')     return false;

    return true;
  }

  /**
   * Create a new Store.
   *
   * @param {
   *          initialState  {any}               The initial state of the store
   *          updaters      {Array<Updater>}    The updaters that can mutate the Store
   *          middleware    {Array<Middleware>} The middleware functions to use
   *          merge         {Function}          A function that will merge two states
   *        }
   *
   * @return                {Store}             The new Store
   */
  static createStore({ initialState, updaters, middleware, merge }: StoreSpec<S>): Store<S> {
    if(initialState === 'undefined')              throw new Error('An initialState is required to create a Store');
    if(!Array.isArray(updaters))                  throw new Error('An array of updaters is required to create a Store');
    if(middleware && !Array.isArray(middleware))  throw new Error('Middleware must be an array when creating a Store');

    const updaterList = Immutable.List(updaters);
    const dispatch = createDispatchForStore(updaterList)

    let middlewareList = Immutable.List(middleware);
    if(typeof merge === 'function') {
      const pauseWithMergeMiddleware = createPauseWithMergeMiddleware(merge);
      middlewareList = middlewareList.unshift(pauseWithMergeMiddleware);
    }

    return new Store(initialState, middlewareList, dispatch);
  }

  /**
   *
   */
  static createStaticStore(state: S): Store<S> {
    return new Store(state, Immutable.List(), () => Promise.resolve(state));
  }

  /**
   *
   */
  static createReduxStore(reducer: Updater<S>): Store<S> {
    // $FlowIssue - To get redux style initial state
    const initialState = reducer(undefined, { type: '@@async-dispatcher/INIT' });

    const reducerList = Immutable.List([ reducer ]);
    const dispatch = createDispatchForStore(reducerList, Immutable.List());

    return new Store(initialState, Immutable.List(), dispatch);
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

    // Combine all middleware
    const middlewareList = middleware? middleware.concat(this._middleware): this._middleware;

    // Perform dispatch
    const updatedStatePromise = this._dispatch(this._state, action, middlewareList);

    // Create new Store from the new state
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

    return new Store(newState, this._middleware, this._dispatch);
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
