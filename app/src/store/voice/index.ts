import { combineReducers } from '@reduxjs/toolkit';
import { audioDevicesSlice } from './audioDevices';
import { activeCallSlice } from './call/activeCall';
import { phoneNumbersSlice } from './phoneNumbers';
import { autoCallSlice } from './autoCall';

export const voiceReducer = combineReducers({
  [audioDevicesSlice.name]: audioDevicesSlice.reducer,
  call: combineReducers({
    [activeCallSlice.name]: activeCallSlice.reducer,
  }),
  [phoneNumbersSlice.name]: phoneNumbersSlice.reducer,
  [autoCallSlice.name]: autoCallSlice.reducer,
});
