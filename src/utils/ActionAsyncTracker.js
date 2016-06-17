/*
 * @flow
 */
import Immutable from 'immutable';

type PromiseFuncs = { resolve: (state: any) => void, reject: (err: Error) => void };
type PromiseFuncsMap = Immutable.Map<Action, PromiseFuncs>;

export default class ActionAsyncTracker<T> {
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