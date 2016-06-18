/*
 * @flow
 */
import Immutable from 'immutable';

/**
 * An immutable queue.
 */
export default class Queue<E> {
  _elements: Immutable.List<E>;

  constructor(initialActions: Immutable.List<E>) {
    this._elements = initialActions;
  }

  static createQueue(): Queue<E> {
    return new Queue(Immutable.List());
  }

  isEmpty(): bool {
    return this._elements.isEmpty();
  }

  enqueue(element: E): Queue<E> {
    const newElements = this._elements.push(element);

    return new Queue(newElements);
  }

  dequeue(): { element: E, queue: Queue<E> } {
    if(this._elements.count() === 0) throw new Error('Cannot dequeue an action when the actions queue is empty');

    const element = this._elements.first();
    const newElements = this._elements.shift();

    const queue = new Queue(newElements);

    return { element, queue };
  }
}
