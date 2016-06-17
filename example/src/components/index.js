/*
 * @flow
 */
import React from 'react';

export default function TodoList({ dispatcher }: Object): React.Element {
  const listItems = dispatcher.getStateFor('listItems');

  return (
    <div>
      <h2>Todo List</h2>
      <ul>
      {listItems.map(({ id, label, isChecked }) =>
        <li key={id}>
          <input type="checkbox" checked={isChecked} onChange={() => console.log('NYI')} />
          <label>{label}</label>
        </li>
      )}
      </ul>
    </div>
  );
}