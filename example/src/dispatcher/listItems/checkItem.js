/*
 * @flow
 */
import { LIST_ITEM_UPDATE } from './updateItem';
import updateArrayItem from './updateArrayItem';

import type { ListItemState as Item } from './index';

type Action = {
  type: string,
  id: number
};

export const LIST_ITEM_CHECK = 'LIST_ITEM_CHECK';
export const LIST_ITEM_UNCHECK = 'LIST_ITEM_UNCHECK';

export default function checkItem(state: Array<Item>, action: Action, { dispatch }: Object): Array<Item> {
  if(action.type !== LIST_ITEM_CHECK && action.type !== LIST_ITEM_UNCHECK) return state;
  if(typeof action.id !== 'number') throw new Error(`listItems ${action.type} requires a numeric id`);
  const { type, id } = action;

  let updatedLabel = null;
  const updatedState = updateArrayItem(id, state, (item) => {
    updatedLabel = `${item.label} - DONE`;

    // Check item
    let newItem = { ...item };
    newItem.isChecked = shouldBeChecked(type);

    return newItem;
  });

  // Update label (for testing dispatch)
  return dispatch(updatedState, { type: LIST_ITEM_UPDATE, id: action.id, label: updatedLabel });
}

// Helper functions
function shouldBeChecked(actionType: string): bool {
  if(actionType === LIST_ITEM_CHECK)    return true;
  if(actionType === LIST_ITEM_UNCHECK)  return false;

  throw new Error(`Invalid action type ${actionType}`);
}