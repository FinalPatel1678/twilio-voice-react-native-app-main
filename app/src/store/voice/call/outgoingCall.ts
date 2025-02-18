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
    console.log('makeOutgoingCall: started', { requestId });

    const state = getState();
    const phoneNumbers = state.voice.phoneNumbers.phoneNumbers;

    if (!phoneNumbers?.length) {
      return rejectWithValue({ reason: 'PHONE_NUMBERS_UNAVAILABLE' });
    }

    const Caller_Id =
      phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];

    try {
      const makeCall = async (tokenValue: string, isRetry = false) => {
        try {
          const outgoingCall = await voice.connect(tokenValue, {
            params: { To: to, Caller_Id },
          });

          const callInfo = getCallInfo(outgoingCall);
          callMap.set(requestId, outgoingCall);

          // Handle token invalidation
          outgoingCall.on(TwilioCall.Event.ConnectFailure, async (error) => {
            if (error.code === 20101) {
              const newToken = await getAccessToken();
              if (newToken) {
                return makeCall(newToken);
              }
            }
            console.error('ConnectFailure:', error);
          });

          // Handle call state updates
          Object.values(TwilioCall.Event).forEach((event) => {
            outgoingCall.on(event, () => {
              dispatch(
                setActiveCallInfo({
                  id: requestId,
                  info: getCallInfo(outgoingCall),
                }),
              );
            });
          });

          // Store call info when connected
          outgoingCall.once(TwilioCall.Event.Connected, () => {
            const callSid = outgoingCall.getSid();
            if (typeof callSid === 'string') {
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

          return callInfo;
        } catch (error: any) {
          // If token is invalid and this isn't a retry attempt
          if (error?.code === 20101 && !isRetry) {
            const newToken = await getAccessToken();
            return makeCall(newToken, true);
          }
          throw error;
        }
      };

      // Get token from storage first or fetch new one
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
