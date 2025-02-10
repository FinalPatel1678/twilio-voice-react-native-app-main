import { Call as TwilioCall } from '@twilio/voice-react-native-sdk';
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { match } from 'ts-pattern';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse } from 'papaparse';
import { useActiveCall } from '../hooks/activeCall';
import { makeOutgoingCall } from '../store/voice/call/outgoingCall';
import PhoneNumberItem from '../components/PhoneNumberItem';
import { useDispatch } from 'react-redux';
import { colors } from '../theme/colors';

const isValidPhoneNumber = (number: string) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(number.replace(/[\s-()]/g, ''));
};

const AutoDialer: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [delay, setDelay] = useState<number>(1000);
  const [parsedPhoneNumbers, setParsedPhoneNumbers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [dialerStatus, setDialerStatus] = useState<
    'idle' | 'running' | 'paused'
  >('idle');
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(
    null,
  );

  const activeCall = useActiveCall();
  const dispatch = useDispatch();

  const fadeAnim = useState(new Animated.Value(1))[0];
  const progressValue = useState(new Animated.Value(0))[0];

  const isCallActive = React.useMemo(
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

  useEffect(() => {
    if (!isCallActive && dialerStatus === 'running') {
      makeNextCall();
    }
  }, [isCallActive, dialerStatus]);

  const animateStatusChange = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const makeNextCall = async () => {
    if (currentIndex >= parsedPhoneNumbers.length) {
      setDialerStatus('idle');
      setCurrentPhoneNumber(null);
      return;
    }

    if (dialerStatus !== 'running') {
      return;
    }

    const nextNumber = parsedPhoneNumbers[currentIndex];
    setCurrentPhoneNumber(nextNumber);
    try {
      await dispatch(makeOutgoingCall({ to: nextNumber }));
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.error(`Failed to call ${nextNumber}:`, error);
      setCurrentIndex((prev) => prev + 1);
      makeNextCall();
    }

    Animated.timing(progressValue, {
      toValue: currentIndex / parsedPhoneNumbers.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
    animateStatusChange();
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const [fileData, dialerData] = await Promise.all([
          AsyncStorage.getItem('previousFile'),
          AsyncStorage.getItem('dialerState'),
        ]);

        if (fileData) {
          const parsedFile = JSON.parse(fileData);
          setFileName(parsedFile.fileName);
          setParsedPhoneNumbers(parsedFile.phoneNumbers);
        }

        if (dialerData) {
          const parsedDialerState = JSON.parse(dialerData);
          setDialerStatus(parsedDialerState.status);
          setCurrentIndex(parsedDialerState.currentIndex);
          setDelay(parsedDialerState.delay);
          setCurrentPhoneNumber(parsedDialerState.currentPhoneNumber);
        }
      } catch (error) {
        console.error('Error loading state:', error);
        setErrorMessage('Failed to load previous state');
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    const saveDialerState = async () => {
      try {
        const dialerState = {
          status: dialerStatus,
          currentIndex,
          delay,
          currentPhoneNumber,
        };
        await AsyncStorage.setItem('dialerState', JSON.stringify(dialerState));
      } catch (error) {
        console.error('Error saving dialer state:', error);
      }
    };
    saveDialerState();
  }, [dialerStatus, currentIndex, delay, currentPhoneNumber]);

  const handleFilePick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setDialerStatus('idle');

      const res = await pick({
        type: [types.csv],
        allowMultiSelection: false,
      });

      if (!res || res.length === 0) {
        throw new Error('No file selected');
      }

      const selectedFileName = res[0].name;
      const fileUri = res[0].uri;

      const response = await fetch(fileUri);
      const fileContent = await response.text();

      const parsedData = parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (!parsedData.meta.fields?.includes('phoneNumber')) {
        throw new Error('CSV must have a "phoneNumber" column');
      }

      const phoneNumbers = parsedData.data
        .map((row: any) => row.phoneNumber?.trim())
        .filter((number: string) => {
          if (!number) {
            return false;
          }
          const isValid = isValidPhoneNumber(number);
          return isValid;
        });

      if (phoneNumbers.length === 0) {
        throw new Error('No valid phone numbers found in the CSV');
      }

      const fileData = {
        fileName: selectedFileName,
        phoneNumbers,
      };

      await AsyncStorage.setItem('previousFile', JSON.stringify(fileData));

      setParsedPhoneNumbers(phoneNumbers);
      setFileName(selectedFileName);
    } catch (err) {
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log('User cancelled the picker');
      } else {
        setErrorMessage(
          err.message || 'Failed to load CSV file. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearStoredFile = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('previousFile'),
        AsyncStorage.removeItem('dialerState'),
      ]);
      setFileName(null);
      setParsedPhoneNumbers([]);
      setDialerStatus('idle');
      setCurrentIndex(0);
      setCurrentPhoneNumber(null);
    } catch (err) {
      console.error('Error clearing state:', err);
    }
  };

  const handleRemoveFile = () => {
    Alert.alert(
      'Remove File',
      'Are you sure you want to remove the current file?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: clearStoredFile,
        },
      ],
    );
  };

  const handleStartAutoDialing = () => {
    setCurrentIndex(0);
    setDialerStatus('running');
    makeNextCall();
  };

  const handlePauseAutoDialing = () => {
    setDialerStatus('paused');
  };

  const handleResumeAutoDialing = () => {
    setDialerStatus('running');
  };

  const handleStopAutoDialing = () => {
    setCurrentIndex(0);
    setDialerStatus('idle');
    setCurrentPhoneNumber(null);
  };

  const handleDelayChange = (text: string) => {
    const numValue = Number(text);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }
    setDelay(numValue);
  };

  const handleRemoveNumber = (index: number) => {
    const newNumbers = [...parsedPhoneNumbers];
    newNumbers.splice(index, 1);
    setParsedPhoneNumbers(newNumbers);

    if (fileName) {
      const fileData = {
        fileName,
        phoneNumbers: newNumbers,
      };
      AsyncStorage.setItem('previousFile', JSON.stringify(fileData));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {dialerStatus !== 'idle' && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        )}
        <View style={styles.uploadSection}>
          <View style={styles.fileActions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.uploadButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleFilePick}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {fileName ? 'Change File' : 'Select CSV'}
                </Text>
              )}
            </TouchableOpacity>
            {fileName && (
              <TouchableOpacity
                style={[styles.button, styles.removeButton]}
                onPress={handleRemoveFile}>
                <Text style={styles.buttonText}>Remove File</Text>
              </TouchableOpacity>
            )}
          </View>
          {fileName && <Text style={styles.subtitle}>File: {fileName}</Text>}
          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        </View>

        <View style={styles.controls}>
          <View style={styles.delayRow}>
            <Text style={styles.delayLabel}>Delay (ms):</Text>
            <TextInput
              style={styles.input}
              placeholder="1000"
              keyboardType="numeric"
              value={delay.toString()}
              onChangeText={handleDelayChange}
            />
          </View>

          <View style={styles.buttonRow}>
            {dialerStatus === 'idle' && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={handleStartAutoDialing}
                disabled={
                  dialerStatus !== 'idle' ||
                  parsedPhoneNumbers.length <= 0 ||
                  isCallActive
                }>
                <Text style={styles.buttonText}>Start Auto Dialer</Text>
              </TouchableOpacity>
            )}

            {dialerStatus === 'running' && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={handlePauseAutoDialing}>
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>
            )}

            {dialerStatus === 'paused' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.actionButton]}
                  onPress={handleResumeAutoDialing}>
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.stopButton]}
                  onPress={handleStopAutoDialing}>
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <Animated.View style={[styles.statusBar, { opacity: fadeAnim }]}>
          {currentPhoneNumber ? (
            <Text style={styles.statusText}>
              Calling: {currentPhoneNumber} ({currentIndex + 1}/
              {parsedPhoneNumbers.length})
            </Text>
          ) : (
            <Text style={styles.statusText}>Ready to start</Text>
          )}
        </Animated.View>
      </View>

      <FlatList
        style={styles.list}
        data={parsedPhoneNumbers}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item, index }) => (
          <PhoneNumberItem
            phoneNumber={item}
            isCurrent={item === currentPhoneNumber}
            onRemove={() => handleRemoveNumber(index)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Select a CSV file to load numbers
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 2,
    padding: 6,
    marginBottom: 10,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: colors.progressBar.background,
  },
  uploadSection: {
    marginBottom: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[600],
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  controls: {
    gap: 8,
  },
  delayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  delayLabel: {
    fontSize: 14,
    color: colors.neutral[900],
  },
  input: {
    flex: 1,
    height: 38,
        borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[100],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.button.secondary,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
  },
  statusBar: {
    marginTop: 10,
    padding: 8,
    backgroundColor: colors.activeCall.background,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.neutral[600],
    fontSize: 14,
    padding: 14,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    backgroundColor: colors.button.danger,
  },
  stopButton: {
    flex: 1,
    backgroundColor: colors.button.danger,
  },
});

export default AutoDialer;
