/*
 * @flow
 */
import type Immutable from 'immutable';

/**
 * Perform a dispatch.
 *
 * @param state   {any}             The initial state to send through the updaters
 * @param action  {Action}          The action to pass to the updaters
 * @param updater {List<Updaters>}  The updaters to call
 *
 * @return        {Promise<any>}    The updated state in a Promise
 */
export default function dispatch<S>(state: S, action: Action, updaters: Immutable.List<Updater<S>>): Promise<S> {
  return updaters.reduce((currStatePromise, updater, index) => {
    return currStatePromise.then((state) => {
      // Call updater
      const newState = updater(state, action);

      return Promise.resolve(newState);
    });
  }, Promise.resolve(state));
}