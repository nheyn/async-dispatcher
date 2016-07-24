/*
 * @flow
 */
import Immutable from 'immutable';
import uuid from 'node-uuid';

import {
  createGetStoreNameMiddleware,
  createGetCurrentStateMiddleware,
  createPauseMiddleware,
  createDispatchMiddleware,
  createSkipUpdaterMiddleware
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

const PAUSE_ERROR = new Error('[Pause Error] DO NOT HANDLE THIS ERROR, re-throw if caught');
const DISPATCH_ERROR = new Error('Error thrown during dispatch');

/**
 * A class that contains a group of stores that should all receive the same actions.
 */
export default class Dispatcher {
  _stores: StoresMap;
  _subscribers: SubscriberMap;
  _dispatchQueue: Queue<QueuedDispatch>;
  _asyncTracker: AsyncTracker<string, Dispatcher>;

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
    const dispatchId = uuid.v4();

    const dispatchFunc = this._createNewDispatchFunction(dispatchId, action);
    this._dispatchQueue = this._dispatchQueue.enqueue(dispatchFunc);

    return this._createTrackerPromise(dispatchId);
  }

  _requeueDispatch(dispatchId: string, action: Action, storeName: string, startAt: number) {
    const middleware = Immutable.List([
      createSkipUpdaterMiddleware(storeName, startAt)
    ]);

    const dispatchFunc = this._createDispatchFunction(dispatchId, action, middleware);
    this._dispatchQueue = this._dispatchQueue.enqueue(dispatchFunc);
  }

  _dispatchFromQueue() {
    // Dequeue next dispatch function
    const { element: dispatchFunc, queue } = this._dispatchQueue.dequeue();
    this._dispatchQueue = queue;

    // Perform dispatch on current stores
    const finishedDispatchPromise = dispatchFunc(this._stores)

    // Start next dispatch if there are actions left in the queue
    finishedDispatchPromise.catch((err) => {
      if(err === DISPATCH_ERROR) return;  // DISPATCH_ERROR thrown if the error has already been handled
      if(err === PAUSE_ERROR) return;     // PAUSE_ERROR    thrown during pauses

      console.error(`Internal error during dispatch`, err);
    }).then(() => {
      if(!this._dispatchQueue.isEmpty()) this._dispatchFromQueue();
    });
  }

  _createNewDispatchFunction(dispatchId: string, action: Action): QueuedDispatch {
    return (stores) => {
      // Create dispatch function with dispatchId
      const dispatchFunc = this._createDispatchFunction(dispatchId, action);

      // Resolve/Reject promise returned from '.dispatch(...)' method
      return dispatchFunc(stores).then((updatedStores) => {
        this._resolveTrackerFor(dispatchId, this);

        return updatedStores;
      }, (err) => {           //NOTE, not using catch so errors from ^ are returned
        // Don't resolve if dispatch has been paused
        if(err === PAUSE_ERROR) throw err;

        this._rejectTrackerFor(dispatchId, err);

        throw DISPATCH_ERROR;
      });
    };
  }

  _createDispatchFunction(dispatchId: string, action: Action, currMiddleware?: MiddlewareList): QueuedDispatch {
    return (stores) => {
      // Get middleware for dispatch
      const defaultMiddleware = this._getDefaultMiddleware(dispatchId, action);
      const middleware = currMiddleware?
                          currMiddleware.concat(defaultMiddleware):
                          defaultMiddleware;

      // Perform dispatch
      const finishedDispatchPromise = dispatch(action, stores, middleware);

      // Save the updated states
      return finishedDispatchPromise.then((updatedStores) => {
        updatedStores.forEach((updatedStore, storeName) => {
          this._setStore(storeName, updatedStore);
        });

        return updatedStores;
      });
    };
  }

  _getDefaultMiddleware(dispatchId: string, action: Action): MiddlewareList {
    return Immutable.List([
      createGetCurrentStateMiddleware(this),
      createPauseMiddleware({
        restartDispatch(storeName, state, index) {
          this._setStoreState(storeName, state);

          this._requeueDispatch(dispatchId, action, storeName, index);
        },
        rejectDispatch(err) {
          this._rejectTrackerFor(dispatchId, err);
        },
        pauseError: PAUSE_ERROR
      }),
      createDispatchMiddleware((storeName, state, nextAction) => {
          this._setStoreState(storeName, state);

          return this.dispatch(nextAction);
      })
    ]);
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
      this._subscribers = this._subscribers.set(storeName, currSubscribers.delete(subscriber));

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

  /* Async Tracker methods */
  _createTrackerPromise(dispatchId: string): Promise<Dispatcher> {
    const { tracker, promise } = this._asyncTracker.waitFor(dispatchId);
    this._asyncTracker = tracker;

    return promise;
  }

  _resolveTrackerFor(dispatchId: string) {
    this._asyncTracker = this._asyncTracker.resolveFor(dispatchId, this);
  }

  _rejectTrackerFor(dispatchId: string, err: Error) {
    this._asyncTracker = this._asyncTracker.rejectFor(dispatchId, err);
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
