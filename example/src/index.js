/*
 * @flow
 */
import React from 'react';
import ReactDOM from 'react-dom';

import TodoList from './components';
import { createTodoDispatcher } from './dispatcher';

/**
 * Render the TodoList to the page
 */
function renderTodoListApp() {
  ReactDOM.render(
    <TodoList dispatcher={createTodoDispatcher()} />,
    window.document.getElementById('todo-list')
  );
}

window.onload = renderTodoListApp;
window.React = React;
