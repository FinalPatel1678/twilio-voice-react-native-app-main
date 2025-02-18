import { Platform } from 'react-native';
import { fetch, defaultUrl, secreteApiKey } from '../../util/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fetchNewToken = async () => {
  try {
    console.log('Fetching new access token...');
    const response = await fetch(`${defaultUrl}/access-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: Platform.OS,
        api_key: secreteApiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log('New token received', jsonResponse);

    if (!jsonResponse?.token) {
      throw new Error('No token in response');
    }

    console.log('New token received');
    await AsyncStorage.setItem('accessToken', jsonResponse.token);
    return jsonResponse.token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
};

export const getAccessToken = async (forceNew = false) => {
  try {
    if (!forceNew) {
      const storedToken = await AsyncStorage.getItem('accessToken');
      if (storedToken) {
        console.log('Using stored token');
        return storedToken;
      }
    }
    return await fetchNewToken();
  } catch (error) {
    console.error('getAccessToken error:', error);
    throw error;
  }
};
