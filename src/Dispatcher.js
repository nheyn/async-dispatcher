/* @flow */
import Immutable from 'immutable';

import { createDispatchForDispatcher } from './dispatch';
import Store from './Store';
import { createGetCurrentStateMiddleware, createDispatchMiddleware } from './middleware';
import Queue from './utils/Queue';

import type { Action, Middleware, Subscriber, Updater, UnsubscibeFunc } from 'async-dispatcher';
import type { StoresMap, DispatcherDispatch, UpdateStoresFunc } from './dispatch/types';

type SubscriberMap = Immutable.Map<string, Immutable.Set<Subscriber<any>>>;

export default class Dispatcher {
  _stores: StoresMap;
  _subscribers: SubscriberMap;
  _updateQueue: Queue<UpdateStoresFunc>;
  _dispatch: DispatcherDispatch;

  /**
   * Constructor for the Dispatcher.
   *
   * @param initialStores       {Immutable.Map<Store>}                          The initial stores
   * @param initialSubscribers  {Immutable.Map<Immutable.Set<(any) => void>>}   The initial subscribers
   * @param initialUpdates      {Queue<QueuedDispatch>}                         The initial updates to call
   */
  constructor(initialStores: StoresMap, initialSubscribers: SubscriberMap, initialUpdates: Queue<UpdateStoresFunc>) {
    this._stores = initialStores;
    this._subscribers = initialSubscribers;
    this._updateQueue = initialUpdates;
    this._dispatch = createDispatchForDispatcher(this._getMiddleware(), (update) => this._updateStores(update));

    this._dispatchFromQueue();
  }

  /**
   * Create a new Dispatcher.
   *
   * @param initialStores {Object<Store>} The initial stores
   *
   * @return              {Dispatcher}    The dispatcher using the given stores
   */
  static createDispatcher(initialStores: {[key: string]: Store<any> | Updater<any> | Object }): Dispatcher {
    const initialStoreMap = Immutable.Map(initialStores).map((initialStore, storeName) => {
      if(!initialStore)                             throw new Error('Store cannot be null/undefined');
      else if(typeof initialStore === 'function')   return Store.createReduxStore(initialStore);
      else if(Store.isStore(initialStore))          return initialStore;
      else                                          return Store.createStaticStore(initialStore);
    });

    return new Dispatcher(
      initialStoreMap,
      initialStoreMap.map(() => Immutable.Set()),
      Queue.createQueue(),
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
    return this._dispatch(action).then(() => this);
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

    this._addSubsciber(storeName, subscriber);

    return this._createUnsubscribFunc(storeName, subscriber)
  }

  /* Stores methods */
  _setStore<S>(storeName: string, updatedStore: Store<S>) {
    if(!this._stores.has(storeName))  throw new Error(`Cannot set invalid store, ${storeName}`);

    // Don't do anything if the store hasn't changed
    if(this._stores.get(storeName) === updatedStore) return;

    this._stores = this._stores.set(storeName, updatedStore);
    this._callSubscribers(storeName);
  }

  _setStoreState<S>(storeName: string, updatedState: S) {
    if(!this._stores.has(storeName))  throw new Error(`Cannot set state of invalid store, ${storeName}`);

    const currStore = this._stores.get(storeName);
    const updatedStore = currStore.replaceState(updatedState);

    this._setStore(storeName, updatedStore);
  }

  _updateStores(dispatchFunc: UpdateStoresFunc): Promise<StoresMap> {
    return new Promise((resolve, reject) => {
      // Wrap dispatchFunc to resolve promise
      this._enqueueDispatch((stores) => {
        // Perform dispatch
        const updatedStoresMaybePromise = dispatchFunc(stores);

        // Resolve returned promise after update has been performed
        return Promise.resolve(updatedStoresMaybePromise).then((updatedStores) => {
          resolve(updatedStores);
          return updatedStores;
        }).catch((err) => {
          reject(err);
          throw err;
        });
      });

      // Start Dispatch
      this._dispatchFromQueue();
    });
  }

  /* Dispatch methods */
  _dispatchFromQueue() {
    const nextDispatch = this._dequeueDispatch();
    if(nextDispatch) this._performDispatch(nextDispatch);
  }

  _performDispatch(dispatchFunc: UpdateStoresFunc) {
    const updatedStoresMaybePromise = dispatchFunc(this._stores);

    Promise.resolve(updatedStoresMaybePromise).then((updatedStores) => {
      // Perform dispatch
      updatedStores.forEach((updatedStore, storeName) => {
        this._setStore(storeName, updatedStore);
      });

      this._dispatchFromQueue();
    });
  }

  /* Middleware methods */
  _getMiddleware(): Immutable.List<Middleware<any>> {
    return Immutable.List([
      createGetCurrentStateMiddleware((storeName) => {
        return this.getStateFor(storeName);
      }),
      createDispatchMiddleware((storeName, state, action) => {
        this._setStoreState(storeName, state);

        return this.dispatch(action).then(() => this.getStateFor(storeName));
      }),
    ]);
  }

  /* Subscibers methods */
  _addSubsciber(storeName: string, subscriber: Subscriber<any>) {
    const currSubscribers = this._subscribers.get(storeName);
    const newSubscibers = currSubscribers.add(subscriber);

    this._subscribers = this._subscribers.set(storeName, newSubscibers);
  }

  _createUnsubscribFunc(storeName: string, subscriber: Subscriber<any>): UnsubscibeFunc {
    let hasUnsubscribed = false;
    return () => {
      if(hasUnsubscribed) {
        throw new Error('Cannot unsubscribe: subscriber has already been removed from the dispatcher');
      }

      const currSubscribers = this._subscribers.get(storeName);
      const newSubscibers = currSubscribers.delete(subscriber);

      this._subscribers = this._subscribers.set(storeName, newSubscibers);
      hasUnsubscribed = true;
    };
  }

  _callSubscribers(storeName: string) {
    if(!this._subscribers.has(storeName)) throw new Error(`Cannot call subscribers for invalid store, ${storeName}`);
    if(!this._stores.has(storeName))      throw new Error(`Cannot call subscribers for invalid store, ${storeName}`);

    const storeSubscribers = this._subscribers.get(storeName);
    const storeState = this._stores.get(storeName).getState();

    storeSubscribers.forEach((storeSubscriber) => {
      storeSubscriber(storeState)
    });
  }

  /*  Queue methods */
  _enqueueDispatch(updateFunc: UpdateStoresFunc) {
    this._updateQueue = this._updateQueue.enqueue(updateFunc);
  }


  _dequeueDispatch(): ?UpdateStoresFunc {
    if(this._updateQueue.isEmpty()) return null;

    const { element: updateFunc, queue } = this._updateQueue.dequeue();
    this._updateQueue = queue;

    return updateFunc;
  }
}