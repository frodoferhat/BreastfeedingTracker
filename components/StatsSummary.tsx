import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { DayStatistics, BottleDayStats, BottleWeekStats } from '../types';
import { formatDurationHuman } from '../utils/time';

interface StatsSummaryProps {
  stats: DayStatistics | null;
  title: string;
  onTotalFeedingsPress?: () => void;
  bottleStats?: BottleDayStats | null;
  bottleWeekStats?: BottleWeekStats | null;
  isWeek?: boolean;
}

// ─── Ratio Bar (inline) ──────────────────────────────────

function RatioBar({ breastCount, bottleCount, colors }: { breastCount: number; bottleCount: number; colors: any }) {
  const total = breastCount + bottleCount;
  if (total === 0) return null;
  const breastPct = Math.round((breastCount / total) * 100);
  const bottlePct = 100 - breastPct;

  return (
    <View style={styles.ratioContainer}>
      <View style={styles.ratioLabels}>
        <Text style={[styles.ratioLabelText, { color: '#2A9D8F' }]}>{'\uD83E\uDD31'} Breast {breastPct}%</Text>
        <Text style={[styles.ratioLabelText, { color: '#E67E22' }]}>{'\uD83C\uDF7C'} Bottle {bottlePct}%</Text>
      </View>
      <View style={[styles.ratioBarTrack, { backgroundColor: colors.background }]}>
        {breastPct > 0 && (
          <View style={[styles.ratioBarSegment, { flex: breastPct, backgroundColor: '#2A9D8F', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderTopRightRadius: bottlePct === 0 ? 6 : 0, borderBottomRightRadius: bottlePct === 0 ? 6 : 0 }]} />
        )}
        {bottlePct > 0 && (
          <View style={[styles.ratioBarSegment, { flex: bottlePct, backgroundColor: '#E67E22', borderTopRightRadius: 6, borderBottomRightRadius: 6, borderTopLeftRadius: breastPct === 0 ? 6 : 0, borderBottomLeftRadius: breastPct === 0 ? 6 : 0 }]} />
        )}
      </View>
      <View style={styles.ratioLabels}>
        <Text style={[styles.ratioCounts, { color: colors.textSecondary }]}>{breastCount} feeds</Text>
        <Text style={[styles.ratioCounts, { color: colors.textSecondary }]}>{bottleCount} feeds</Text>
      </View>
    </View>
  );
}

export default function StatsSummary({ stats, title, onTotalFeedingsPress, bottleStats, bottleWeekStats, isWeek }: StatsSummaryProps) {
  const { colors } = useTheme();

  // Determine bottle data from either day or week props
  const bStats = bottleWeekStats ?? bottleStats;
  const hasBottle = bStats && bStats.bottleCount > 0;
  const hasMixed = bStats && (bStats.bottleCount > 0 || bStats.breastCount > 0) && bStats.bottleCount > 0;

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
  ];

  // Only show longest/shortest for daily cards (not week)
  if (!isWeek) {
    cards.push(
      { label: 'Longest', value: formatDurationHuman(stats.longestSession), icon: '\uD83D\uDCC8' },
      { label: 'Shortest', value: formatDurationHuman(stats.shortestSession), icon: '\uD83D\uDCC9' },
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {/* Ratio bar — only when bottles exist */}
      {hasMixed && bStats && (
        <View style={{ marginBottom: 14 }}>
          <RatioBar breastCount={bStats.breastCount} bottleCount={bStats.bottleCount} colors={colors} />
        </View>
      )}

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

      {/* Bottle volume details — only when bottles exist */}
      {hasBottle && bStats && (
        <View style={styles.bottleSection}>
          <View style={styles.bottleDivider} />
          <View style={styles.bottleRow}>
            <View style={[styles.bottleItem, { backgroundColor: colors.background }]}>
              <Text style={styles.bottleEmoji}>{'\uD83C\uDF7C'}</Text>
              <Text style={[styles.bottleValue, { color: '#E67E22' }]}>{bStats.bottleCount}</Text>
              <Text style={[styles.bottleLabel, { color: colors.textSecondary }]}>Bottles</Text>
            </View>
            <View style={[styles.bottleItem, { backgroundColor: colors.background }]}>
              <Text style={styles.bottleEmoji}>{'\uD83E\uDDEA'}</Text>
              <Text style={[styles.bottleValue, { color: '#E67E22' }]}>{bStats.totalVolume} ml</Text>
              <Text style={[styles.bottleLabel, { color: colors.textSecondary }]}>Total Vol</Text>
            </View>
            <View style={[styles.bottleItem, { backgroundColor: colors.background }]}>
              <Text style={styles.bottleEmoji}>{'\uD83D\uDCCA'}</Text>
              <Text style={[styles.bottleValue, { color: '#E67E22' }]}>{bStats.avgVolume} ml</Text>
              <Text style={[styles.bottleLabel, { color: colors.textSecondary }]}>Avg Vol</Text>
            </View>
            {isWeek && bottleWeekStats && (
              <View style={[styles.bottleItem, { backgroundColor: colors.background }]}>
                <Text style={styles.bottleEmoji}>{'\uD83D\uDCC8'}</Text>
                <Text style={[styles.bottleValue, { color: '#E67E22' }]}>{bottleWeekStats.avgDailyVolume} ml</Text>
                <Text style={[styles.bottleLabel, { color: colors.textSecondary }]}>Avg/Day</Text>
              </View>
            )}
          </View>
        </View>
      )}
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
  // ─── Ratio bar styles ──────────────────────────────────
  ratioContainer: {
    gap: 6,
  },
  ratioLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratioLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ratioBarTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 6,
    overflow: 'hidden',
  },
  ratioBarSegment: {
    height: '100%',
  },
  ratioCounts: {
    fontSize: 11,
    fontWeight: '500',
  },
  // ─── Bottle volume section ─────────────────────────────
  bottleSection: {
    marginTop: 14,
  },
  bottleDivider: {
    height: 1,
    backgroundColor: '#E67E2240',
    marginBottom: 12,
  },
  bottleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bottleItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  bottleEmoji: {
    fontSize: 22,
  },
  bottleValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottleLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
