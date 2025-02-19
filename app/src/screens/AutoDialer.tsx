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
import { useActiveCall } from '../hooks/activeCall';
import { makeOutgoingCall } from '../store/voice/call/outgoingCall';
import PhoneNumberItem from '../components/PhoneNumberItem';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import {
  getPhoneNumbers,
  setSelectedNumber,
} from '../store/voice/phoneNumbers';

const isValidPhoneNumber = (number: string) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(number.replace(/[\s-()]/g, ''));
};

const AutoDialer: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [delay, setDelay] = useState<number>(1); // Use seconds instead of milliseconds
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [callDuration, setCallDuration] = useState<number>(86400); // Default 24 hours
  const activeCall = useActiveCall();
  const dispatch = useDispatch();
  const {
    phoneNumbers,
    selectedNumber,
    loading: phoneNumbersLoading,
  } = useSelector((state) => state.voice.phoneNumbers);
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

  const handleDurationChange = (text: string) => {
    const numValue = Number(text);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }
    setCallDuration(numValue);
  };

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
    console.log(
      `[AutoDialer] Making next call, current index: ${currentIndex}`,
    );
    if (currentIndex >= parsedPhoneNumbers.length) {
      console.log('[AutoDialer] Reached end of phone number list');
      setDialerStatus('idle');
      setCurrentPhoneNumber(null);
      return;
    }

    if (dialerStatus !== 'running') {
      console.log(`[AutoDialer] Dialer not running, status: ${dialerStatus}`);
      return;
    }

    // Add delay before making the next call
    await new Promise((resolve) => setTimeout(resolve, delay * 1000)); // Convert seconds to milliseconds

    const nextNumber = parsedPhoneNumbers[currentIndex];
    console.log(`[AutoDialer] Calling number: ${nextNumber}`);
    setCurrentPhoneNumber(nextNumber);

    try {
      await dispatch(
        makeOutgoingCall({
          to: nextNumber,
          duration: callDuration,
        }),
      );
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.error(`[AutoDialer] Failed to call ${nextNumber}:`, error);
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
      console.log('[AutoDialer] Loading previous state');
      setIsInitialLoading(true);
      try {
        const [fileData, dialerData, savedNumber] = await Promise.all([
          AsyncStorage.getItem('previousFile'),
          AsyncStorage.getItem('dialerState'),
          AsyncStorage.getItem('selectedNumber'),
        ]);

        console.log('[AutoDialer] Raw stored data:', {
          fileData: fileData || 'null',
          dialerData: dialerData || 'null',
        });

        if (fileData) {
          try {
            const parsedFile = JSON.parse(fileData);
            console.log('[AutoDialer] Parsed file data:', parsedFile);
            if (parsedFile?.phoneNumbers?.length > 0 && parsedFile.fileName) {
              setFileName(parsedFile.fileName);
              setParsedPhoneNumbers(parsedFile.phoneNumbers);
              console.log('[AutoDialer] Successfully restored file data');
            } else {
              console.warn('[AutoDialer] Invalid file data structure');
            }
          } catch (parseError) {
            console.error('[AutoDialer] Error parsing file data:', parseError);
          }
        }

        if (dialerData) {
          try {
            const parsedDialerState = JSON.parse(dialerData);
            console.log('[AutoDialer] Parsed dialer state:', parsedDialerState);
            if (parsedDialerState) {
              setDialerStatus(parsedDialerState.status || 'idle');
              setCurrentIndex(parsedDialerState.currentIndex || 0);
              setDelay(parsedDialerState.delay || 1);
              setCurrentPhoneNumber(
                parsedDialerState.currentPhoneNumber || null,
              );
              setCallDuration(parsedDialerState.callDuration || 86400);
              console.log('[AutoDialer] Successfully restored dialer state');
            }
          } catch (parseError) {
            console.error(
              '[AutoDialer] Error parsing dialer state:',
              parseError,
            );
          }
        }

        if (savedNumber) {
          dispatch(setSelectedNumber(savedNumber));
        }
      } catch (error) {
        console.error('[AutoDialer] Error loading state:', error);
        setErrorMessage('Failed to load previous state');
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    const saveDialerState = async () => {
      if (isInitialLoading) {
        return;
      }

      try {
        const dialerState = {
          status: dialerStatus,
          currentIndex,
          delay,
          currentPhoneNumber,
          callDuration,
        };

        const fileData =
          fileName && parsedPhoneNumbers.length > 0
            ? { fileName, phoneNumbers: parsedPhoneNumbers }
            : null;

        console.log('[AutoDialer] Attempting to save state:', {
          dialerState,
          fileData,
        });

        await Promise.all([
          AsyncStorage.setItem('dialerState', JSON.stringify(dialerState)),
          fileData
            ? AsyncStorage.setItem('previousFile', JSON.stringify(fileData))
            : AsyncStorage.removeItem('previousFile'),
        ]);

        console.log('[AutoDialer] Successfully saved state');
      } catch (error) {
        console.error('[AutoDialer] Error saving state:', error);
        setErrorMessage('Failed to save state');
      }
    };

    // Debounce the save operation to prevent too frequent writes
    const timeoutId = setTimeout(saveDialerState, 300);
    return () => clearTimeout(timeoutId);
  }, [
    dialerStatus,
    currentIndex,
    delay,
    currentPhoneNumber,
    fileName,
    isInitialLoading,
    parsedPhoneNumbers,
    callDuration,
  ]);

  const handleFilePick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setDialerStatus('idle');
    try {
      const res = await pick({
        allowMultiSelection: false,
        type: [types.csv],
      });

      if (!res || res.length === 0) {
        throw new Error('No file selected');
      }

      const fileUri = res[0].uri;
      const selectedFileName = res[0].name;
      const response = await fetch(fileUri);
      const fileContent = await response.text();

      // Split content by common delimiters (comma or semicolon)
      const numbers = fileContent
        .split(/[,;]/)
        .map((num) => num.trim())
        .filter((num) => {
          if (!num) {
            return false;
          }
          // Remove any newlines, spaces, or carriage returns
          const cleanNumber = num.replace(/[\n\r\s]/g, '');
          return isValidPhoneNumber(cleanNumber);
        });

      if (numbers.length === 0) {
        throw new Error('No valid phone numbers found in the file');
      }

      const fileData = {
        fileName: selectedFileName,
        phoneNumbers: numbers,
      };

      await AsyncStorage.setItem('previousFile', JSON.stringify(fileData));

      setParsedPhoneNumbers(numbers);
      setFileName(selectedFileName);
    } catch (err) {
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log('User cancelled the picker');
      } else {
        setErrorMessage(
          err.message || 'Failed to load file. Please try again.',
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

  const handleRefreshNumbers = () => {
    dispatch(getPhoneNumbers(true)); // Force refresh
  };

  const handleNumberSelect = (number: string) => {
    dispatch(setSelectedNumber(number));
    AsyncStorage.setItem('selectedNumber', number);
  };

  const renderPhoneNumberSelector = () => (
    <View style={styles.phoneNumberSection}>
      <View style={styles.phoneNumberHeader}>
        <TouchableOpacity
          style={styles.dropdownContainer}
          onPress={() => setShowDropdown(!showDropdown)}>
          {phoneNumbersLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.button.primary}
              style={styles.dropdownLoader}
            />
          ) : (
            <Text style={styles.numberText} numberOfLines={1}>
              {selectedNumber || 'Select a number to call from'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.refreshButton,
            phoneNumbersLoading && styles.buttonDisabled,
          ]}
          onPress={handleRefreshNumbers}
          disabled={phoneNumbersLoading}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {showDropdown && !phoneNumbersLoading && (
        <View style={styles.dropdownMenu}>
          {phoneNumbers.map((number) => (
            <TouchableOpacity
              key={number}
              style={[
                styles.dropdownOption,
                selectedNumber === number && styles.selectedOption,
              ]}
              onPress={() => {
                handleNumberSelect(number);
                setShowDropdown(false);
              }}>
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedNumber === number && styles.selectedOptionText,
                ]}>
                {number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {showDropdown && phoneNumbersLoading && (
        <View style={[styles.dropdownMenu, styles.loadingDropdown]}>
          <ActivityIndicator size="small" color={colors.button.primary} />
        </View>
      )}
    </View>
  );

  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.button.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.uploadSection}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.uploadButton,
            (isLoading || dialerStatus !== 'idle') && styles.buttonDisabled,
          ]}
          onPress={handleFilePick}
          disabled={isLoading || dialerStatus !== 'idle' || isCallActive}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {fileName ? 'Change File' : 'Select CSV'}
            </Text>
          )}
        </TouchableOpacity>
        {fileName && dialerStatus === 'idle' && !isCallActive && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.removeButton,
              dialerStatus !== 'idle' && styles.buttonDisabled,
            ]}
            disabled={dialerStatus !== 'idle'}
            onPress={handleRemoveFile}>
            <Text style={styles.buttonText}>Remove File</Text>
          </TouchableOpacity>
        )}
      </View>
      {fileName && <Text style={styles.subtitle}>File: {fileName}</Text>}
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {renderPhoneNumberSelector()}

      <View style={styles.controls}>
        <View style={styles.inputsContainer}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Delay (s):</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              keyboardType="numeric"
              value={delay.toString()}
              onChangeText={handleDelayChange}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Duration (s):</Text>
            <TextInput
              style={styles.input}
              placeholder="60"
              keyboardType="numeric"
              value={callDuration.toString()}
              onChangeText={handleDurationChange}
            />
          </View>
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
            Calling: {currentPhoneNumber} ({currentIndex}/
            {parsedPhoneNumbers.length})
          </Text>
        ) : (
          <Text style={styles.statusText}>Ready to start</Text>
        )}
      </Animated.View>

      <FlatList
        style={styles.list}
        data={parsedPhoneNumbers}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item, index }) => (
          <PhoneNumberItem
            phoneNumber={item}
            isCurrent={item === currentPhoneNumber}
            onRemove={
              // Allow removal if number is not currently being called
              item > currentPhoneNumber || dialerStatus === 'idle'
                ? () => handleRemoveNumber(index)
                : undefined
            }
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
    backgroundColor: '#ffffff',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  uploadSection: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  button: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 8,
  },
  controls: {
    marginBottom: 8,
  },
  inputsContainer: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#000000',
    width: 100,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  statusBar: {
    padding: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: -16, // This will make the list stretch edge to edge
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    padding: 16,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  phoneNumberSection: {
    marginBottom: 12,
  },
  phoneNumberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberText: {
    color: '#666666',
    fontSize: 16,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  selectedOption: {
    backgroundColor: '#F2F2F7',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#000000',
    fontFamily: 'System', // Use system font for better number rendering
    letterSpacing: 0.5, // Improve number readability
  },
  selectedOptionText: {
    color: '#007AFF',
  },
  loadingDropdown: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownLoader: {
    marginRight: 8,
  },
});

export default AutoDialer;
