type MaybePromise<T> = Promise<T> | T;

type Action = {[key: string]: ActionData};
type ActionData = {[key: string]: ActionData} | Array<ActionData> | string | number | bool;

type Subscriber<S> = (state: S) => void;
type UnsubscibeFunc = () => void;
type Updater<S> = (state: S, action: Action) => MaybePromise<S>;
type DispatchSettings<S> = {
  replaceState?: S,
  skip?: number
};