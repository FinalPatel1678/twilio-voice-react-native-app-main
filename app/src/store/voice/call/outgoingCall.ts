import AsyncStorage from '@react-native-async-storage/async-storage';
import { miniSerializeError, type SerializedError } from '@reduxjs/toolkit';
import { Call as TwilioCall } from '@twilio/voice-react-native-sdk';
import { voice, callMap } from '../../../util/voice';
import { settlePromise } from '../../../util/settlePromise';
import { createTypedAsyncThunk, generateThunkActionTypes } from '../../common';
import { type CallInfo, getCallInfo } from './';
import { setActiveCallInfo } from './activeCall';

export type MakeOutgoingCallRejectValue =
  | {
      reason: 'TOKEN_UNFULFILLED';
    }
  | {
      reason: 'NATIVE_MODULE_REJECTED';
      error: SerializedError;
    };
export const makeOutgoingCallActionTypes =
  generateThunkActionTypes('call/makeOutgoing');
export const makeOutgoingCall = createTypedAsyncThunk<
  CallInfo,
  { to: string },
  { rejectValue: MakeOutgoingCallRejectValue }
>(
  makeOutgoingCallActionTypes.prefix,
  async ({ to }, { getState, dispatch, rejectWithValue, requestId }) => {
    console.log('makeOutgoingCall: started', { requestId });

    const state = getState();
    const token = state.voice.accessToken;
    const phoneNumbers = state.voice.phoneNumbers.phoneNumbers;

    if (token?.status !== 'fulfilled') {
      console.error('makeOutgoingCall: token unfulfilled');
      return rejectWithValue({ reason: 'TOKEN_UNFULFILLED' });
    }

    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.error('makeOutgoingCall: no phone numbers available');
      return rejectWithValue({ reason: 'PHONE_NUMBERS_UNAVAILABLE' });
    }

    const Caller_Id =
      phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    console.log('makeOutgoingCall: calling to', { to, Caller_Id });

    try {
      const outgoingCallResult = await settlePromise(
        voice.connect(token.value, {
          params: {
            To: to,
            Caller_Id: Caller_Id,
          },
        }),
      );
      if (outgoingCallResult.status === 'rejected') {
        console.error(
          'makeOutgoingCall: native module rejected',
          outgoingCallResult.reason,
        );
        return rejectWithValue({
          reason: 'NATIVE_MODULE_REJECTED',
          error: miniSerializeError(outgoingCallResult.reason),
        });
      }

      const outgoingCall = outgoingCallResult.value;
      console.log('makeOutgoingCall: call connected', { outgoingCall });

      const callInfo = getCallInfo(outgoingCall);
      callMap.set(requestId, outgoingCall);

      outgoingCall.on(TwilioCall.Event.ConnectFailure, (error) => {
        console.error('ConnectFailure:', error);
        if (error.code === 20107) {
          console.error(
            'Invalid Access Token signature. Please check the token generation process.',
          );
        }
      });
      outgoingCall.on(TwilioCall.Event.Reconnecting, (error) =>
        console.error('Reconnecting:', error),
      );
      outgoingCall.on(TwilioCall.Event.Disconnected, (error) => {
        // The type of error here is "TwilioError | undefined".
        if (error) {
          console.error('Disconnected:', error);
        }

        const callSid = outgoingCall.getSid();
        if (typeof callSid !== 'string') {
          return;
        }
        AsyncStorage.removeItem(callSid);
      });

      Object.values(TwilioCall.Event).forEach((callEvent) => {
        outgoingCall.on(callEvent, () => {
          console.log(`makeOutgoingCall: event ${callEvent}`, { outgoingCall });
          dispatch(
            setActiveCallInfo({
              id: requestId,
              info: getCallInfo(outgoingCall),
            }),
          );
        });
      });

      outgoingCall.once(TwilioCall.Event.Connected, () => {
        const callSid = outgoingCall.getSid();
        if (typeof callSid !== 'string') {
          return;
        }
        AsyncStorage.setItem(callSid, JSON.stringify({ to }));

        const info = getCallInfo(outgoingCall);
        if (typeof info.initialConnectedTimestamp === 'undefined') {
          info.initialConnectedTimestamp = Date.now();
        }
        dispatch(setActiveCallInfo({ id: requestId, info }));
      });

      console.log('makeOutgoingCall: completed', { callInfo });
      return callInfo;
    } catch (error) {
      console.error('makeOutgoingCall: event connectFailure', error);
      if (error.code === 20107) {
        console.error(
          'Invalid Access Token signature. Please check the token generation process.',
        );
      }
      return rejectWithValue({
        reason: 'NATIVE_MODULE_REJECTED',
        error: miniSerializeError(error),
      });
    }
  },
);
