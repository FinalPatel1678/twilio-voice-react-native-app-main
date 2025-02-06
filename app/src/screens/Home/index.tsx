import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

const TwilioLogo = require('../../../assets/icons/twilio-logo.png');

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F4F6',
    height: '100%',
    display: 'flex',
    alignContent: 'center',
  },
  body: {
    marginHorizontal: 40,
    marginTop: 30,
  },
  userText: {
    fontWeight: '700',
    fontSize: 24,
    marginTop: 8,
  },
  logoContainer: {
    marginTop: 100,
    marginLeft: 40,
  },
  logo: {
    height: 50,
    width: 150,
  },
});

const Home: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={TwilioLogo} resizeMode="contain" />
      </View>
      <View style={styles.body}>
        <Text>Ahoy!</Text>
      </View>
    </View>
  );
};

export default Home;
