/**
 * @flow
 */
import type { Middleware } from 'async-dispatcher';

export default function createLogMiddleware<S>(m: string): Middleware<S> {
  return (state, action, plugins, next) => {
    if(plugins.getUpdaterIndex() === 0) {
      console.log('<----', m, { action, state }, '---->');
    }
    return next(state, action, plugins).then((updatedState) => {
      if(plugins.getUpdaterIndex() === plugins.getUpdaterCount() - 1) {
        console.log('</---', m, { action, state: updatedState }, '---->');
      }

      return updatedState;
    });
  };
}