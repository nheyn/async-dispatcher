/*
 * @flow
 */
import { createDispatcher } from 'async-dispatcher';

import listItems from './listItems';
import { LIST_ITEM_ADD } from './listItems/addItem';

import type { Dispatcher } from 'async-dispatcher';

export const NEW_ITEM_UPDATE = 'NEW_ITEM_UPDATE';

export function createTodoDispatcher(): Dispatcher {
  return createDispatcher({
    listItems,
    basicInfo: {
      title: 'Todo List',
    },
    newItem(state = '', action) {
      if(action.type === LIST_ITEM_ADD)     return '';
      if(action.type !== NEW_ITEM_UPDATE)   return state;
      if(typeof action.label !== 'string')  return state;

      return action.label;
    },
  });
}