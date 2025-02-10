import {
  createSlice,
  miniSerializeError,
  type SerializedError,
} from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import { fetch, defaultUrl, secreteApiKey } from '../../util/fetch';
import { settlePromise } from '../../util/settlePromise';
import { type AsyncStoreSlice } from '../app';
import { createTypedAsyncThunk } from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GetAccessTokenRejectValue =
  | {
      reason: 'USER_NOT_FULFILLED';
    }
  | {
      reason: 'FETCH_ERROR';
      error: SerializedError;
    }
  | {
      reason: 'TOKEN_RESPONSE_NOT_OK';
      statusCode: number;
      error: SerializedError;
    }
  | {
      reason: 'FETCH_TEXT_ERROR';
      error: SerializedError;
    };

export const getAccessToken = createTypedAsyncThunk<
  string,
  void,
  {
    rejectValue: GetAccessTokenRejectValue;
  }
>('voice/getAccessToken', async (_, { rejectWithValue }) => {
  console.log('Fetching access token...');
  const fetchResult = await settlePromise(
    fetch(
      'https://68f9-2409-4080-8d89-cb36-ed9c-f3e6-5148-7c98.ngrok-free.app/access-token',
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: Platform.OS,
        api_key: secreteApiKey,
      }),
    }),
  );
  if (fetchResult.status === 'rejected') {
    console.error('Fetch error:', fetchResult.reason);
    return rejectWithValue({
      reason: 'FETCH_ERROR',
      error: miniSerializeError(fetchResult.reason),
    });
  }

  const tokenResponse = fetchResult.value;

  const tokenTextResult = await settlePromise(tokenResponse.json());

  if (!tokenResponse.ok) {
    const error =
      tokenTextResult.status === 'fulfilled'
        ? new Error(tokenTextResult.value)
        : tokenTextResult.reason;
    console.error('Token response not OK:', error);
    return rejectWithValue({
      reason: 'TOKEN_RESPONSE_NOT_OK',
      statusCode: tokenResponse.status,
      error: miniSerializeError(error),
    });
  }

  if (tokenTextResult.status === 'rejected') {
    console.error('Fetch text error:', tokenTextResult.reason);
    return rejectWithValue({
      reason: 'FETCH_TEXT_ERROR',
      error: miniSerializeError(tokenTextResult.reason),
    });
  }

  const token = tokenTextResult.value.token;
  console.log('Access token fetched successfully:', token);

  // Store the token in local storage
  try {
    await AsyncStorage.setItem('accessToken', token);
  } catch (e) {
    console.error('Failed to save the token to local storage:', e);
  }

  return token;
});

export type AccessTokenState = AsyncStoreSlice<
  { value: string },
  GetAccessTokenRejectValue | { error: any; reason: 'UNEXPECTED_ERROR' }
>;

export const accessTokenSlice = createSlice({
  name: 'accessToken',
  initialState: { status: 'idle' } as AccessTokenState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(getAccessToken.pending, () => {
      console.log('Access token fetch pending...');
      return { status: 'pending' };
    });

    builder.addCase(getAccessToken.fulfilled, (_, action) => {
      console.log('Access token fetch fulfilled:', action.payload);
      return { status: 'fulfilled', value: action.payload };
    });

    builder.addCase(getAccessToken.rejected, (_, action) => {
      console.error(
        'Access token fetch rejected:',
        action.payload || action.error,
      );
      switch (action.payload?.reason) {
        case 'USER_NOT_FULFILLED':
          return {
            status: 'rejected',
            reason: action.payload.reason,
          };
        case 'TOKEN_RESPONSE_NOT_OK':
          return {
            status: 'rejected',
            reason: action.payload.reason,
            statusCode: action.payload.statusCode,
            error: action.payload.error,
          };
        case 'FETCH_ERROR':
        case 'FETCH_TEXT_ERROR':
          return {
            status: 'rejected',
            reason: action.payload.reason,
            error: action.payload.error,
          };
        default:
          return {
            status: 'rejected',
            error: action.error,
            reason: 'UNEXPECTED_ERROR',
          };
      }
    });
  },
});
