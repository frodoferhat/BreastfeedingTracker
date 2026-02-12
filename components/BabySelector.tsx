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
                { backgroundColor: chipBg, borderColor: chipBorder },
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
            styles.addChip,
            { borderColor: colors.border, backgroundColor: colors.surface },
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
    borderWidth: 1.5,
    gap: 6,
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
  },
});