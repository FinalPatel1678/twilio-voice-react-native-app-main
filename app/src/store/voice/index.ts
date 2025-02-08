import { combineReducers } from '@reduxjs/toolkit';
import { accessTokenSlice } from './accessToken';
import { audioDevicesSlice } from './audioDevices';
import { activeCallSlice } from './call/activeCall';
import { phoneNumbersSlice } from './phoneNumbers';

export const voiceReducer = combineReducers({
  [accessTokenSlice.name]: accessTokenSlice.reducer,
  [audioDevicesSlice.name]: audioDevicesSlice.reducer,
  call: combineReducers({
    [activeCallSlice.name]: activeCallSlice.reducer,
  }),
  [phoneNumbersSlice.name]: phoneNumbersSlice.reducer,
});
