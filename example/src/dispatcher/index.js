/*
 * @flow
 */
import { createDispatcher } from 'async-dispatcher';

import listItems from './listItems';

import type { Dispatcher } from 'async-dispatcher';

export function createTodoDispatcher(): Dispatcher {
  return createDispatcher({
    listItems
  });
}