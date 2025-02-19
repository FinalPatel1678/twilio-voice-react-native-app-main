import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type Props = {
  outgoingNumber: string;
};

const OutgoingRemoteParticipant: React.FC<Props> = ({ outgoingNumber }) => {
  const formattedNumber = React.useMemo(() => {
    return outgoingNumber.length > 0 ? outgoingNumber : '';
  }, [outgoingNumber]);
  return (
    <View style={styles.container}>
      <Text style={numberStyle} testID="formatted_number">
        {formattedNumber}
      </Text>

      <Text style={styles.subtitle} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#000000',
    fontSize: 30, // Increased from 24
    fontWeight: '400',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
  },
  number: {
  },
});

const numberStyle = {
  ...styles.title,
  ...styles.number,
};

export default OutgoingRemoteParticipant;
