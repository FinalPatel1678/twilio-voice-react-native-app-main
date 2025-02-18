import AsyncStorage from '@react-native-async-storage/async-storage';
import { miniSerializeError, type SerializedError } from '@reduxjs/toolkit';
import { Call as TwilioCall } from '@twilio/voice-react-native-sdk';
import { voice, callMap } from '../../../util/voice';
import { createTypedAsyncThunk, generateThunkActionTypes } from '../../common';
import { type CallInfo, getCallInfo } from './';
import { setActiveCallInfo } from './activeCall';
import { STORAGE_KEYS } from '../../../util/constants';
import { getAccessToken } from '../accessToken';

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
    console.log('makeOutgoingCall: started', { requestId, to });

    const state = getState();
    const phoneNumbers = state.voice.phoneNumbers.phoneNumbers;

    if (!phoneNumbers?.length) {
      console.error('No phone numbers available');
      return rejectWithValue({ reason: 'PHONE_NUMBERS_UNAVAILABLE' });
    }

    const Caller_Id =
      phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];

    try {
      const makeCall = async (tokenValue: string, isRetry = false) => {
        try {
          console.log('Connecting call...', { to, Caller_Id, isRetry });
          const outgoingCall = await voice.connect(tokenValue, {
            params: { To: to, Caller_Id },
          });

          // Set up event listeners before doing anything else
          outgoingCall.on(TwilioCall.Event.ConnectFailure, async (error) => {
            console.log('ConnectFailure event:', error);
            if (!isRetry && (error.code === 20101 || error.code === 20104)) {
              console.log('Token expired, retrying with new token...');
              const newToken = await getAccessToken(true);
              if (newToken) {
                return makeCall(newToken, true);
              }
            }
            console.error('Call connection failed:', error);
          });

          outgoingCall.on(TwilioCall.Event.Disconnected, (error) => {
            console.log('Call disconnected:', error);
            // Cleanup call from storage
            const callSid = outgoingCall.getSid();
            if (callSid) {
              AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_CALLS).then((stored) => {
                if (stored) {
                  const calls = JSON.parse(stored);
                  delete calls[callSid];
                  AsyncStorage.setItem(
                    STORAGE_KEYS.ACTIVE_CALLS,
                    JSON.stringify(calls),
                  );
                }
              });
            }
          });

          // Monitor call state changes
          outgoingCall.on(TwilioCall.Event.Connected, () => {
            console.log('Call connected successfully');
            const callSid = outgoingCall.getSid();
            if (callSid) {
              AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_CALLS).then((stored) => {
                const calls = stored ? JSON.parse(stored) : {};
                calls[callSid] = { to };
                AsyncStorage.setItem(
                  STORAGE_KEYS.ACTIVE_CALLS,
                  JSON.stringify(calls),
                );
              });
            }
          });

          // Update call info for all events
          Object.values(TwilioCall.Event).forEach((event) => {
            outgoingCall.on(event, () => {
              const callInfo = getCallInfo(outgoingCall);
              console.log('Call state updated:', {
                event,
                state: callInfo.state,
              });
              dispatch(setActiveCallInfo({ id: requestId, info: callInfo }));
            });
          });

          callMap.set(requestId, outgoingCall);
          return getCallInfo(outgoingCall);
        } catch (error: any) {
          console.error('Call connection error:', error);
          if (!isRetry && (error?.code === 20101 || error?.code === 20104)) {
            const newToken = await getAccessToken(true);
            if (newToken) {
              return makeCall(newToken, true);
            }
          }
          throw error;
        }
      };

      const token = await getAccessToken();
      return await makeCall(token);
    } catch (error) {
      console.error('makeOutgoingCall failed:', error);
      return rejectWithValue({
        reason: 'NATIVE_MODULE_REJECTED',
        error: miniSerializeError(error),
      });
    }
  },
);
