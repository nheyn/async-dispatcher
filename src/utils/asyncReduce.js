/*
 * @flow
 */
import type Immutable from 'immutable';

type AsyncReducer<V, R> = (reduction: R, value: V, index: number) => R | Promise<R>;

export default function asyncReduce<V, R>(
    list: Immutable.List<V>,
    reducer: AsyncReducer<V, R>,
    initialReduction: R | Promise<R>
):  Promise<R> {
  return list.reduce((reductionPromise, value, index) => {
    return reductionPromise.then((reduction) => {
      return Promise.resolve(
        reducer(reduction, value, index)
      );
    });
  }, Promise.resolve(initialReduction));
}