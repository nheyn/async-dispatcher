/*
 * @flow
 */
import type { Action } from 'async-dispatcher';
import type { ListItemsState } from './index.js';

export const LIST_ITEM_ADD = 'LIST_ITEM_ADD';

export default function addItem(state: Array<ListItemsState>, action: Action): Array<ListItemsState> {
  if(action.type !== LIST_ITEM_ADD) return state;
  if(!action.label || typeof action.label !== 'string') {
    throw new Error(`listItem updater, ${LIST_ITEM_ADD}, requires a label that is a string`);
  }

  return [
    ...state,
    { id: state.length, label: action.label, isChecked: false }
  ];
}