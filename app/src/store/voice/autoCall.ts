import { createTypedAsyncThunk, generateThunkActionTypes } from '../common';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { makeOutgoingCall } from './call/outgoingCall';

export const startAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/start');
export const pauseAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/pause');
export const resumeAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/resume');
export const resetAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/reset');

export const startAutoCalling = createTypedAsyncThunk<
  void,
  { phoneNumbers: string[]; delay: number }
>(
  startAutoCallingActionTypes.prefix,
  async ({ phoneNumbers, delay }, { dispatch, getState }) => {
    const waitForCallEnd = () =>
      new Promise((resolve) => {
        const interval = setInterval(() => {
          const currentState = getState();
          const hasActiveCall = Boolean(
            currentState.voice.call.activeCall.ids.length,
          );
          if (!hasActiveCall) {
            clearInterval(interval);
            resolve(null);
          }
        }, 1000); // Check every second
      });

    for (const number of phoneNumbers) {
      const state = getState();

      // Check if dialer is paused
      if (state.voice.autoCall.dialerStatus === 'paused') {
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            const currentState = getState();
            if (currentState.voice.autoCall.dialerStatus !== 'paused') {
              clearInterval(interval);
              resolve(null);
            }
          }, 1000);
        });
      }

      try {
        // Wait for any existing call to finish before starting new call
        await waitForCallEnd();

        // Set current number being called
        dispatch(autoCallSlice.actions.setCurrentPhoneNumber(number));

        // Make the call
        await dispatch(makeOutgoingCall({ to: number })).unwrap();

        // Wait for this call to complete
        await waitForCallEnd();

        // Add delay between calls
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`Failed to call ${number}:`, error);
      }
    }
  },
);

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
    builder.addCase(startAutoCalling.pending, (state) => {
      state.status = 'pending';
      state.dialerStatus = 'running';
    });
    builder.addCase(startAutoCalling.fulfilled, (state) => {
      state.status = 'fulfilled';
      state.dialerStatus = 'idle';
      state.currentPhoneNumber = undefined;
    });
    builder.addCase(
      startAutoCalling.rejected,
      (state, action: PayloadAction<any>) => {
        state.status = 'rejected';
        state.error = action.error.message;
      },
    );
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
