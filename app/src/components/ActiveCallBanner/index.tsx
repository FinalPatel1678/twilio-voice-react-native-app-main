import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';

const ActiveCallSource = require('../../../assets/icons/active-call.png');

export type Props = {
  callDuration: string;
  hidden: boolean;
  onPress: () => void;
  participant: string;
};

const ActiveCallBanner: React.FC<Props> = ({
  callDuration,
  hidden,
  onPress,
  participant,
}) =>
  hidden ? null : (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.participant}>
        <Image
          style={styles.participantImage}
          source={ActiveCallSource}
          resizeMode="contain"
        />
        <Text style={styles.participantText}>{participant}</Text>
      </View>
      <View style={styles.spacer} />
      <Text style={styles.callDuration}>{callDuration}</Text>
    </TouchableOpacity>
  );

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.activeCall.background,
    borderBottomColor: colors.activeCall.border,
    borderBottomWidth: 1,
    display: 'flex',
    flexDirection: 'row',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  callDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    padding: 4,
  },
  spacer: {
    flexGrow: 1,
  },
  participant: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    padding: 4,
  },
  participantImage: {
    maxHeight: '50%',
    maxWidth: '50%',
  },
  participantText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default ActiveCallBanner;
