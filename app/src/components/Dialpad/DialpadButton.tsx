import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Button, { type Props as ButtonProps } from '../Button';
import { colors } from '../../theme/colors';

export type Props = {
  title: string;
  subtitle: string;
} & Pick<ButtonProps, 'disabled' | 'onPress'>;

const DialpadButton: React.FC<Props> = ({
  disabled,
  title,
  subtitle,
  onPress,
}) => (
  <Button
    disabled={disabled}
    size={96}
    onPress={onPress}
    style={styles.button}
    pressedStyle={styles.buttonPressed}
    testID={`dialpad_button_${title}`}>
    <Text style={[styles.title, disabled && styles.disabled]}>{title}</Text>
    <Text style={[styles.subtitle, disabled && styles.disabled]}>{subtitle}</Text>
  </Button>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderRadius: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonPressed: {
    backgroundColor: colors.divider,
    transform: [{ scale: 0.98 }],
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  disabled: {
    color: colors.text.disabled,
  },
});

export default DialpadButton;
