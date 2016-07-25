/*
 * @flow
 */
import Dispatcher from './Dispatcher';
import Store from './Store';

import type { StoreSpec, Updater } from 'async-dispatcher';

/**
 * See static method Dispatcher.createDispatcher(...)
 */
export function createDispatcher(initialStores: {[key: string]: Store<any> | Updater<any> | Object }): Dispatcher {
  return Dispatcher.createDispatcher(initialStores);
}

/**
 * See static method Store.createStore(...)
 */
export function createStore<S>(spec: StoreSpec<S>): Store<S> {
  return Store.createStore(spec);
}

export default {
  createDispatcher,
  createStore
};