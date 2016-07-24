/*
 * @flow
 */
import { createStore } from 'async-dispatcher';

import createLogMiddleware from '../createLogMiddleware';
import addItem from './addItem';
import checkItem from './checkItem';
import updateItem from './updateItem';

export type ListItemState = {
  id: number,
  label: string,
  isChecked: bool
};

const logMiddleware = createLogMiddleware('listItems');

export default createStore({
  initialState: [
    { id: 0, label: 'Item 0', isChecked: false },
    { id: 1, label: 'Item 1', isChecked: true },
    { id: 2, label: 'Item 2', isChecked: false },
  ],
  updaters: [
    addItem,
    checkItem,
    updateItem,
  ],
  middleware: [
    logMiddleware,
  ],
});