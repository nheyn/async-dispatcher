/*
 * @flow
 */
import Dispatcher from './Dispatcher';
import Store from './Store';

import type { StoreSpec } from './Store';

/**
 * See static method Dispatcher.createDispatcher(...)
 */
export function createDispatcher(initialStores: {[key: string]: Store<any>}): Dispatcher {
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