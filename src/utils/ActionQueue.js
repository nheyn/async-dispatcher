/*
 * @flow
 */
import Immutable from 'immutable';

import type { Action } from 'async-dispatcher';

type ActionList = Immutable.List<Action>;

/**
 * An immutable queue of actions.
 */
export default class ActionQueue {
  _actions: ActionList;

  constructor(initialActions: ActionList) {
    this._actions = initialActions;
  }

  static createActionQueue(): ActionQueue {
    return new ActionQueue(Immutable.List());
  }

  isEmpty(): bool {
    return this._actions.isEmpty();
  }

  enqueue(action: Action): ActionQueue {
    const newActions = this._actions.push(action);

    return new ActionQueue(newActions);
  }

  dequeue(): { action: Action, queue: ActionQueue } {
    if(this._actions.count() === 0) throw new Error('Cannot dequeue an action when the actions queue is empty');

    const action = this._actions.first();
    const newActions = this._actions.shift();

    const queue = new ActionQueue(newActions);

    return { action, queue };
  }
}

/**
 * See static method ActionQueue.createActionQueue()
 */
export function createActionQueue(): ActionQueue {
  return ActionQueue.createActionQueue();
}