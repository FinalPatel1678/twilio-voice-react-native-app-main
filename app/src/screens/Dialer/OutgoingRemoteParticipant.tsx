import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type Props = {
  outgoingNumber: string;
};

const OutgoingRemoteParticipant: React.FC<Props> = ({ outgoingNumber }) => {
  const formattedNumber = React.useMemo(() => {
    return outgoingNumber.length > 0 ? `+${outgoingNumber}` : '';
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
  container: {},
  title: {
    color: 'black',
    fontSize: 24,
    textAlign: 'center',
  },
  subtitle: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
  },
  number: {
    padding: 10.5,
  },
});

const numberStyle = {
  ...styles.title,
  ...styles.number,
};

export default OutgoingRemoteParticipant;
