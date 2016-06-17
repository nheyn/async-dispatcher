/*
 * @flow
 */
import { createDispatcher } from 'async-dispatcher';

import type { Dispatcher } from 'async-dispatcher';

export function createTodoDispatcher(): Dispatcher {
  return createDispatcher({});
}