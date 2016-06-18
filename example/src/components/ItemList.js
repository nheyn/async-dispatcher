/*
 * @flow
 */
import React from 'react';

import Item from './Item';
import NewItem from './NewItem';

import type { Action } from 'async-dispatcher';

type Props = {
  items: Array<{
    id: number,
    label: string,
    isChecked: bool
  }>,
  onCheck: (id: number) => void,
  onUncheck: (id: number) => void,
  onAddItem: (label: string) => void,
};

export default function ItemList({ items, onCheck, onUncheck, onAddItem }: Props): React.Element {
  return (
    <ul>
    {items.map(({ id, label, isChecked }) =>
      <li key={id}>
        <Item label={label} isChecked={isChecked} onCheckClicked={() => isChecked? onUncheck(id): onCheck(id)} />
      </li>
    )}
      <li>
        <NewItem onAddItem={onAddItem} />
      </li>
    </ul>
  );
}

