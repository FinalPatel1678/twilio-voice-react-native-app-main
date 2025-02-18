import { Platform } from 'react-native';
import { fetch, defaultUrl, secreteApiKey } from '../../util/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fetchNewToken = async () => {
  const response = await fetch(`${defaultUrl}/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: Platform.OS,
      api_key: secreteApiKey,
    }),
  });

  const { value } = await response.json();
  await AsyncStorage.setItem('accessToken', value.token);
  return value.token;
};

export const getAccessToken = async () => {
  const storedToken = await AsyncStorage.getItem('accessToken');
  return storedToken || fetchNewToken();
};
