import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ActiveCall from './ActiveCall';
import TabNavigator from './TabNavigator';
import { type StackParamList } from './types';
import Busy from '../components/Busy';

const Stack = createNativeStackNavigator<StackParamList>();

const StackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Busy">
      <Stack.Screen
        name="App"
        options={{ headerShown: false }}
        component={TabNavigator}
      />
      <Stack.Screen
        name="Busy"
        options={{ headerShown: false }}
        component={Busy}
      />
      <Stack.Screen name="Call" component={ActiveCall} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
