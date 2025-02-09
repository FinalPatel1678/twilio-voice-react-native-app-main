import {
  createSlice,
  miniSerializeError,
  type SerializedError,
} from '@reduxjs/toolkit';
import { fetch, defaultUrl, secreteApiKey } from '../../util/fetch';
import { settlePromise } from '../../util/settlePromise';
import { createTypedAsyncThunk } from '../common';

export type GetPhoneNumbersRejectValue =
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

export const getPhoneNumbers = createTypedAsyncThunk<
  string[],
  void,
  { rejectValue: GetPhoneNumbersRejectValue }
>('voice/getPhoneNumbers', async (_, { rejectWithValue }) => {
  console.log('Fetching available phone numbers...');
  const fetchResult = await settlePromise(
    fetch('https://b711-152-59-37-169.ngrok-free.app/phone-numbers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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

  const phoneNumbersResponse = fetchResult.value;
  const phoneNumbersTextResult = await settlePromise(
    phoneNumbersResponse.json(),
  );

  if (!phoneNumbersResponse.ok) {
    const error =
      phoneNumbersTextResult.status === 'fulfilled'
        ? new Error(phoneNumbersTextResult.value)
        : phoneNumbersTextResult.reason;
    console.error('Phone numbers response not OK:', error);
    return rejectWithValue({
      reason: 'TOKEN_RESPONSE_NOT_OK',
      statusCode: phoneNumbersResponse.status,
      error: miniSerializeError(error),
    });
  }

  if (phoneNumbersTextResult.status === 'rejected') {
    console.error('Fetch text error:', phoneNumbersTextResult.reason);
    return rejectWithValue({
      reason: 'FETCH_TEXT_ERROR',
      error: miniSerializeError(phoneNumbersTextResult.reason),
    });
  }

  const phoneNumbers = phoneNumbersTextResult.value.phoneNumbers;
  console.log('Phone numbers fetched successfully:', phoneNumbers);
  return phoneNumbers;
});

export type PhoneNumbersState = {
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  phoneNumbers?: string[];
  error?: SerializedError;
};

export const phoneNumbersSlice = createSlice({
  name: 'phoneNumbers',
  initialState: { status: 'idle' } as PhoneNumbersState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(getPhoneNumbers.pending, (state) => {
      console.log('Phone numbers fetch pending...');
      state.status = 'pending';
    });

    builder.addCase(getPhoneNumbers.fulfilled, (state, action) => {
      console.log('Phone numbers fetch fulfilled:', action.payload);
      state.status = 'fulfilled';
      state.phoneNumbers = action.payload;
    });

    builder.addCase(getPhoneNumbers.rejected, (state, action) => {
      console.error(
        'Phone numbers fetch rejected:',
        action.payload || action.error,
      );
      state.status = 'rejected';
      state.error = action.payload?.error || action.error;
    });
  },
});
