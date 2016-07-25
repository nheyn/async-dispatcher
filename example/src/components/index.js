/*
 * @flow
 */
import React from 'react';

import ItemList from './ItemList';
import { NEW_ITEM_UPDATE } from '../dispatcher/';
import { LIST_ITEM_ADD } from '../dispatcher/listItems/addItem';
import { LIST_ITEM_CHECK, LIST_ITEM_UNCHECK } from '../dispatcher/listItems/checkItem';

import type { Action, Dispatcher } from 'async-dispatcher';

type State = {
  items: Array<{
    id: number,
    label: string,
    isChecked: bool
  }>,
  newItem: string,
  basicInfo: {
    title: string,
  },
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
      items: props.dispatcher.getStateFor('listItems'),
      newItem: props.dispatcher.getStateFor('newItem'),
      basicInfo: props.dispatcher.getStateFor('basicInfo'),
    };
  }

  componentDidMount() {
    const { dispatcher } = this.props;

    dispatcher.subscribeTo('listItems', (items) => {
      this.setState({ items });
    });
    dispatcher.subscribeTo('newItem', (newItem) => {
      this.setState({ newItem });
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

  onUpdateNewItem(label: string) {
    this.dispatch({
      type: NEW_ITEM_UPDATE,
      label
    })
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
    const { items, newItem, basicInfo: { title }} = this.state;

    return (
      <div>
        <h2>{title}</h2>
        <ItemList
          items={items}
          newItem={newItem}
          onCheck={(id) => this.onCheck(id)}
          onUncheck={(id) => this.onUncheck(id)}
          onUpdateNewItem={(updateNewItem) => this.onUpdateNewItem(updateNewItem)}
          onAddItem={() => this.onAddItem(newItem)}
        />
      </div>
    );
  }
}
