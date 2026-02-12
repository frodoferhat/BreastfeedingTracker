import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { formatDuration } from '../utils/time';

interface ChronometerProps {
  elapsed: number; // seconds
  isRunning: boolean;
}

export default function Chronometer({ elapsed, isRunning }: ChronometerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.time,
          {
            color: isRunning ? colors.primary : colors.textSecondary,
          },
        ]}
      >
        {formatDuration(elapsed)}
      </Text>
      {isRunning ? (
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
      ) : (
        <View style={[styles.dot, { opacity: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  time: {
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 3,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 14,
  },
});
