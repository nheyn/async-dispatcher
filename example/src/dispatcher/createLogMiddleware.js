/**
 * @flow
 */
import type { Middleware } from 'async-dispatcher';

export default function createLogMiddleware<S>(m: string): Middleware<S> {
  return (state, action, plugins, next) => {
    console.log(m, { state, action });

    return next(state, action, plugins);
  };
}