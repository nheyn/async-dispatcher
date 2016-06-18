/*
 * @flow
 */
import type { Action } from 'async-dispatcher';
import type { ListItemsState } from './index.js';

export const LIST_ITEM_CHECK = 'LIST_ITEM_CHECK';
export const LIST_ITEM_UNCHECK = 'LIST_ITEM_CHECK';

export default function checkItem(state: Array<ListItemsState>, action: Action): Array<ListItemsState> {
  if(action.type !== LIST_ITEM_CHECK || action.type !== LIST_ITEM_UNCHECK) return state;
  if(!action.id || typeof action.id !== 'number') throw new Error(`listItems ${action.type} requires a numeric id`);

  // Lookup item
  let item = null;
  let itemIndex = null;
  for(let i=0; i<state.length; i++) {
    const currItem = state[i];

    if(currItem.id === action.id) {
      item = currItem;
      itemIndex = i;
      break;
    }
  }
  if(!item) throw new Error(`listItems ${action.type} requires a valid id`);

  // Update item
  const newItem = {
    ...item,
    { checkItem: action.type === LIST_ITEM_CHECK }
  };

  const newState = [ ...state ];
  newState[itemIndex] = newItem;

  return newState;
}