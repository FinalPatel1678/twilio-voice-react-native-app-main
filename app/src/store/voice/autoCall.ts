import { createTypedAsyncThunk, generateThunkActionTypes } from '../common';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { makeOutgoingCall } from './call/outgoingCall';

export const startAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/start');
export const pauseAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/pause');
export const resumeAutoCallingActionTypes =
  generateThunkActionTypes('autoCall/resume');
export const skipCurrentCallActionTypes =
  generateThunkActionTypes('autoCall/skip');

export const startAutoCalling = createTypedAsyncThunk<
  void,
  { phoneNumbers: string[]; delay: number }
>(
  startAutoCallingActionTypes.prefix,
  async ({ phoneNumbers, delay }, { dispatch, getState }) => {
    const waitForCallEnd = () =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Wait for call end timeout'));
        }, 300000); // 5 minute timeout

        const interval = setInterval(() => {
          const currentState = getState();
          if (!currentState.voice.call.activeCall.entities.length) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(null);
          }
        }, 100);
      });

    for (const number of phoneNumbers) {
      const state = getState();
      if (state.voice.autoCall.isPaused) {
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            const currentState = getState();
            if (!currentState.voice.autoCall.isPaused) {
              clearInterval(interval);
              resolve(null);
            }
          }, 100);
        });
      }
      if (state.voice.autoCall.skipCurrent) {
        dispatch(autoCallSlice.actions.resetSkipCurrent());
        continue;
      }
      try {
        dispatch(autoCallSlice.actions.setCurrentPhoneNumber(number));
        await dispatch(makeOutgoingCall({ to: number })).unwrap(); // Use makeOutgoingCall thunk
        // Wait for the current call to end before starting the next one
        await waitForCallEnd();
        // Add delay between calls if necessary
        await new Promise((resolve) => setTimeout(resolve, delay)); // delay between calls
      } catch (error) {
        console.error(`Failed to call ${number}:`, error);
        // Optionally dispatch an error action or handle the error as needed
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

export const skipCurrentCall = createTypedAsyncThunk<void, void>(
  skipCurrentCallActionTypes.prefix,
  async (_, { dispatch }) => {
    dispatch(autoCallSlice.actions.setSkipCurrent(true));
  },
);

export type AutoCallState = {
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  phoneNumbers: string[];
  currentPhoneNumber?: string;
  isPaused: boolean;
  skipCurrent: boolean;
  error?: string;
};

const initialState: AutoCallState = {
  status: 'idle',
  phoneNumbers: [],
  isPaused: false,
  skipCurrent: false,
};

export const autoCallSlice = createSlice({
  name: 'autoCall',
  initialState,
  reducers: {
    setPaused(state, action: PayloadAction<boolean>) {
      state.isPaused = action.payload;
    },
    setSkipCurrent(state, action: PayloadAction<boolean>) {
      state.skipCurrent = action.payload;
    },
    resetSkipCurrent(state) {
      state.skipCurrent = false;
    },
    setCurrentPhoneNumber(state, action: PayloadAction<string>) {
      state.currentPhoneNumber = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(startAutoCalling.pending, (state) => {
      state.status = 'pending';
    });
    builder.addCase(startAutoCalling.fulfilled, (state) => {
      state.status = 'fulfilled';
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
      state.status = 'fulfilled';
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
      state.status = 'fulfilled';
    });
    builder.addCase(
      resumeAutoCalling.rejected,
      (state, action: PayloadAction<any>) => {
        state.status = 'rejected';
        state.error = action.error.message;
      },
    );
    builder.addCase(skipCurrentCall.pending, (state) => {
      state.status = 'pending';
    });
    builder.addCase(skipCurrentCall.fulfilled, (state) => {
      state.status = 'fulfilled';
    });
    builder.addCase(
      skipCurrentCall.rejected,
      (state, action: PayloadAction<any>) => {
        state.status = 'rejected';
        state.error = action.error.message;
      },
    );
  },
});
