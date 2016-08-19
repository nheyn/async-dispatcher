/*
 * @flow
 */
import updateArrayItem from './updateArrayItem';

import type { Action } from 'async-dispatcher';
import type { ListItemState as Item } from './index';

export const LIST_ITEM_UPDATE = 'LIST_ITEM_UPDATE';

export default function updateItem(state: Array<Item>, action: Action): Array<Item> {
  if(action.type !== LIST_ITEM_UPDATE) return state;
  if(typeof action.id !== 'number') {
    throw new Error(`listItem updater, ${LIST_ITEM_UPDATE}, requires a id that is a number`);
  }
  if(!action.label || typeof action.label !== 'string') {
    throw new Error(`listItem updater, ${LIST_ITEM_UPDATE}, requires a label that is a string`);
  }
  const { id, label } = action;

  // Update item
  return updateArrayItem(id, state, (item) => {
    return {
      ...item,
      label: label
    };
  });
}