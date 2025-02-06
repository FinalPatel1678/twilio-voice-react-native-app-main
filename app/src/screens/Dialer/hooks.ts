import { Call as TwilioCall } from '@twilio/voice-react-native-sdk';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { match } from 'ts-pattern';
import { useTypedDispatch } from '../../store/common';
import { makeOutgoingCall as makeOutgoingCallAction } from '../../store/voice/call/outgoingCall';
import { getAccessToken } from '../../store/voice/accessToken';
import { type StackNavigationProp } from '../types';
import { useActiveCall } from '../../hooks/activeCall';

/**
 * Hook for the dialpad.
 * "number".
 * @param isDialerDisabled - Boolean if the dialer is disabled entirely.
 * @returns - Handlers and state for the dialer screen.
 */
const useDialpad = (
  outgoingNumber: string,
  setOutgoingNumber: React.Dispatch<React.SetStateAction<string>>,
  isDialerDisabled: boolean,
) => {
  const handleInput = React.useCallback(
    (dialpadInput: string) => {
      setOutgoingNumber(
        (currentOutgoingNumber) => currentOutgoingNumber + dialpadInput,
      );
    },
    [setOutgoingNumber],
  );

  const isInputDisabled = React.useMemo(() => {
    return isDialerDisabled;
  }, [isDialerDisabled]);

  const isBackspaceDisabled = React.useMemo(() => {
    return isDialerDisabled || outgoingNumber.length === 0;
  }, [isDialerDisabled, outgoingNumber]);

  const handleBackspace = React.useCallback(() => {
    setOutgoingNumber((currentOutgoingNumber) =>
      currentOutgoingNumber.length > 0
        ? currentOutgoingNumber.slice(0, currentOutgoingNumber.length - 1)
        : currentOutgoingNumber,
    );
  }, [setOutgoingNumber]);

  return {
    input: {
      handle: handleInput,
      isDisabled: isInputDisabled,
    },
    backspace: {
      handle: handleBackspace,
      isDisabled: isBackspaceDisabled,
    },
  };
};

/**
 * Hook for handling making outgoing calls. Hooks into Redux state to issue
 * thunk actions.
 * @param dispatch - A Redux dispatch function.
 * @param navigation - A React Navigation navigation function.
 * "number".
 * @param to - The recipient. Either a string of numbers for PSTN calls or
 * @returns - Handler for making an outgoing call.
 */
const useMakeOutgoingCall = (
  dispatch: ReturnType<typeof useTypedDispatch>,
  navigation: StackNavigationProp<'App'>,
  outgoingNumber: string,
  isDialerDisabled: boolean,
) => {
  const to = outgoingNumber;

  const handle = React.useCallback(async () => {
    const tokenAction = await dispatch(getAccessToken());
    if (getAccessToken.rejected.match(tokenAction)) {
      console.error(tokenAction.payload || tokenAction.error);
      return;
    }

    const callAction = await dispatch(
      makeOutgoingCallAction({
        to,
      }),
    );
    if (makeOutgoingCallAction.rejected.match(callAction)) {
      console.error(callAction.payload || callAction.error);
      return;
    }

    navigation.navigate('Call', {});
  }, [dispatch, navigation, to]);

  const isDisabled = React.useMemo(() => {
    return isDialerDisabled || outgoingNumber.length === 0;
  }, [isDialerDisabled, outgoingNumber]);

  return { handle, isDisabled };
};

/**
 * Hook for the dialer.
 * @returns - Handlers and state for the dialer.
 */
const useDialer = () => {
  const dispatch = useTypedDispatch();
  const navigation = useNavigation<StackNavigationProp<'App'>>();

  const activeCall = useActiveCall();

  const isDialerDisabled = React.useMemo(
    () =>
      match(activeCall)
        .with({ status: 'pending' }, () => true)
        .with(
          { status: 'fulfilled' },
          (c) => c.info.state !== TwilioCall.State.Disconnected,
        )
        .otherwise(() => false),
    [activeCall],
  );

  const [outgoingNumber, setOutgoingNumber] = React.useState<string>('');

  const dialpad = useDialpad(
    outgoingNumber,
    setOutgoingNumber,
    isDialerDisabled,
  );
  const makeCall = useMakeOutgoingCall(
    dispatch,
    navigation,
    outgoingNumber,
    isDialerDisabled,
  );

  return {
    dialpad,
    makeCall,
    outgoing: {
      number: {
        value: outgoingNumber,
        setValue: setOutgoingNumber,
      },
    },
  };
};

export default useDialer;
