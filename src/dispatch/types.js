/* @flow */
import type Immutable from 'immutable';
import type { Action, Middleware, Updater } from 'async-dispatcher';
import type Store from '../Store';
import type { PausePoint } from '../middleware';

export type UpdaterList<S> = Immutable.List<Updater<S>>;
export type MiddlewareList<S> = Immutable.List<Middleware<S>>;
export type StoresMap = Immutable.Map<string, Store<any>>;
export type PausePointMap = Immutable.Map<string, PausePoint>;

export type UpdateStoresFunc = (stores: StoresMap) => StoresMap | Promise<StoresMap>;
export type DispatcherDispatch = (action: Action) => Promise<StoresMap>;
export type StoreDispatch<S> = (state: S, action: Action, middleware: MiddlewareList<S>) => Promise<S>;

