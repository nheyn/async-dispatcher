/*
 * @flow
 */
import React from 'react';

type State = {
  label: string
};

type Props = {
  onAddItem: (label: string) => void
};

export default class NewItem extends React.Component {
  state: State;
  props: Props;

  constructor(props: Props, context: any) {
    super(props, context);

    this.state = {
      label: ''
    };
  }

  onAddClicked() {
    const { label } = this.state;
    const { onAddItem } = this.props;

    onAddItem(label);

    this.setState({ label: '' });
  }

  render(): React.Element {
    const { label } = this.state;

    return (
      <div>
        <input type="text" value={label} onChange={({ target }) => this.setState({ label: target.value })} />
        <button onClick={() => this.onAddClicked()}>Add</button>
      </div>
    );
  }
}