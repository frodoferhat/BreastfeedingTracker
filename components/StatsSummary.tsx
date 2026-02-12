import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { DayStatistics } from '../types';
import { formatDurationHuman } from '../utils/time';

interface StatsSummaryProps {
  stats: DayStatistics | null;
  title: string;
  onTotalFeedingsPress?: () => void;
}

export default function StatsSummary({ stats, title, onTotalFeedingsPress }: StatsSummaryProps) {
  const { colors } = useTheme();

  if (!stats || stats.totalFeedings === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          No feeding sessions recorded
        </Text>
      </View>
    );
  }

  const cards = [
    { label: 'Total Feedings', value: stats.totalFeedings.toString(), icon: '\uD83C\uDF7C', onPress: onTotalFeedingsPress },
    { label: 'Total Time', value: formatDurationHuman(stats.totalDuration), icon: '\u23F1\uFE0F' },
    { label: 'Average', value: formatDurationHuman(Math.round(stats.averageDuration)), icon: '\uD83D\uDCCA' },
    { label: 'Longest', value: formatDurationHuman(stats.longestSession), icon: '\uD83D\uDCC8' },
    { label: 'Shortest', value: formatDurationHuman(stats.shortestSession), icon: '\uD83D\uDCC9' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.grid}>
        {cards.map((card) => {
          const Wrapper = card.onPress ? TouchableOpacity : View;
          return (
            <Wrapper
              key={card.label}
              onPress={card.onPress}
              style={[
                styles.statCard,
                { backgroundColor: colors.background },
                card.onPress ? styles.tappableCard : undefined,
                card.onPress ? { borderColor: colors.primary } : undefined,
              ]}
            >
              <Text style={styles.icon}>{card.icon}</Text>
              <View style={styles.statCardContent}>
                <Text style={[styles.statValue, { color: card.onPress ? colors.primary : colors.text }]}>
                  {card.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {card.label}
                </Text>
              </View>
              {card.onPress && (
                <Text style={[styles.tapHint, { color: colors.primary }]}>
                  View Logs {'\u203A'}
                </Text>
              )}
            </Wrapper>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  grid: {
    flexDirection: 'column',
    gap: 10,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  statCardContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  tappableCard: {
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '600',
  },
});
