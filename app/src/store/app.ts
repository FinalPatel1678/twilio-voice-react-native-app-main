import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { voiceReducer } from './voice';
import { createLogMiddleware } from './middleware/log';
import { bootstrapPhoneNumbersAndToken } from './bootstrap';

export const defaultReducer = {
  voice: voiceReducer,
};

export const createStore = (...middlewares: Middleware[]) => {
  const store = configureStore({
    reducer: defaultReducer,
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(...middlewares);
    },
  });

  store.dispatch(bootstrapPhoneNumbersAndToken());

  return store;
};

export const defaultStore = createStore(createLogMiddleware());

export type Store = ReturnType<typeof createStore>;

export type State = ReturnType<Store['getState']>;

export type Dispatch = Store['dispatch'];

export type AsyncStoreSlice<R = {}, S = {}, T = {}, U = {}> =
  | ({ status: 'fulfilled' } & R)
  | ({ status: 'rejected' } & S)
  | ({ status: 'pending' } & T)
  | ({ status: 'idle' } & U);
