declare module 'async-dispatcher' {
  declare type ActionData = {[key: string]: ActionData} | Array<ActionData> | string | number | bool;
  declare type Action = {[key: string]: ActionData};

  declare type Subscriber<S> = (state: S) => void;
  declare type UnsubscibeFunc = () => void;

  declare type Plugins = Object;
  declare type Updater<S> = (state: S, action: Action, plugins: Plugins) => S | Promise<S>;
  declare type NextUpdater<S> = (state: S, action: Action, plugins: Plugins) => Promise<S>;
  declare type Middleware<S> = (state: S, action: Action, plugins: Plugins, next: NextUpdater<S>) => Promise<S>;

  declare type StoreSpec<S> = {
    initialState: S,
    updaters: Array<Updater<S>>,
    middleware?: Array<Middleware<S>>
  };
  declare interface Store<S> {
    dispatch(action: Action): Promise<Store<S>>;
    getStore(): S;
  }
  declare function createStore<S>(spec: StoreSpec<S>): Store<S>;

  declare interface Dispatcher {
    dispatch(action: Action): Promise<Dispatcher>;
    getStateFor(storeName: string): any;
    subscribeTo(storeName: string, subscriber: Subscriber<any>): UnsubscibeFunc;
  }
  declare function createDispatcher(initialStores: {[key: string]: Store<any> | Updater<any> | Object }): Dispatcher;
}

declare module 'node-uuid' {
  declare function v1(): string;
  declare function v4(): string;
}