import {
  createSlice,
  miniSerializeError,
  type SerializedError,
} from '@reduxjs/toolkit';
import { fetch, defaultUrl, secreteApiKey } from '../../util/fetch';
import { settlePromise } from '../../util/settlePromise';
import { createTypedAsyncThunk } from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@phone_numbers';

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
  boolean | undefined,
  { rejectValue: GetPhoneNumbersRejectValue }
>('voice/getPhoneNumbers', async (forceRefresh, { rejectWithValue }) => {
  console.log('Fetching available phone numbers...');

  if (!forceRefresh) {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { numbers, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return numbers;
      }
    }
  }

  const fetchResult = await settlePromise(
    fetch(`${defaultUrl}/phone-numbers`, {
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

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      numbers: phoneNumbers,
      timestamp: Date.now(),
    }),
  );

  return phoneNumbers;
});

export type PhoneNumbersState = {
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  phoneNumbers?: string[];
  selectedNumber?: string | null;
  error?: SerializedError;
};

export const phoneNumbersSlice = createSlice({
  name: 'phoneNumbers',
  initialState: { status: 'idle', selectedNumber: null } as PhoneNumbersState,
  reducers: {
    setSelectedNumber: (state, action) => {
      state.selectedNumber = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(getPhoneNumbers.pending, (state) => {
      console.log('Phone numbers fetch pending...');
      state.status = 'pending';
    });

    builder.addCase(getPhoneNumbers.fulfilled, (state, action) => {
      console.log('Phone numbers fetch fulfilled:', action.payload);
      state.status = 'fulfilled';
      state.phoneNumbers = action.payload;
      if (!state.selectedNumber && action.payload.length > 0) {
        state.selectedNumber = action.payload[0];
      }
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

export const { setSelectedNumber } = phoneNumbersSlice.actions;
export default phoneNumbersSlice.reducer;
