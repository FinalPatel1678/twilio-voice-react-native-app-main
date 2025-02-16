import {
  configureStore,
  type Middleware,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import { voiceReducer } from './voice';
import { createLogMiddleware } from './middleware/log';

const initialState = {
  isBootstrapping: true,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setBootstrapping: (state, action: PayloadAction<boolean>) => {
      state.isBootstrapping = action.payload;
    },
  },
});

export const { setBootstrapping } = appSlice.actions;

export const defaultReducer = {
  voice: voiceReducer,
  app: appSlice.reducer,
};

export const createStore = (...middlewares: Middleware[]) => {
  const store = configureStore({
    reducer: defaultReducer,
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(...middlewares);
    },
  });

  return store;
};

export const defaultStore = createStore(createLogMiddleware());

export type Store = ReturnType<typeof createStore>;

export type State = ReturnType<Store['getState']> & {
  isBootstrapping: boolean;
};

export type Dispatch = Store['dispatch'];

export type AsyncStoreSlice<R = {}, S = {}, T = {}, U = {}> =
  | ({ status: 'fulfilled' } & R)
  | ({ status: 'rejected' } & S)
  | ({ status: 'pending' } & T)
  | ({ status: 'idle' } & U);
