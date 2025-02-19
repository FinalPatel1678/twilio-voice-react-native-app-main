import React from 'react';
import { View, StyleSheet } from 'react-native';
import DialpadButton, { type Props as DialpadButtonProps } from './DialpadButton';

const DIALPAD_DATA: [string, string][][] = [
  [
    ['1', ''],
    ['2', 'ABC'],
    ['3', 'DEF'],
  ],
  [
    ['4', 'GHI'],
    ['5', 'JKL'],
    ['6', 'MNO'],
  ],
  [
    ['7', 'PQRS'],
    ['8', 'TUV'],
    ['9', 'WXYZ'],
  ],
  [
    ['*', ''],
    ['0', '+'],
    ['#', ''],
  ],
];

export type Props = {
  data?: [string, string][][];
  onPress?: (value: string) => void;
  onLongPress?: (value: string) => void;
} & Pick<DialpadButtonProps, 'disabled'>;

const Dialpad: React.FC<Props> = ({
  disabled,
  onPress,
  onLongPress,
  data = DIALPAD_DATA,
}) => {
  const handleButtonPress = React.useCallback(
    (value: string) => {
      if (onPress) {
        onPress(value);
      }
    },
    [onPress]
  );

  const handleButtonLongPress = React.useCallback(
    (value: string) => {
      // For '0' button, send '+' to the parent component
      if (value === '0' && onLongPress) {
        onLongPress('+');
      }
    },
    [onLongPress]
  );

  const mapCol = React.useCallback(
    ([title, subtitle]: [string, string], buttonIdx: number) => (
      <View key={buttonIdx} style={styles.button}>
        <DialpadButton
          disabled={disabled}
          title={title}
          subtitle={subtitle}
          onPress={() => handleButtonPress(title)}
          onLongPress={() => handleButtonLongPress(title)}
          testID={`dialpad_button_${title}`}
        />
      </View>
    ),
    [disabled, handleButtonPress, handleButtonLongPress]
  );

  const mapRow = React.useCallback(
    (rowData: [string, string][], rowIdx: number) => (
      <View key={rowIdx} style={[styles.row, rowIdx === data.length - 1 && styles.lastRow]}>
        {rowData.map(mapCol)}
      </View>
    ),
    [mapCol],
  );

  return (
    <View style={styles.container}>
      {React.useMemo(() => data.map(mapRow), [data, mapRow])}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 6,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  lastRow: {
    marginBottom: 0,
  },
  button: {
    width: '32%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Dialpad;
