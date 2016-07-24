/**
 * @flow
 */
import Immutable from 'immutable';

type PromiseFunc<I, F> = {
  thenFunc?: (value: I) => F | Promise<F>,
  catchFunc?: (err: Error) => F | Promise<F>
};

/**
 * Place holder for promises used after a pause is called.
 *
 * ERROR: then of middleware not called (might be caused by this, or middleware order???)
 */
export default class PausePromise {
  isPausePromise: bool;
  _promise: Promise<any>;
  _promiseFuncs: Immutable.List<PromiseFunc<any, any>>;

  constructor(promise: Promise<any>, promiseFuncs: Immutable.List<PromiseFunc<any, any>>) {
    this.isPausePromise = true;

    this._promise = promise;
    this._promiseFuncs = promiseFuncs;
  }

  static createPausePromise(promise: Promise<any>): PausePromise {
    return new PausePromise(promise, Immutable.List());
  }

  static isPausePromise(maybePausePromise: any): bool {
    return maybePausePromise && maybePausePromise.isPausePromise? true: false;
  }

  waitFor(): Promise<any> {
    return this._promiseFuncs.reduce((currPromise, { thenFunc, catchFunc }) => {
      return currPromise.then(thenFunc, catchFunc);
    }, this._promise);
  }

  then(thenFunc: (value: any) => any, catchFunc?: (err: Error) => any): PausePromise {
    return new PausePromise(
      this._promise,
      this._promiseFuncs.push({ thenFunc, catchFunc })
    );
  }

  catch(catchFunc: (value: any) => any): PausePromise {
    return new PausePromise(
      this._promise,
      this._promiseFuncs.push({ catchFunc })
    );
  }
}