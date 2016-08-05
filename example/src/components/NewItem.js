/*
 * @flow
 */
import React from 'react';

type Props = {
  label: string,
  onUpdateNewItem: (label: string) => void,
  onAddItem: () => void,
};

export default function NewItem({ label, onUpdateNewItem, onAddItem }: Props): React.Element<*> {
  return (
    <div>
      <input type="text" value={label} onChange={({ target }) => onUpdateNewItem(target.value)} />
      <button onClick={() => onAddItem()}>Add</button>
    </div>
  );
}