import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

type PhoneNumberItemProps = {
  phoneNumber: string;
  isCurrent: boolean;
  onCall: () => void;
  onSkip: () => void;
};

const PhoneNumberItem: React.FC<PhoneNumberItemProps> = ({
  phoneNumber,
  isCurrent,
  onCall,
  onSkip,
}) => {
  return (
    <View style={[styles.container, isCurrent && styles.current]}>
      <Text style={styles.phoneNumber}>{phoneNumber}</Text>
      <Button title="Call" onPress={onCall} />
      <Button title="Skip" onPress={onSkip} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
  },
  current: {
    backgroundColor: 'lightblue',
  },
  phoneNumber: {
    flex: 1,
    marginRight: 8,
  },
});

export default PhoneNumberItem;
