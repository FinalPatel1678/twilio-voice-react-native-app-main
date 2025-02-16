import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useSelector } from 'react-redux';
import StackNavigator from './screens/StackNavigator';
import { defaultStore, State } from './store/app';
import {
  bootstrapAudioDevices,
  bootstrapCalls,
  bootstrapNavigation,
  bootstrapPhoneNumbersAndToken,
} from './store/bootstrap';
import { navigationRef } from './util/navigation';
import { ActivityIndicator, View } from 'react-native';
import { setBootstrapping } from './store/app'; // Add this import

const AppContent = () => {
  const isBootstrapping = useSelector(
    (state: State) => state.app.isBootstrapping,
  );

  React.useEffect(() => {
    const bootstrap = async () => {
      try {
        await defaultStore.dispatch(bootstrapPhoneNumbersAndToken());
        defaultStore.dispatch(setBootstrapping(false));
        await defaultStore.dispatch(bootstrapAudioDevices());
        await defaultStore.dispatch(bootstrapCalls());
        await defaultStore.dispatch(bootstrapNavigation());
      } catch (error) {
        console.error('Bootstrap failed:', error);
        defaultStore.dispatch(setBootstrapping(false));
      }
    };

    bootstrap();
  }, []);

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StackNavigator />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <Provider store={defaultStore}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
