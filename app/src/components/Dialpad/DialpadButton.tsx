import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { colors } from '../../theme/colors';

export type Props = {
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  testID?: string;
};

const DialpadButton: React.FC<Props> = ({
  disabled,
  title,
  subtitle,
  onPress,
  onLongPress,
  testID,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500} // Add this line to make long press more responsive
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}>
      <View style={styles.content}>
        <Text style={[styles.title, disabled && styles.textDisabled]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, disabled && styles.textDisabled]}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#F2F2F7',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 1,
    textAlign: 'center',
  },
  textDisabled: {
    color: '#C7C7CC',
  },
});

export default DialpadButton;
