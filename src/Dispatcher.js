/*
 * @flow
 */
import Immutable from 'immutable';

import {
  createGetStoreNameMiddleware,
  createGetCurrentStateMiddleware,
  createPauseMiddleware,
  createDispatchMiddleware
} from './middleware';
import Queue from './utils/Queue';
import AsyncTracker from './utils/AsyncTracker';
import mapOfPromisesToMapPromise from './utils/mapOfPromisesToMapPromise';

import type { Action, Middleware, Subscriber, UnsubscibeFunc } from 'async-dispatcher';
import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type SubscriberMap = Immutable.Map<string, Immutable.Set<Subscriber>>;
type MiddlewareList = Immutable.List<Middleware<any>>;
type QueuedDispatch = (stores: StoresMap) => Promise<StoresMap>;

const DISPATCH_ERROR = new Error('Error thrown during dispatch');

/**
 * A class that contains a group of stores that should all receive the same actions.
 */
export default class Dispatcher {
  _stores: StoresMap;
  _subscribers: SubscriberMap;
  _dispatchQueue: Queue<QueuedDispatch>;
  _asyncTracker: AsyncTracker<Action, Dispatcher>;    //NOTE, assume every action is a diffrent object (no global const)

  /**
   * Constructor for the Dispatcher.
   *
   * @param initialStores         {Immutable.Map<Store>}                          The initial stores
   * @param initialSubscribers    {Immutable.Map<Immutable.Set<(any) => void>>}   The initial subscribers
   * @param initialDispatchQueue  {Queue<QueuedDispatch>}                         The initial dispatches to call
   * @param initialAsyncTrack     {AsyncTracker}                                  The initial async track, for ^
   */
  constructor(
    initialStores: StoresMap,
    initialSubscribers: SubscriberMap,
    initialDispatchQueue: Queue<QueuedDispatch>,
    initialAsyncTracker: AsyncTracker
  ) {
    this._stores = initialStores;
    this._subscribers = initialSubscribers;
    this._dispatchQueue = initialDispatchQueue;
    this._asyncTracker = initialAsyncTracker;

    if(!this._dispatchQueue.isEmpty()) this._dispatchFromQueue();
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
      initialStoreMap.map(() => Immutable.Set()),
      Queue.createQueue(),
      AsyncTracker.createAsyncTracker()
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
    const shouldStartDispatch = this._dispatchQueue.isEmpty();

    const finishedDispatchPromise = this._addActionToQueue(action);
    if(shouldStartDispatch) this._dispatchFromQueue();

    return finishedDispatchPromise;
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

  /* Dispatch Queue methods */
  _addActionToQueue(action: Action): Promise<Dispatcher> {
    // Create function that will dispatch this action, but can use future stores
    const dispatchFunc = this._createDispatchFunction(action);

    // Add to dispatch queue
    this._dispatchQueue = this._dispatchQueue.enqueue(dispatchFunc)

    // Return a promise that resolves when the given action finishes dispatching
    const { tracker, promise } = this._asyncTracker.waitFor(action);
    this._asyncTracker = tracker;

    return promise;
  }

  _dispatchFromQueue() {
    // Dequeue next dispatch function
    const { element: dispatchFunc, queue } = this._dispatchQueue.dequeue();
    this._dispatchQueue = queue;

    // Perform dispatch on current stores
    dispatchFunc(this._stores).then(() => {
      // Start next dispatch if there are actions left in the queue
      if(!this._dispatchQueue.isEmpty()) this._dispatchFromQueue();
    }).catch((err) => {
      if(err === DISPATCH_ERROR) return;  // DISPATCH_ERROR returned if the error has already been handled

      console.error(`Internal error during dispatch`, err);
    });
  }

  _createDispatchFunction(action: Action): QueuedDispatch {
    return (stores) => {
      // Get middleware for dispatch
      const middleware = this._getDefaultMiddleware();

      // Perform dispatch
      let finishedDispatchPromise = dispatch(action, stores, middleware);

      // Save the updated states
      finishedDispatchPromise = finishedDispatchPromise.then((updatedStores) => {
        updatedStores.forEach((updatedStore, storeName) => {
          this._setStore(storeName, updatedStore);
        });

        return updatedStores;
      });

      // Resolve promises returned from '.dispatch(...)'
      return finishedDispatchPromise.then((updatedStores) => {
        this._asyncTracker = this._asyncTracker.resolveFor(action, this);

        return updatedStores;
      }, (err) => {                  //NOTE, not using catch so error from ^ is returned
        this._asyncTracker = this._asyncTracker.rejectFor(action, err);

        throw DISPATCH_ERROR;
      });
    };
  }

  _getDefaultMiddleware(): MiddlewareList {
    return Immutable.List([
      createGetCurrentStateMiddleware(this),
      createPauseMiddleware(),
      createDispatchMiddleware(this)
    ]);
  }

  /* Stores methods */
  _setStore<S>(storeName: string, updatedStore: Store<S>) {
    if(!this._subscribers.has(storeName)) throw new Error(`Cannot set invalid store, ${storeName}`);
    if(!this._stores.has(storeName))      throw new Error(`Cannot set invalid store, ${storeName}`);

    // Don't do anything if the store hasn't changed
    if(this._stores.get(storeName) === updatedStore) return;

    // Save new Store
    this._stores = this._stores.set(storeName, updatedStore);

    // Call each subscriber
    const storeSubscribers = this._subscribers.get(storeName);
    const storeState = updatedStore.getState();

    storeSubscribers.forEach((storeSubscriber) => {
      storeSubscriber(storeState)
    });
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
 * @param action      {Action}                The action to perform
 * @param stores      {Map<Store>}            The stores to perform the action on
 * @param middleware  {List<Middleware>}      The middleware to use
 *
 * @return            {Promise<Map<Stores>>}  A promise that resolves to a map of stores after the given action
 */
function dispatch(action: Action, stores: StoresMap, middleware: MiddlewareList): Promise<StoresMap> {
  // Call dispatch on each store
  const storePromises = stores.map((store, storeName) => {
    const getStoreNameMiddleware = createGetStoreNameMiddleware(storeName);
    const currMiddleware = middleware.unshift(getStoreNameMiddleware);

    return store.dispatch(action, currMiddleware);
  });

  return mapOfPromisesToMapPromise(storePromises);
}
