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
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentItem: {
    backgroundColor: colors.activeCall.background,
    borderColor: colors.activeCall.border,
    borderWidth: 1,
  },
  phoneNumber: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  currentLabel: {
    fontSize: 12,
    color: colors.activeCall.border,
    fontWeight: '500',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: `${colors.activeCall.border}20`,
    borderRadius: 4,
  },
  removeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: `${colors.danger}15`,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '600',
    lineHeight: 16,
  },
});

export default PhoneNumberItem;
