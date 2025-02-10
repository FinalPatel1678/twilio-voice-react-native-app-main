import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

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
      <TouchableOpacity
        style={styles.removeButton}
        onPress={onRemove}
        activeOpacity={0.7} // Add a slight opacity change on press
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  currentItem: {
    backgroundColor: colors.activeCall.background, // Highlight the current item
    borderLeftWidth: 4,
    borderLeftColor: colors.activeCall.border, // Add a border to indicate active state
  },
  phoneNumber: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500', // Slightly bolder for better readability
  },
  removeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    width: 30, // Fixed width for consistency
    height: 30, // Fixed height for consistency
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    color: colors.danger,
    fontWeight: '600',
    lineHeight: 20, // Ensure the "×" is centered vertically
  },
});

export default PhoneNumberItem;