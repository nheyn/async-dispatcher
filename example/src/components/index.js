/*
 * @flow
 */
import React from 'react';

import ItemList from './ItemList';
import { LIST_ITEM_ADD } from '../dispatcher/listItems/addItem';
import { LIST_ITEM_CHECK, LIST_ITEM_UNCHECK } from '../dispatcher/listItems/checkItem';

import type { Action, Dispatcher } from 'async-dispatcher';

type State = {
  items: Array<{
    id: number,
    label: string,
    isChecked: bool
  }>
};

type Props = {
  dispatcher: Dispatcher
};

export default class TodoList extends React.Component {
  state: State;
  props: Props;

  constructor(props: Props, context: any) {
    super(props, context);

    this.state = {
      items: props.dispatcher.getStateFor('listItems')
    };
  }

  componentDidMount() {
    const { dispatcher } = this.props;

    dispatcher.subscribeTo('listItems', (items) => {
      this.setState({ items });
    });
  }

  onCheck(id: number) {
    this.dispatch({
      type: LIST_ITEM_CHECK,
      id
    });
  }

  onUncheck(id: number) {
    this.dispatch({
      type: LIST_ITEM_UNCHECK,
      id
    });
  }

  onAddItem(label: string) {
    this.dispatch({
      type: LIST_ITEM_ADD,
      label
    });
  }

  dispatch(action: Action) {
    const { dispatcher } = this.props;

    dispatcher.dispatch(action).then(() => {
      console.log('finished action:', action);
    }).catch((err) => {
      console.error('error during action', action, err);
    });
  }

  render(): React.Element {
    const { items } = this.state;

    return (
      <div>
        <h2>Todo List</h2>
        <ItemList
          items={items}
          onCheck={(id) => this.onCheck(id)}
          onUncheck={(id) => this.onUncheck(id)}
          onAddItem={(label) => this.onAddItem(label)}
        />
      </div>
    );
  }
}
