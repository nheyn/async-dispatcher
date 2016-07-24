/* @flow */
import type { ListItemState as Item } from './index';

export default function updateArrayItem(id: number, items: Array<Item>, update: (item: Item) => Item): Array<Item> {
  const item = lookupItem(id, items);
  if(!item) return items;

  const updatedItem = update(item);

  const updatedItems = replaceItem(id, items, updatedItem);
  if(!updatedItems) return items;

  return updatedItems;
}

function lookupItem(id: number, items: Array<Item>): ?Item {
  for(let i=0; i<items.length; i++) {
    const item = items[i];

    if(item.id === id) return item;
  }
  return null;
}

function replaceItem(id: number, items: Array<Item>, item: Item): ?Array<Item> {
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