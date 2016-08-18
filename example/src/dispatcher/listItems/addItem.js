/*
 * @flow
 */
import type { Action } from 'async-dispatcher';
import type { ListItemState } from './index';

export const LIST_ITEM_ADD = 'LIST_ITEM_ADD';

export default function addItem(
  state: Array<ListItemState>,
  action: Action,
  { pause }: Object
): Promise<Array<ListItemState>> | Array<ListItemState> {
  if(action.type !== LIST_ITEM_ADD) return state;
  if(!action.label || typeof action.label !== 'string') {
    throw new Error(`listItem updater, ${LIST_ITEM_ADD}, requires a label that is a string`);
  }

  const updatedStatePromise = asyncAddItem(state, action.label);

  return pause(updatedStatePromise);
}

function asyncAddItem(state: Array<ListItemState>, label: string): Promise<Array<ListItemState>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        ...state,
        { id: state.length, label, isChecked: false }
      ]);
    }, 5000);
  });
}