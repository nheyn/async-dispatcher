/*
 * @flow
 */
import type { Action } from 'async-dispatcher';
import type { ListItemState } from './index';

export const LIST_ITEM_ADD = 'LIST_ITEM_ADD';

export default function addItem(
  state: Array<ListItemState>,
  action: Action,
  { dispatch }: Object
): Array<ListItemState> {
  if(action.type !== LIST_ITEM_ADD) return state;
  if(!action.label || typeof action.label !== 'string') {
    throw new Error(`listItem updater, ${LIST_ITEM_ADD}, requires a label that is a string`);
  }

  return [
    ...state,
    { id: state.length, label: action.label, isChecked: false }
  ];
}