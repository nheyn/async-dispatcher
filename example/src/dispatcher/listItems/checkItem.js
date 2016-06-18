/*
 * @flow
 */
import type { ListItemState } from './index.js';

type Action = {
  type: string,
  id: number
};

export const LIST_ITEM_CHECK = 'LIST_ITEM_CHECK';
export const LIST_ITEM_UNCHECK = 'LIST_ITEM_UNCHECK';

export default function checkItem(state: Array<ListItemState>, action: Action): Array<ListItemState> {
  if(action.type !== LIST_ITEM_CHECK && action.type !== LIST_ITEM_UNCHECK) return state;
  if(typeof action.id !== 'number') throw new Error(`listItems ${action.type} requires a numeric id`);
  const { type, id } = action

  // Get item
  const item = lookupItem(id, state);
  if(!item) throw new Error(`listItems ${type} requires a valid id`);

  // Update item
  let newItem = { ...item };
  newItem.isChecked = shouldBeChecked(type);

  // Replace item
  const updatedState = replaceItem(id, state, newItem);
  if(!updatedState) throw new Error(`listItems ${type} requires a valid id`);

  return updatedState;
}

// Helper functions
function lookupItem(id: number, items: Array<ListItemState>): ?ListItemState {
  for(let i=0; i<items.length; i++) {
    const item = items[i];

    if(item.id === id) return item;
  }
  return null;
}

function replaceItem(id: number, items: Array<ListItemState>, item: ListItemState): ?Array<ListItemState> {
  let index = null;
  for(let i=0; i<items.length; i++) {
    const item = items[i];
    if(item.id === id) {
      index = i;
      break;
    }
  }
  if(index === null) return null;

  let newItems = [ ...items ];
  newItems[index] = item;

  return newItems;
}

function shouldBeChecked(actionType: string): bool {
  if(actionType === LIST_ITEM_CHECK)    return true;
  if(actionType === LIST_ITEM_UNCHECK)  return false;

  throw new Error(`Invalid action type ${actionType}`);
}