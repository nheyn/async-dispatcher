declare module 'async-dispatcher' {
  declare type ActionData = {[key: string]: ActionData} | Array<ActionData> | string | number | bool;
  declare type Action = {[key: string]: ActionData};

  declare type Subscriber<S> = (state: S) => void;
  declare type UnsubscibeFunc = () => void;

  declare type Updater<S> = (state: S, action: Action) => S | Promise<S>;
  declare type NextUpdater<S> = (state: S, action: Action) => Promise<S>;
  declare type Middleware<S> = (state: S, action: Action, next: NextUpdater<S>) => Promise<S>;

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
  declare function createDispatcher(initialStores: {[key: string]: Store<any>}): Dispatcher;
}