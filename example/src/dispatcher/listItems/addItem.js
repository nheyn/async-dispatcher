/*
 * @flow
 */
import type { Action } from 'async-dispatcher';
import type { ListItemState as Item } from './index';

export const LIST_ITEM_ADD = 'LIST_ITEM_ADD';

export default function addItem(
  state: Array<Item>,
  action: Action,
  { pause }: Object
): Promise<Array<Item>> | Array<Item> {
  if(action.type !== LIST_ITEM_ADD) return state;
  if(!action.label || typeof action.label !== 'string') {
    throw new Error(`listItem updater, ${LIST_ITEM_ADD}, requires a label that is a string`);
  }

  const updatedStatePromise = asyncAddItem(state, action.label);

  return pause(updatedStatePromise);
}

function asyncAddItem(state: Array<Item>, label: string): Promise<Array<Item>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        ...state,
        { id: state.length, label, isChecked: false }
      ]);
    }, 5000);
  });
}