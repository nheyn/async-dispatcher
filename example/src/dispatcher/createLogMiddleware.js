/**
 * @flow
 */
import type { Middleware } from 'async-dispatcher';

export default function createLogMiddleware<S>(m: string): Middleware<S> {
  return (state, action, next) => {
    console.log(m, { state, action });

    return next(state, action);
  };
}