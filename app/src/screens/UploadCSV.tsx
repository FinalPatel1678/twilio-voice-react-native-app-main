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
} from 'react-native';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse } from 'papaparse';
import { useDispatch, useSelector } from 'react-redux';
import {
  startAutoCalling,
  pauseAutoCalling,
  resumeAutoCalling,
  resetAutoCalling,
} from '../store/voice/autoCall';
import PhoneNumberItem from '../components/PhoneNumberItem';
import { State } from '../store/app';

const isValidPhoneNumber = (number: string) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(number.replace(/[\s-()]/g, ''));
};

const UploadCSV: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [delay, setDelay] = useState<number>(1000);
  const [parsedPhoneNumbers, setParsedPhoneNumbers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dispatch = useDispatch();
  const { currentPhoneNumber, dialerStatus } = useSelector(
    (state: State) => state.voice.autoCall,
  );

  useEffect(() => {
    const loadPreviousFile = async () => {
      try {
        const file = await AsyncStorage.getItem('previousFile');
        console.log('Loaded previous file data:', file);
        if (file) {
          const parsedFile = JSON.parse(file);
          console.log('Parsed file data:', parsedFile);
          setFileName(parsedFile.fileName);
          setParsedPhoneNumbers(parsedFile.phoneNumbers);
        }
      } catch (error) {
        console.error('Error loading previous file:', error);
        setErrorMessage('Failed to load previous file');
      }
    };
    loadPreviousFile();
  }, []);

  const handleFilePick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      dispatch(resetAutoCalling());

      const res = await pick({
        type: [types.csv],
        allowMultiSelection: false,
      });

      if (!res || res.length === 0) {
        throw new Error('No file selected');
      }

      const selectedFileName = res[0].name;
      const fileUri = res[0].uri;

      console.log('Selected file:', selectedFileName, fileUri);

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

      console.log('Storing file data:', fileData);
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
      await AsyncStorage.removeItem('previousFile');
      setFileName(null);
      setParsedPhoneNumbers([]);
      dispatch(resetAutoCalling());
    } catch (err) {
      console.error('Error clearing file:', err);
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
    dispatch(startAutoCalling({ phoneNumbers: parsedPhoneNumbers, delay }));
  };

  const handlePauseAutoDialing = () => {
    dispatch(pauseAutoCalling());
  };

  const handleResumeAutoDialing = () => {
    dispatch(resumeAutoCalling());
  };

  const handleStopAutoDialing = () => {
    dispatch(resetAutoCalling());
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
            <TextInput
              style={styles.input}
              placeholder="Delay (ms)"
              keyboardType="numeric"
              value={delay.toString()}
              onChangeText={handleDelayChange}
            />
          </View>

          <View style={styles.buttonRow}>
            {dialerStatus === 'idle' && parsedPhoneNumbers.length > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={handleStartAutoDialing}>
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

        {currentPhoneNumber && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Calling: {currentPhoneNumber}</Text>
          </View>
        )}
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
    backgroundColor: '#f8f9fa',
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadSection: {
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  error: {
    color: '#dc3545',
    fontSize: 13,
    marginTop: 8,
  },
  controls: {
    gap: 12,
  },
  delayRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6c757d',
  },
  statusBar: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#495057',
  },
  list: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 15,
    padding: 20,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#dc3545',
  },
});

export default UploadCSV;
