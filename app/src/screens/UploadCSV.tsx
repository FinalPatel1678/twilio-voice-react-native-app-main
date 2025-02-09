import React, { useState, useEffect } from 'react';
import {
  Button,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native';
import { pick, types } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse } from 'papaparse';
import { useDispatch, useSelector } from 'react-redux';
import {
  startAutoCalling,
  pauseAutoCalling,
  resumeAutoCalling,
  skipCurrentCall,
} from '../store/voice/autoCall';
import PhoneNumberItem from '../components/PhoneNumberItem';
import { State } from '../store/app';
import { makeOutgoingCall } from '../store/voice/call/outgoingCall';

const UploadCSV: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [delay, setDelay] = useState<number>(1000);
  const [parsedPhoneNumbers, setParsedPhoneNumbers] = useState<string[]>([]);
  
  const dispatch = useDispatch();
  const {  currentPhoneNumber, status } = useSelector(
    (state: State) => state.voice.autoCall,
  );

  useEffect(() => {
    const loadPreviousFile = async () => {
      const file = await AsyncStorage.getItem('previousFile');
      if (file) {
        const { fileName, phoneNumbers } = JSON.parse(file);
        setFileName(fileName);
        setParsedPhoneNumbers(phoneNumbers);
      }
    };
    loadPreviousFile();
  }, []);

  const handleFilePick = async () => {
    try {
      const res = await pick({
        type: [types.csv],
        allowMultiSelection: false,
      });
      const selectedFileName = res[0].name;
      setFileName(selectedFileName);

      const fileUri = res[0].uri;
      const response = await fetch(fileUri);
      const fileContent = await response.text();
      const parsedData = parse(fileContent, { header: true });
      const phoneNumbers = parsedData.data.map((row: any) => row.phoneNumber);

      // Store the selected file name and phone numbers
      const fileData = {
        fileName: selectedFileName,
        phoneNumbers,
      };
      await AsyncStorage.setItem('previousFile', JSON.stringify(fileData));

      setParsedPhoneNumbers(phoneNumbers);
    } catch (err) {
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log('User cancelled the picker');
      } else {
        throw err;
      }
    }
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

  const handleSkipCurrentCall = () => {
    dispatch(skipCurrentCall());
  };

  const handleCallContact = (phoneNumber: string) => {
    dispatch(makeOutgoingCall({ to: phoneNumber }));
  };

  const handleDelayChange = (text: string) => {
    const numValue = Number(text);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }
    setDelay(numValue);
  };

  return (
    <View style={styles.container}>
      <Button title="Select CSV File" onPress={handleFilePick} />
      {fileName && <Text>Selected File: {fileName}</Text>}
      <View style={styles.buttonContainer}>
        <Button title="Start Auto-Dialing" onPress={handleStartAutoDialing} />
        <Button title="Pause" onPress={handlePauseAutoDialing} />
        <Button title="Resume" onPress={handleResumeAutoDialing} />
        <Button title="Skip Current Call" onPress={handleSkipCurrentCall} />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Delay between calls (ms)"
        keyboardType="numeric"
        value={delay.toString()}
        onChangeText={handleDelayChange}
      />
      <FlatList
        data={parsedPhoneNumbers}
        keyExtractor={(item) => `${item}${Date.now()}`}
        renderItem={({ item }) => (
          <PhoneNumberItem
            phoneNumber={item}
            isCurrent={item === currentPhoneNumber}
            onCall={() => handleCallContact(item)}
            onSkip={() => handleSkipCurrentCall()}
          />
        )}
        ListHeaderComponent={<Text>Phone Numbers:</Text>}
      />
      {status === 'pending' && (
        <Text style={styles.statusText}>
          Calling: {currentPhoneNumber}. Next call in {delay} ms.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    width: '100%',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 8,
    width: '100%',
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: 'blue',
  },
});

export default UploadCSV;
