import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PhoneNumberItemProps {
  phoneNumber: string;
  isCurrent: boolean;
  onRemove: () => void;
}

const PhoneNumberItem: React.FC<PhoneNumberItemProps> = ({
  phoneNumber,
  isCurrent,
  onRemove,
}) => {
  return (
    <View style={[styles.container, isCurrent && styles.currentItem]}>
      <Text style={styles.phoneNumber}>{phoneNumber}</Text>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentItem: {
    backgroundColor: '#e9ecef',
  },
  phoneNumber: {
    fontSize: 16,
    color: '#212529',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
    color: '#dc3545',
    fontWeight: 'bold',
  },
});

export default PhoneNumberItem;
