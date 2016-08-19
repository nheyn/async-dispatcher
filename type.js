declare module 'async-dispatcher' {
  declare export type ActionData = {[key: string]: ActionData} | Array<ActionData> | string | number | bool;
  declare export type Action = {[key: string]: ?ActionData};

  declare export type Subscriber<S> = (state: S) => void;
  declare export type UnsubscibeFunc = () => void;

  declare export type Plugins = Object;
  declare export type Updater<S> = (state: S, action: Action, plugins: Plugins) => S | Promise<S>;
  declare export type NextUpdater<S> = (state: S, action: Action, plugins: Plugins) => Promise<S>;
  declare export type Middleware<S> = (state: S, action: Action, plugins: Plugins, next: NextUpdater<S>) => Promise<S>;
  declare export type MergeStoreFunc<S> = (currState: S, newState: S, action: Action) => S | Promise<S>;

  declare export type StoreSpec<S> = {
    initialState: S,
    updaters: Array<Updater<S>>,
    middleware?: Array<Middleware<S>>,
    merge?: MergeStoreFunc<S>,
  };
  declare export interface Store<S> {
    dispatch(action: Action): Promise<Store<S>>;
    getStore(): S;
  }
  declare export function createStore<S>(spec: StoreSpec<S>): Store<S>;

  declare export interface Dispatcher {
    dispatch(action: Action): Promise<Dispatcher>;
    getStateFor(storeName: string): any;
    subscribeTo(storeName: string, subscriber: Subscriber<any>): UnsubscibeFunc;
  }
  declare export function createDispatcher(
    initialStores: {[key: string]: Store<any> | Updater<any> | Object }
  ): Dispatcher;
}
