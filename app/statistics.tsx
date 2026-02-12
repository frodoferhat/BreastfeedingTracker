import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import StatsSummary from '../components/StatsSummary';
import { getDayStats, getWeekStats } from '../database';
import { getTodayDate, formatDateDisplay } from '../utils/time';
import { DayStatistics } from '../types';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const router = useRouter();
  const [todayStats, setTodayStats] = useState<DayStatistics | null>(null);
  const [weekStats, setWeekStats] = useState<DayStatistics | null>(null);
  const [yesterdayStats, setYesterdayStats] = useState<DayStatistics | null>(null);

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
      </ScrollView>
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
});
