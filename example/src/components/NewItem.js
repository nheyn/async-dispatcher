/*
 * @flow
 */
import React from 'react';

type Props = {
  label: string,
  onUpdateNewItem: (label: string) => void,
  onAddItem: () => void,
};

export default class NewItem extends React.Component {
  props: Props;

  onAddClicked() {
    const { label, onAddItem } = this.props;

    onAddItem(label);
  }

  render(): React.Element {
    const { label, onUpdateNewItem, onAddItem } = this.props;

    return (
      <div>
        <input type="text" value={label} onChange={({ target }) => onUpdateNewItem(target.value)} />
        <button onClick={() => onAddItem()}>Add</button>
      </div>
    );
  }
}