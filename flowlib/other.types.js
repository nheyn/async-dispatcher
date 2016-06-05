type MaybePromise<T> = Promise<T> | T;

type Action = {[key: string]: ActionData};
type ActionData = {[key: string]: ActionData} | Array<ActionData> | string | number | bool;

type Updater<S> = (state: S, action: Action) => MaybePromise<S>;
type DispatchSettings<S> = {
  replaceState?: S,
  skip?: number
};

type StoresMap = Immutable.Map<string, Store<any>>;
type StatesObject = {[key: string]: any};
type StoreUpdateSpec<S> = {
  storeName: string,
  store: Store<S>,
  action: Action
};