import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';

interface PhoneNumberItemProps {
  phoneNumber: string;
  isCurrent: boolean;
  onRemove: () => void;
}

const formatPhoneNumber = (number: string) => {
  const cleaned = number.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  return number;
};

const PhoneNumberItem: React.FC<PhoneNumberItemProps> = ({
  phoneNumber,
  isCurrent,
  onRemove,
}) => {
  return (
    <Animated.View style={[styles.container, isCurrent && styles.currentItem]}>
      <TouchableOpacity style={styles.contentWrapper} activeOpacity={0.7}>
        <Text style={styles.phoneNumber}>{formatPhoneNumber(phoneNumber)}</Text>
        {isCurrent && <Text style={styles.currentLabel}>Active</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={onRemove}
        activeOpacity={0.6}>
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentItem: {
    backgroundColor: '#F8FFF9',
  },
  phoneNumber: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '400',
  },
  currentLabel: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
  },
  removeButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#FFEBEE',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    lineHeight: 16,
  },
});

export default PhoneNumberItem;
