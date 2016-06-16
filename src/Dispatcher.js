/*
 * @flow
 */
import Immutable from 'immutable';

import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type SubscriberMap = Immutable.Map<string, Immutable.Set<Subscriber>>;;

/**
 * A class that contains a group of stores that should all receive the same actions.
 */
export default class Dispatcher {
  _stores: StoresMap;
  _subscribers: SubscriberMap;
  _isDispatching: bool;

  /**
   * Constructor for the Dispatcher.
   *
   * @param initialStores       {Immutable.Map<Store>}                          The initial stores
   * @param initialSubscribers  {Immutable.Map<Immutable.Set<(any) => void>>}   The initial subscribers
   */
  constructor(initialStores: StoresMap, initialSubscribers: SubscriberMap) {
    this._stores = initialStores;
    this._subscribers = initialSubscribers;
    this._isDispatching = false;
  }

  /**
   * Create a new Dispatcher.
   *
   * @param initialStores {Object<Store>} The initial stores
   *
   * @return              {Dispatcher}    The dispatcher using the given stores
   */
  static createDispatcher(initialStores: {[key: string]: Store<any>}): Dispatcher {
    const initialStoreMap = Immutable.Map(initialStores);

    return new Dispatcher(
      initialStoreMap,
      initialStoreMap.map(() => Immutable.Set())
    );
  }

  /**
   * Dispatch the given action to all of the stores.
   *
   * @param action  {Object}                  The action to dispatch
   *
   * @return        {Promise<{string: any}>}  The states after the dispatch is finished
   */
  dispatch(action: Action): Promise<Dispatcher> {
    if(this._isDispatching) throw new Error('NYI: multiple dispatches at once');
    this._isDispatching = true;

    const updatedStorePromises = this._stores.map((store) => {
      return store.dispatch(action);
    });

    // Turn Map<string, Promise<Store>> => Promise<Map<string, Store>>
    let keys = [];
    let storePromiseArray = [];
    const storePromisesObject = updatedStorePromises.toObject()
    for(let storeName in storePromisesObject) {
      const storePromise = storePromisesObject[storeName];

      keys.push(storeName);
      storePromiseArray.push(storePromise);
    }

    const storesPromise = Promise.all(storePromiseArray).then((storeArray) => {
      let storesObject = {};
      keys.forEach((storeName, i) => {
        storesObject[storeName] = storeArray[i];
      });

      return Immutable.Map(storesObject);
    });

    // Save updated state
    return storesPromise.then((stores) => {
      this._setStores(stores);
      this._isDispatching = false;

      return this;
    });
  }

  /**
   * Gets the state from the given store of the Stores.
   *
   * @param storeName {string}  The name of the store to get the state of
   *
   * @return          {any}   The state of the given store
   */
  getStateFor(storeName: string): any {
    if(!this._stores.has(storeName)) {
      throw new Error(`store name(${storeName}) does not exist`);
    }

    return this._stores.get(storeName).getState();
  }

  /**
   * Add a new subscriber to the given Store.
   *
   * @param storeName   {string}        The store to subscribe to
   * @param subscriber  {(any) => void} The function to call, with the state, after each
   *                    dispatch
   *
   * @return            {() => void}    The function to call to unsubscibe
   */
  subscribeTo(storeName: string, subscriber: Subscriber<any>): UnsubscibeFunc {
    // Check inputs
    if(typeof subscriber !== 'function') throw new Error('Cannot subscribe: subscriber must be a function');
    if(typeof storeName !== 'string') throw new Error('Cannot subscribe: store name must be a string');
    if(!this._subscribers.has(storeName)) {
      throw new Error(`Cannot subscribe: "${storeName}" dose not exist`);
    }

    // Subscribe
    const currSubscribers = this._subscribers.get(storeName);
    this._subscribers = this._subscribers.set(storeName, currSubscribers.add(subscriber));

    // Create unsubscribe function
    let hasUnsubscribed = false;
    return () => {
      if(hasUnsubscribed) {
        throw new Error('Cannot unsubscribe: subscriber has already been removed from the dispatcher');
      }

      // Unsubscribe
      const currSubscribers = this._subscribers.get(storeName);
      this._subscribers = this._subscribers.set(storeName, currSubscribers.delete(subscriber));

      hasUnsubscribed = true;
    };
  }

  _setStores(stores: Immutable.Map<string, Store<any>>) {
    // Save stores
    this._stores = stores;

    // Call subscribers
    this._subscribers.forEach((storeSubscribers, storeName) => {
      if(storeSubscribers.count() === 0)  return;

      const storeState = this.getStateFor(storeName);
      storeSubscribers.forEach((storeSubscriber) => {
        storeSubscriber(storeState);
      });
    });
  }
}

/**
 * See static method Dispatcher.createDispatcher(...)
 */
export function createDispatcher(initialStores: {[key: string]: Store<any>}): Dispatcher {
  return Dispatcher.createDispatcher(initialStores);
}
