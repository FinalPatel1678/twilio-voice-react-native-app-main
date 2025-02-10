import { createTypedAsyncThunk, generateThunkActionTypes } from '../common';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const startAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/start');
export const pauseAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/pause');
export const resumeAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/resume');
export const resetAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/reset');

export const pauseAutoCalling = createTypedAsyncThunk<void, void>(
  pauseAutoCallingActionTypes.prefix,
  async (_, { dispatch }) => {
    dispatch(autoCallSlice.actions.setPaused(true));
  },
);

export const resumeAutoCalling = createTypedAsyncThunk<void, void>(
  resumeAutoCallingActionTypes.prefix,
  async (_, { dispatch }) => {
    dispatch(autoCallSlice.actions.setPaused(false));
  },
);

export const resetAutoCalling = createTypedAsyncThunk<void, void>(
  resetAutoCallingActionTypes.prefix,
  async (_, { dispatch }) => {
    dispatch(autoCallSlice.actions.reset());
  },
);

export type AutoCallState = {
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  dialerStatus: 'idle' | 'running' | 'paused';
  phoneNumbers: string[];
  currentPhoneNumber?: string;
  error?: string;
};

const initialState: AutoCallState = {
  status: 'idle',
  dialerStatus: 'idle',
  phoneNumbers: [],
};

export const autoCallSlice = createSlice({
  name: 'autoCall',
  initialState,
  reducers: {
    setPaused(state) {
      state.dialerStatus = 'paused';
    },
    setCurrentPhoneNumber(state, action: PayloadAction<string>) {
      state.currentPhoneNumber = action.payload;
    },
    reset(state) {
      return { ...initialState };
    },
    setDialerStatus(
      state,
      action: PayloadAction<'idle' | 'running' | 'paused'>,
    ) {
      state.dialerStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(pauseAutoCalling.pending, (state) => {
      state.status = 'pending';
    });
    builder.addCase(pauseAutoCalling.fulfilled, (state) => {
      state.dialerStatus = 'paused';
    });
    builder.addCase(
      pauseAutoCalling.rejected,
      (state, action: PayloadAction<any>) => {
        state.status = 'rejected';
        state.error = action.error.message;
      },
    );
    builder.addCase(resumeAutoCalling.pending, (state) => {
      state.status = 'pending';
    });
    builder.addCase(resumeAutoCalling.fulfilled, (state) => {
      state.dialerStatus = 'running';
    });
    builder.addCase(
      resumeAutoCalling.rejected,
      (state, action: PayloadAction<any>) => {
        state.status = 'rejected';
        state.error = action.error.message;
      },
    );
    builder.addCase(resetAutoCalling.pending, (state) => {
      state.status = 'pending';
    });
    builder.addCase(resetAutoCalling.fulfilled, (state) => {
      return { ...initialState };
    });
    builder.addCase(
      resetAutoCalling.rejected,
      (state, action: PayloadAction<any>) => {
        state.status = 'rejected';
        state.error = action.error.message;
      },
    );
  },
});
