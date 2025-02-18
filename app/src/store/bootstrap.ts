import AsyncStorage from '@react-native-async-storage/async-storage';
import { miniSerializeError, type SerializedError } from '@reduxjs/toolkit';
import { Voice } from '@twilio/voice-react-native-sdk';
import { createTypedAsyncThunk, generateThunkActionTypes } from './common';
import { handleCall } from './voice/call/activeCall';
import { updateAudioDevices } from './voice/audioDevices';
import { getNavigate } from '../util/navigation';
import { settlePromise } from '../util/settlePromise';
import { voice } from '../util/voice';
import { getPhoneNumbers } from './voice/phoneNumbers';
import { STORAGE_KEYS } from '../util/constants';

/**
 * Bootstrap calls. Retrieves all existing calls.
 *
 * TODO(mhuynh):
 * Re-evaluate the "active calls" map that we use on the native layer. There
 * really only should be one active call, the Android/iOS SDKs do not support
 * multiple active calls.
 */
export type BootstrapCallsRejectValue = {
  reason: 'NATIVE_MODULE_REJECTED';
  error: SerializedError;
};
export const bootstrapCallsActionTypes =
  generateThunkActionTypes('bootstrap/call');
export const bootstrapCalls = createTypedAsyncThunk<
  void,
  void,
  { rejectValue: BootstrapCallsRejectValue }
>(
  bootstrapCallsActionTypes.prefix,
  async (_, { dispatch, rejectWithValue }) => {
    const callsResult = await settlePromise(voice.getCalls());
    if (callsResult.status === 'rejected') {
      return rejectWithValue({
        reason: 'NATIVE_MODULE_REJECTED',
        error: miniSerializeError(callsResult.reason),
      });
    }

    const calls = callsResult.value;
    // Get stored calls
    const storedCallsStr = await AsyncStorage.getItem(
      STORAGE_KEYS.ACTIVE_CALLS,
    );
    const storedCalls = storedCallsStr ? JSON.parse(storedCallsStr) : {};

    for (const call of calls.values()) {
      await dispatch(handleCall({ call }));
      const callSid = call.getSid();
      if (callSid && storedCalls[callSid]) {
        delete storedCalls[callSid]; // Remove active calls from cleanup list
      }
    }

    // Clean up inactive calls
    if (Object.keys(storedCalls).length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_CALLS);
    } else {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_CALLS,
        JSON.stringify(storedCalls),
      );
    }
  },
);

/**
 * Bootstrap proper screen. Navigate to the proper screen depending on
 * application state.
 *
 * For example, navigate to the call invite screen when there are call invites.
 */
type BootstrapNavigationReturnValue = 'App' | 'Call';
export const bootstrapNavigationActionTypes = generateThunkActionTypes(
  'bootstrap/navigation',
);
export const bootstrapNavigation =
  createTypedAsyncThunk<BootstrapNavigationReturnValue>(
    bootstrapNavigationActionTypes.prefix,
    async (_, { getState }) => {
      const { reset } = await getNavigate();

      const state = getState();

      if (state.voice.call.activeCall.ids.length) {
        reset({ routes: [{ name: 'App' }, { name: 'Call' }] });
        return 'Call';
      }

      reset({ routes: [{ name: 'App' }] });
      return 'App';
    },
  );

/**
 * Bootstrap audio devices.
 */
export const bootstrapAudioDevicesActionTypes = generateThunkActionTypes(
  'bootstrap/audioDevices',
);
export const bootstrapAudioDevices = createTypedAsyncThunk(
  bootstrapAudioDevicesActionTypes.prefix,
  (_, { dispatch }) => {
    const handleAudioDevicesUpdated: Voice.Listener.AudioDevicesUpdated = (
      audioDevices,
      selectedDevice,
    ) => {
      dispatch(
        updateAudioDevices({
          audioDevices,
          selectedDevice: selectedDevice === null ? undefined : selectedDevice,
        }),
      );
    };

    voice.on(Voice.Event.AudioDevicesUpdated, handleAudioDevicesUpdated);
  },
);

/**
 * Bootstrap phone numbers.
 */
export const bootstrapPhoneNumbersActionTypes = generateThunkActionTypes(
  'bootstrap/phoneNumbers',
);
export const bootstrapPhoneNumbers = createTypedAsyncThunk(
  bootstrapPhoneNumbersActionTypes.prefix,
  async (_, { dispatch }) => {
    await dispatch(getPhoneNumbers());
  },
);

/**
 * Bootstrap phone numbers and access token.
 */
export const bootstrapPhoneNumbersAndTokenActionTypes =
  generateThunkActionTypes('bootstrap/phoneNumbersAndToken');
export const bootstrapPhoneNumbersAndToken = createTypedAsyncThunk(
  bootstrapPhoneNumbersAndTokenActionTypes.prefix,
  async (_, { dispatch }) => {
    await dispatch(getPhoneNumbers());
  },
);
