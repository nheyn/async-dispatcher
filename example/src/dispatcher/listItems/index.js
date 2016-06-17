/*
 * @flow
 */
import { createStore } from 'async-dispatcher';

export default createStore({
  initialState: [
    { id: 0, label: 'Item 0', isChecked: false },
    { id: 1, label: 'Item 1', isChecked: true },
    { id: 2, label: 'Item 2', isChecked: false },
  ],
  updaters: []
})