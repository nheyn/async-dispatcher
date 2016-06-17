/*
 * @flow
 */
import Immutable from 'immutable';

import ActionQueue from './utils/ActionQueue';
import ActionAsyncTracker from './utils/ActionAsyncTracker';
import mapOfPromisesToMapPromise from './utils/mapOfPromisesToMapPromise';

import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type SubscriberMap = Immutable.Map<string, Immutable.Set<Subscriber>>;

/**
 * A class that contains a group of stores that should all receive the same actions.
 */
export default class Dispatcher {
  _stores: StoresMap;
  _subscribers: SubscriberMap;
  _actions: ActionQueue;
  _actionAsyncTracker: ActionAsyncTracker;

  /**
   * Constructor for the Dispatcher.
   *
   * @param initialStores       {Immutable.Map<Store>}                          The initial stores
   * @param initialSubscribers  {Immutable.Map<Immutable.Set<(any) => void>>}   The initial subscribers
   */
  constructor(initialStores: StoresMap, initialSubscribers: SubscriberMap) {
    this._stores = initialStores;
    this._subscribers = initialSubscribers;
    this._actions = ActionQueue.createActionQueue();
    this._actionAsyncTracker = ActionAsyncTracker.createActionAsyncTracker();

    if(!this._actions.isEmpty()) this._dispatchActionFromQueue();
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
    const shouldStartDispatch = this._actions.isEmpty();

    // Enqueue given action
    this._actions = this._actions.enqueue(action);

    // Start dispatch if needed
    if(shouldStartDispatch) this._dispatchActionFromQueue();

    // Return a promise that resolves when the given action finishes dispatching
    const { tracker, promise } = this._actionAsyncTracker.waitForAction(action);
    this._actionAsyncTracker = tracker;

    return promise;
  }

  /**
   * Gets the state from the given store of the Stores.
   *
   * @param storeName {string}  The name of the store to get the state of
   *
   * @return          {any}   The state of the given store
   */
  getStateFor(storeName: string): any {
    if(!this._stores.has(storeName)) throw new Error(`store name, ${storeName}, does not exist`);

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
    if(typeof subscriber !== 'function') throw new Error('Cannot subscribe: subscriber must be a function');
    if(typeof storeName !== 'string') throw new Error('Cannot subscribe: store name must be a string');
    if(!this._subscribers.has(storeName)) {
      throw new Error(`Cannot subscribe: "${storeName}" dose not exist`);
    }

    // Add to list of subscribe for given store
    const currSubscribers = this._subscribers.get(storeName);
    this._subscribers = this._subscribers.set(storeName, currSubscribers.add(subscriber));

    // Return a function that will unsubscribe the subscriber
    return this._createUnsubscribFunc(storeName, subscriber)
  }

  _dispatchActionFromQueue() {
    // Dequeue next action
    const { action, queue } = this._actions.dequeue();
    this._actions = queue;

    // Perform dispatch on each store
    const newStoresPromise = dispatch(action, this._stores);

    // Handle the updated states
    newStoresPromise.then((newStores) => {
      this._setStores(newStores);

      this._actionAsyncTracker.resolveForAction(action, this);
    }).catch((err) => {
      this._actionAsyncTracker.rejectForAction(action, err);
    }).then(() => {
      // Start next dispatch if there are actions left in the queue
      if(!this._actions.isEmpty()) this._dispatchActionFromQueue();
    });
  }

  _setStores(stores: StoresMap) {
    // Save stores
    this._stores = stores;

    // Call subscribers
    this._subscribers.forEach((storeSubscribers, storeName) => {
      if(storeSubscribers.isEmpty())  return;

      const storeState = this.getStateFor(storeName);
      storeSubscribers.forEach((storeSubscriber) => {
        storeSubscriber(storeState);
      });
    });
  }

  _createUnsubscribFunc(storeName: string, subscriber: Subscriber<any>): UnsubscibeFunc {
    let hasUnsubscribed = false;
    return () => {
      if(hasUnsubscribed) {
        throw new Error('Cannot unsubscribe: subscriber has already been removed from the dispatcher');
      }

      // Perform unsubscribe
      const currSubscribers = this._subscribers.get(storeName);
      this._subscribers = this._subscribers.set(storeName, currSubscribers.delete(subscriber));

      hasUnsubscribed = true;
    };
  }
}

/**
 * Dispatch the action to each of the stores.
 *
 * @param action  {Action}                The action to perform
 * @param stores  {Map<Store>}            The stores to perform the action on
 *
 * @return        {Promise<Map<Stores>>}  A promise that resolves to a map of stores after the given action
 */
function dispatch(action: Action, stores: StoresMap): Promise<StoresMap> {
  // Call dispatch on each store
  const storePromises = stores.map((store) => {
    return store.dispatch(action);
  });

  return mapOfPromisesToMapPromise(storePromises);
}
