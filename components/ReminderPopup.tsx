import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { DEFAULT_REMINDER_HOURS, DEFAULT_REMINDER_MINUTES } from '../constants';
import { formatDurationHuman } from '../utils/time';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 13 }, (_, i) => i); // 0–12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0–59

interface ReminderPopupProps {
  visible: boolean;
  sessionDuration: number;
  babyName: string;
  onSetReminder: (hours: number, minutes: number) => void;
  onSkip: () => void;
}

function WheelPicker({
  data,
  initial,
  onChange,
  colors,
}: {
  data: number[];
  initial: number;
  onChange: (value: number) => void;
  colors: any;
}) {
  const flatListRef = useRef<FlatList>(null);
  const initialIndex = data.indexOf(initial);

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, data.length - 1));
      onChange(data[clamped]);
    },
    [data, onChange]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={[pickerStyles.container, { height: PICKER_HEIGHT }]}>
      {/* Selection highlight */}
      <View
        style={[
          pickerStyles.highlight,
          {
            backgroundColor: colors.primaryLight,
            top: ITEM_HEIGHT,
          },
        ]}
        pointerEvents="none"
      />
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => item.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT,
        }}
        renderItem={({ item }) => (
          <View style={pickerStyles.item}>
            <Text
              style={[
                pickerStyles.itemText,
                { color: colors.text },
              ]}
            >
              {item.toString().padStart(2, '0')}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

export default function ReminderPopup({
  visible,
  sessionDuration,
  babyName,
  onSetReminder,
  onSkip,
}: ReminderPopupProps) {
  const { colors } = useTheme();
  const [hours, setHours] = useState(DEFAULT_REMINDER_HOURS);
  const [minutes, setMinutes] = useState(DEFAULT_REMINDER_MINUTES);

  const handleSetReminder = () => {
    if (hours === 0 && minutes === 0) return;
    onSetReminder(hours, minutes);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {'\uD83C\uDF89'} Feeding Complete!
          </Text>

          <Text style={[styles.duration, { color: colors.primary }]}>
            Duration: {formatDurationHuman(sessionDuration)}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Set a reminder for the next feeding?
          </Text>

          <View style={styles.pickerRow}>
            <View style={styles.pickerGroup}>
              <WheelPicker
                data={HOURS}
                initial={DEFAULT_REMINDER_HOURS}
                onChange={setHours}
                colors={colors}
              />
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
                hours
              </Text>
            </View>

            <Text style={[styles.colon, { color: colors.text }]}>:</Text>

            <View style={styles.pickerGroup}>
              <WheelPicker
                data={MINUTES}
                initial={DEFAULT_REMINDER_MINUTES}
                onChange={setMinutes}
                colors={colors}
              />
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
                min
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSetReminder}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>
              {'\uD83D\uDD14'} Set Reminder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            style={[styles.skipButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    width: 72,
    overflow: 'hidden',
    borderRadius: 12,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 10,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 26,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popup: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 22,
    paddingVertical: 30,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  duration: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  pickerGroup: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  skipButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
