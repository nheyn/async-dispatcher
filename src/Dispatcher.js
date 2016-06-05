/*
 * @flow
 */
import Immutable from 'immutable';
import Kefir from 'kefir';

import type Store from './Store';

type StoresMap = Immutable.Map<string, Store<any>>;
type StoreUpdateSpec<S> = {
  storeName: string,
  store: Store<S>,
  action: Action
};

/**
 * A class that contains a group of stores that should all recive the same actions.
 */
export default class Dispatcher {
  _stores: StoresMap;
  _onDispatch: (action: Action) => void;
  _onUpdate: (stores: StoresMap) => void;
  _updateStream: Kefir.Stream<StoreUpdateSpec>;
  _subscribers: Immutable.Map<string, Immutable.Set<Subscriber>>;

  /**
   * Constructor for the Dispatcher.
   */
  constructor(initialStores: StoresMap) {
    this._stores = initialStores;

    this._onDispatch =  () => { throw new Error('Dispatch called before initiation finished'); };
    this._onUpdate =    () => { throw new Error('onUpdate called before initiation finished'); };

    this._updateStream = this._createUpdateStream(initialStores);

    this._subscribers = initialStores.map(() => Immutable.Set());
  }

  /**
   * Dispatch the given action to all of the stores.
   *
   * @param action  {Object}          The action to dispatch
   *
   * @return      {Promise<{string: any}>}  The states after the dispatch is finished
   */
  dispatch(action: Action): Promise<Dispatcher> {
    this._onDispatch(action);

    // Combine store updates for current action
    return this._updateStream
                .filter(({ action: currAction }) => action === currAction)
                .take(this._stores.count())
                .scan((stores, { storeName, store }) => stores.set(storeName, store), Immutable.Map())
                .last() // Make sure map is only called with the final value
                .map((stores) => {
                  this._onUpdate(stores);
                  this._stores = stores;

                  return this;
                })
                .toPromise();
  }

  /**
   * Gets the state from the given store of the Stores.
   *
   * @param storeName {string}  The name of the store to get the state of
   *
   * @return      {any}   The state of the given store
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
   * @param storeName {string}      The store to subscribe to
   * @param subscriber {(any) => void}  The function to call, with the state, after each
   *                    dispatch
   *
   * @return      {() => void}    The function to call to unsubscibe
   */
  subscribeTo(storeName: string, subscriber: Subscriber): UnsubscibeFunc {
    // Check inputs
    if(typeof storeName !== 'string') throw new Error('Cannot subscribe: store name must be a string');
    if(!this._subscribers.has(storeName)) {
      throw new Error('Cannot subscribe: store(${storeName}) dose not exist');
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

  _createUpdateStream(storesMap: StoresMap): Kefir.Stream<StoreUpdateSpec> {
    // Get actions
    const actionStream = Kefir.stream((emitter) => {
      this._onDispatch = (action) => {
        emitter.emit(action);
      };
    });

    // Get stores
    const storesStream = Kefir.concat([
      Kefir.constant(this._stores),
      Kefir.stream((emitter) => {
        this._onUpdate = (stores) => {
          emitter.emit(stores);
        };
      })
    ]);

    // Perform actions
    return actionStream.flatMapConcat((action) => {
      let newStoresStreams = [];
      this._stores.forEach((store, storeName) => {
        // Call dispatch(...)
        const storePromise = store.dispatch(action);

        // Include data about current dispatch in stream
        newStoresStreams.push(Kefir.fromPromise(storePromise).map((store) => {
          return { storeName, store, action };
        }));
      });

      return Kefir.merge(newStoresStreams);   //TODO, find way to close when dispatch is done
    });
  }
}
