import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import StatsSummary from '../components/StatsSummary';
import { getDayStats, getWeekStats, getDiaperDayStats, getDiaperWeekStats } from '../database';
import { getTodayDate, formatDateDisplay } from '../utils/time';
import { DayStatistics, DiaperDayStats, DiaperWeekStats } from '../types';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const router = useRouter();
  const [todayStats, setTodayStats] = useState<DayStatistics | null>(null);
  const [weekStats, setWeekStats] = useState<DayStatistics | null>(null);
  const [yesterdayStats, setYesterdayStats] = useState<DayStatistics | null>(null);
  const [todayDiaper, setTodayDiaper] = useState<DiaperDayStats | null>(null);
  const [yesterdayDiaper, setYesterdayDiaper] = useState<DiaperDayStats | null>(null);
  const [weekDiaper, setWeekDiaper] = useState<DiaperWeekStats | null>(null);

  useEffect(() => {
    if (selectedBaby) {
      loadStats();
    }
  }, [selectedBaby]);

  const loadStats = async () => {
    if (!selectedBaby) return;

    const today = getTodayDate();
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    try {
      // Today stats
      const todayRow = await getDayStats(selectedBaby.id, today);
      if (todayRow) {
        setTodayStats({
          date: today,
          totalFeedings: todayRow.total_feedings,
          totalDuration: todayRow.total_duration,
          averageDuration: todayRow.avg_duration,
          longestSession: todayRow.longest_session,
          shortestSession: todayRow.shortest_session,
        });
      }

      // Yesterday stats
      const yesterdayRow = await getDayStats(selectedBaby.id, yesterday);
      if (yesterdayRow) {
        setYesterdayStats({
          date: yesterday,
          totalFeedings: yesterdayRow.total_feedings,
          totalDuration: yesterdayRow.total_duration,
          averageDuration: yesterdayRow.avg_duration,
          longestSession: yesterdayRow.longest_session,
          shortestSession: yesterdayRow.shortest_session,
        });
      }

      // Week stats
      const weekRow = await getWeekStats(selectedBaby.id, weekStart, weekEnd);
      if (weekRow) {
        setWeekStats({
          date: weekStart,
          totalFeedings: weekRow.total_feedings,
          totalDuration: weekRow.total_duration,
          averageDuration: weekRow.avg_duration,
          longestSession: 0,
          shortestSession: 0,
        });
      }

      // Diaper stats - today
      const todayDiaperRow = await getDiaperDayStats(selectedBaby.id, today);
      if (todayDiaperRow) {
        setTodayDiaper({
          date: today,
          totalPee: todayDiaperRow.total_pee ?? 0,
          totalPoop: todayDiaperRow.total_poop ?? 0,
          total: todayDiaperRow.total ?? 0,
        });
      }

      // Diaper stats - yesterday
      const yesterdayDiaperRow = await getDiaperDayStats(selectedBaby.id, yesterday);
      if (yesterdayDiaperRow) {
        setYesterdayDiaper({
          date: yesterday,
          totalPee: yesterdayDiaperRow.total_pee ?? 0,
          totalPoop: yesterdayDiaperRow.total_poop ?? 0,
          total: yesterdayDiaperRow.total ?? 0,
        });
      }

      // Diaper stats - week
      const weekDiaperRow = await getDiaperWeekStats(selectedBaby.id, weekStart, weekEnd);
      if (weekDiaperRow) {
        const days = 7;
        setWeekDiaper({
          totalPee: weekDiaperRow.total_pee ?? 0,
          totalPoop: weekDiaperRow.total_poop ?? 0,
          total: weekDiaperRow.total ?? 0,
          avgPerDay: Math.round((weekDiaperRow.total ?? 0) / days * 10) / 10,
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (!selectedBaby) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Please add a baby first to view statistics
          </Text>
        </View>
      </View>
    );
  }

  const today = getTodayDate();
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const goToCalendar = (date: string) => {
    router.push({ pathname: '/calendar', params: { date } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.babyHeader}>
          <Text style={[styles.babyName, { color: colors.text }]}>
            {'\uD83D\uDC76'} {selectedBaby.name}
          </Text>
        </View>

        <StatsSummary
          stats={todayStats}
          title={`\uD83D\uDCC5 Today \u2014 ${formatDateDisplay(getTodayDate())}`}
          onTotalFeedingsPress={() => goToCalendar(today)}
        />

        <StatsSummary
          stats={yesterdayStats}
          title={`\uD83D\uDCC5 Yesterday \u2014 ${formatDateDisplay(yesterday)}`}
          onTotalFeedingsPress={() => goToCalendar(yesterday)}
        />

        <StatsSummary
          stats={weekStats}
          title={'\uD83D\uDCCA This Week'}
        />

        {/* Diaper Statistics */}
        <View style={styles.sectionDivider}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🧷 Diaper Changes</Text>
        </View>

        <DiaperStatsCard
          title={`📅 Today — ${formatDateDisplay(getTodayDate())}`}
          stats={todayDiaper}
          colors={colors}
          onTotalPress={() => router.push('/diaper-logs')}
        />

        <DiaperStatsCard
          title={`📅 Yesterday — ${formatDateDisplay(yesterday)}`}
          stats={yesterdayDiaper}
          colors={colors}
          onTotalPress={() => router.push('/diaper-logs')}
        />

        <DiaperWeekStatsCard
          stats={weekDiaper}
          colors={colors}
        />
      </ScrollView>
    </View>
  );
}

// ─── Diaper Stats Card (Day) ─────────────────────────────

function DiaperStatsCard({ title, stats, colors, onTotalPress }: { title: string; stats: DiaperDayStats | null; colors: any; onTotalPress?: () => void }) {
  if (!stats || stats.total === 0) {
    return (
      <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.diaperCardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.diaperCardEmpty, { color: colors.textSecondary }]}>
          No diaper changes recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.diaperCardTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.diaperStatsRow}>
        <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
          <Text style={styles.diaperStatEmoji}>💧</Text>
          <Text style={[styles.diaperStatValue, { color: '#3B82F6' }]}>{stats.totalPee}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Pee</Text>
        </View>
        <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
          <Text style={styles.diaperStatEmoji}>💩</Text>
          <Text style={[styles.diaperStatValue, { color: '#92400E' }]}>{stats.totalPoop}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Poop</Text>
        </View>
        <TouchableOpacity
          onPress={onTotalPress}
          style={[styles.diaperStatItem, { backgroundColor: colors.background, borderWidth: onTotalPress ? 1.5 : 0, borderColor: colors.primary }]}
          activeOpacity={0.7}
          disabled={!onTotalPress}
        >
          <Text style={styles.diaperStatEmoji}>🧷</Text>
          <Text style={[styles.diaperStatValue, { color: onTotalPress ? colors.primary : colors.text }]}>{stats.total}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Total</Text>
          {onTotalPress && (
            <Text style={[styles.diaperTapHint, { color: colors.primary }]}>View ›</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Diaper Stats Card (Week) ────────────────────────────

function DiaperWeekStatsCard({ stats, colors }: { stats: DiaperWeekStats | null; colors: any }) {
  if (!stats || stats.total === 0) {
    return (
      <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.diaperCardTitle, { color: colors.text }]}>📊 This Week</Text>
        <Text style={[styles.diaperCardEmpty, { color: colors.textSecondary }]}>
          No diaper changes recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.diaperCardTitle, { color: colors.text }]}>📊 This Week</Text>
      <View style={styles.diaperStatsRow}>
        <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
          <Text style={styles.diaperStatEmoji}>💧</Text>
          <Text style={[styles.diaperStatValue, { color: '#3B82F6' }]}>{stats.totalPee}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Pee</Text>
        </View>
        <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
          <Text style={styles.diaperStatEmoji}>💩</Text>
          <Text style={[styles.diaperStatValue, { color: '#92400E' }]}>{stats.totalPoop}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Poop</Text>
        </View>
        <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
          <Text style={styles.diaperStatEmoji}>🧷</Text>
          <Text style={[styles.diaperStatValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
          <Text style={styles.diaperStatEmoji}>📈</Text>
          <Text style={[styles.diaperStatValue, { color: colors.text }]}>{stats.avgPerDay}</Text>
          <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Avg/Day</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  babyHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  babyName: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  sectionDivider: {
    marginTop: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  diaperCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  diaperCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  diaperCardEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  diaperStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  diaperStatItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  diaperStatEmoji: {
    fontSize: 24,
  },
  diaperStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  diaperStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diaperTapHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
