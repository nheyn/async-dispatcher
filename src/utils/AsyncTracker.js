/*
 * @flow
 */
import Immutable from 'immutable';

import type { Action } from 'async-dispatcher';

type PromiseFuncs<V> = { resolve: (val: V) => void, reject: (err: Error) => void };

/**
 * A tracker for resolving/rejecting promises after they are created.
 *
 * NOTE: Needed to resolve/reject outside the Promise's constructor
 */
export default class AsyncTracker<K, V> {
  _promiseFuncs: Immutable.Map<K, PromiseFuncs<V>>;

  constructor(initialPromiseFuncs: Immutable.Map<K, PromiseFuncs<V>>) {
    this._promiseFuncs = initialPromiseFuncs;
  }

  static createAsyncTracker(): AsyncTracker {
    return new AsyncTracker(Immutable.Map());
  }

  waitFor(key: K): { promise: Promise<V>, tracker: AsyncTracker } {
    if(this._promiseFuncs.has(key))  throw new Error('Promise for key has already been return');

    let resolve = null;
    let reject = null;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    if(!resolve || !reject) throw new Error('Invalid Promise implementation, constructor executor func should be sync');

    const newPromiseFuncs = this._promiseFuncs.set(key, { resolve, reject });
    const tracker = new AsyncTracker(newPromiseFuncs);

    return { promise, tracker };
  }

  resolveFor(key: K, val: V): AsyncTracker {
    const { funcs: { resolve }, tracker } = this._getAndDeletePromiseFuncs(key);

    resolve(val);

    return tracker;
  }

  rejectFor(key: K, err: Error): AsyncTracker {
    const { funcs: { reject }, tracker } = this._getAndDeletePromiseFuncs(key);

    reject(err);

    return tracker;
  }

  _getAndDeletePromiseFuncs(key: K): { funcs: PromiseFuncs, tracker: AsyncTracker } {
    if(!this._promiseFuncs.has(key))  throw new Error('Invalid key');

    const funcs = this._promiseFuncs.get(key);
    const newPromiseFuncs = this._promiseFuncs.delete(key);

    const tracker = new AsyncTracker(newPromiseFuncs);

    return { funcs, tracker };
  }
}