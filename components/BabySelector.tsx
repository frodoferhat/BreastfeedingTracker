import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Baby } from '../types';

interface BabySelectorProps {
  babies: Baby[];
  selectedBaby: Baby | null;
  onSelect: (baby: Baby) => void;
  onAddBaby: () => void;
  onDeleteBaby?: (id: string) => void;
}

// Gender color coding
const GENDER_COLORS = {
  boy: { bg: '#DBEAFE', border: '#60A5FA', selectedBg: '#2563EB', text: '#1E3A5F' },
  girl: { bg: '#FCE7F3', border: '#F472B6', selectedBg: '#9D174D', text: '#831843' },
  default: { bg: undefined, border: undefined, selectedBg: undefined, text: undefined },
};

function getGenderStyle(gender?: string) {
  if (gender === 'boy') return GENDER_COLORS.boy;
  if (gender === 'girl') return GENDER_COLORS.girl;
  return GENDER_COLORS.default;
}

export default function BabySelector({
  babies,
  selectedBaby,
  onSelect,
  onAddBaby,
  onDeleteBaby,
}: BabySelectorProps) {
  const { colors } = useTheme();

  const handleLongPress = (baby: Baby) => {
    Alert.alert(
      'Delete Baby',
      `Are you sure you want to delete "${baby.name}"? All feeding sessions for this baby will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteBaby?.(baby.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {babies.map((baby) => {
          const isSelected = selectedBaby?.id === baby.id;
          const genderStyle = getGenderStyle(baby.gender);

          const chipBg = isSelected
            ? (genderStyle.selectedBg ?? colors.primary)
            : (genderStyle.bg ?? colors.surface);
          const chipBorder = isSelected
            ? (genderStyle.selectedBg ?? colors.primary)
            : (genderStyle.border ?? colors.border);
          const textColor = isSelected
            ? '#FFFFFF'
            : (genderStyle.text ?? colors.text);

          return (
            <TouchableOpacity
              key={baby.id}
              onPress={() => onSelect(baby)}
              onLongPress={() => handleLongPress(baby)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipIdle,
                {
                  backgroundColor: chipBg,
                  borderTopColor: isSelected
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(255,255,255,0.7)',
                  borderLeftColor: isSelected
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(255,255,255,0.5)',
                  borderBottomColor: isSelected
                    ? 'rgba(0,0,0,0.25)'
                    : 'rgba(0,0,0,0.12)',
                  borderRightColor: isSelected
                    ? 'rgba(0,0,0,0.15)'
                    : 'rgba(0,0,0,0.08)',
                  shadowColor: isSelected
                    ? (genderStyle.selectedBg ?? colors.primary)
                    : '#000',
                },
              ]}
            >
              {isSelected && (
                <Text style={styles.tickMark}>{'\u2713'}</Text>
              )}
              <Text style={[styles.chipEmoji]}>
                {'\uD83D\uDC76'}
              </Text>
              <Text
                style={[styles.chipText, { color: textColor }]}
              >
                {baby.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={onAddBaby}
          style={[
            styles.chip,
            styles.chipIdle,
            styles.addChip,
            {
              backgroundColor: colors.surface,
              borderTopColor: 'rgba(255,255,255,0.6)',
              borderLeftColor: 'rgba(255,255,255,0.4)',
              borderBottomColor: 'rgba(0,0,0,0.1)',
              borderRightColor: 'rgba(0,0,0,0.06)',
              shadowColor: '#000',
            },
          ]}
        >
          <Text style={[styles.chipText, { color: colors.primary }]}>
            + Add Baby
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 6,
  },
  chipSelected: {
    borderTopWidth: 2,
    borderLeftWidth: 1.5,
    borderBottomWidth: 3,
    borderRightWidth: 1.5,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  chipIdle: {
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderBottomWidth: 2.5,
    borderRightWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  chipEmoji: {
    fontSize: 18,
  },
  tickMark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chipText: {
    fontSize: 17,
    fontWeight: '600',
  },
  addChip: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },
});