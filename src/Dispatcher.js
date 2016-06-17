/*
 * @flow
 */
import Immutable from 'immutable';

import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type SubscriberMap = Immutable.Map<string, Immutable.Set<Subscriber>>;
type ActionList = Immutable.List<Action>;
type PromiseFuncs = { resolve: (state: any) => void, reject: (err: Error) => void };
type PromiseFuncsMap = Immutable.Map<Action, PromiseFuncs>;

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

    if(!this._actions.isEmpty()) this._dispatchFromQueue();
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
    const shouldStartDispatcher = this._actions.isEmpty();

    // Enqueue given action
    this._actions = this._actions.enqueue(action);

    // Start dispatch if needed
    if(shouldStartDispatcher) this._dispatchFromQueue();

    // Return a promise that resolves when the given promise is called
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

  _dispatchFromQueue() {
    // Dequeue action
    const { action, queue } = this._actions.dequeue();
    this._actions = queue;

    // Call dispatch on each store
    const newStoresPromise = mapOfPromisesToMapPromise(this._stores.map((store) => {
      return store.dispatch(action);
    }));

    // Handle results of dispatch
    newStoresPromise.then((newStores) => {
      this._setStores(newStores);

      this._actionAsyncTracker.resolveForAction(action, this);
    }).catch((err) => {
      this._actionAsyncTracker.rejectForAction(action, err);
    }).then(() => {
      // Start next dispatch if there are actions left in the queue
      if(!this._actions.isEmpty()) this._dispatchFromQueue();
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
}

/**
 * See static method Dispatcher.createDispatcher(...)
 */
export function createDispatcher(initialStores: {[key: string]: Store<any>}): Dispatcher {
  return Dispatcher.createDispatcher(initialStores);
}

// Helper classes/funcs
class ActionQueue {
  _actions: ActionList;

  constructor(initialActions: ActionList) {
    this._actions = initialActions;
  }

  static createActionQueue(): ActionQueue {
    return new ActionQueue(Immutable.List());
  }

  isEmpty(): bool {
    return this._actions.isEmpty();
  }

  enqueue(action: Action): ActionQueue {
    const newActions = this._actions.push(action);

    return new ActionQueue(newActions);
  }

  dequeue(): { action: Action, queue: ActionQueue } {
    if(this._actions.count() === 0) throw new Error('Cannot dequeue an action when the actions queue is empty');

    const action = this._actions.first();
    const newActions = this._actions.shift();

    const queue = new ActionQueue(newActions);

    return { action, queue };
  }
}

class ActionAsyncTracker<T> {
  _promiseFuncs: PromiseFuncsMap;

  constructor(initialPromiseFuncs: PromiseFuncsMap) {
    this._promiseFuncs = initialPromiseFuncs;
  }

  static createActionAsyncTracker(): ActionAsyncTracker {
    return new ActionAsyncTracker(Immutable.Map());
  }

  waitForAction(action: Action): { promise: Promise<T>, tracker: ActionAsyncTracker } {
    if(this._promiseFuncs.has(action))  throw new Error('Promise for action has already been return');

    let resolve = null;
    let reject = null;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    if(!resolve || !reject) throw new Error('Invalid Promise implementation, constructor executor func should be sync');

    const newPromiseFuncs = this._promiseFuncs.set(action, { resolve, reject });
    const tracker = new ActionAsyncTracker(newPromiseFuncs);

    return { promise, tracker };
  }

  resolveForAction(action: Action, val: T): ActionAsyncTracker {
    const { funcs: { resolve }, tracker } = this._getAndDeletePromiseFuncs(action);

    resolve(val);

    return tracker;
  }

  rejectForAction(action: Action, err: Error): ActionAsyncTracker {
    const { funcs: { reject }, tracker } = this._getAndDeletePromiseFuncs(action);

    reject(err);

    return tracker;
  }

  _getAndDeletePromiseFuncs(action: Action): { funcs: PromiseFuncs, tracker: ActionAsyncTracker } {
    if(!this._promiseFuncs.has(action))  throw new Error('Invalid action');

    const funcs = this._promiseFuncs.get(action);
    const newPromiseFuncs = this._promiseFuncs.delete(action);

    const tracker = new ActionAsyncTracker(newPromiseFuncs);

    return { funcs, tracker };
  }
}

function mapOfPromisesToMapPromise<T>(promises: Immutable.Map<string, Promise<T>>): Promise<Immutable.Map<string, T>> {
  let keys = [];
  let promiseArray = [];
  const storePromisesObject = promises.toObject()
  for(let storeName in storePromisesObject) {
    const storePromise = storePromisesObject[storeName];

    keys.push(storeName);
    promiseArray.push(storePromise);
  }

  return Promise.all(promiseArray).then((storeArray) => {
    let storesObject = {};
    keys.forEach((storeName, i) => {
      storesObject[storeName] = storeArray[i];
    });

    return Immutable.Map(storesObject);
  });
}
