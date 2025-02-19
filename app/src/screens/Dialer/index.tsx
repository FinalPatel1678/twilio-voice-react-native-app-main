import React from 'react';
import { StyleSheet, View } from 'react-native';
import BackspaceButton from './BackspaceButton';
import MakeCallButton from '../../components/Call/MakeCallButton';
import Dialpad from '../../components/Dialpad';
import OutgoingRemoteParticipant from './OutgoingRemoteParticipant';
import useDialer from './hooks';

const Dialer: React.FC = () => {
  const { dialpad, makeCall, outgoing } = useDialer();

  const handleLongPress = React.useCallback(
    (value: string) => {
      if (value === '+') {
        dialpad.input.handle(value);
      }
    },
    [dialpad.input]
  );

  const backspaceButton = React.useMemo(
    () =>
      dialpad.backspace.isDisabled ? (
        <View style={styles.emptyButton} />
      ) : (
        <BackspaceButton onPress={dialpad.backspace.handle} />
      ),
    [dialpad.backspace.isDisabled, dialpad.backspace.handle],
  );

  return (
    <View style={styles.container} testID="dialer">
      <View style={styles.remoteParticipant}>
        <OutgoingRemoteParticipant outgoingNumber={outgoing.number.value} />
      </View>
      <View style={styles.dialpad}>
        <Dialpad
          disabled={dialpad.input.isDisabled}
          onPress={dialpad.input.handle}
          onLongPress={handleLongPress}
        />
      </View>
      <View style={styles.buttons}>
        <MakeCallButton
          disabled={makeCall.isDisabled}
          onPress={makeCall.handle}
        />
        {backspaceButton}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  remoteParticipant: {
    padding: 12,
    height: '25%',
    flexDirection: 'column-reverse',
    width: '100%',
  },
  dialpad: {
    height: '55%',
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'row',
    height: '20%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 8,
  },
  emptyButton: {
    width: 72,
  },
});

export default Dialer;
