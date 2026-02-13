import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import StatsSummary from '../components/StatsSummary';
import {
  getDayStats, getWeekStats,
  getDiaperDayStats, getDiaperWeekStats,
  getBottleDayStats, getBottleWeekStats,
  getFirstSessionDate, getDailyStatsForRange,
} from '../database';
import { getTodayDate, formatDateDisplay, formatDurationHuman } from '../utils/time';
import { DayStatistics, DiaperDayStats, DiaperWeekStats, BottleDayStats, BottleWeekStats } from '../types';
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, isBefore, parseISO } from 'date-fns';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── History types ───────────────────────────────────────────

interface WeekHistoryItem {
  label: string;       // e.g. "Feb 2 – 8"
  startDate: string;   // yyyy-MM-dd
  endDate: string;     // yyyy-MM-dd
  totalFeedings: number;
  totalDuration: number;
  avgPerDay: number;
  days: DayRow[];
}

interface DayRow {
  date: string;        // yyyy-MM-dd
  label: string;       // e.g. "Mon Feb 2"
  totalFeedings: number;
  totalDuration: number;
}

interface MonthHistoryItem {
  label: string;       // e.g. "January 2026"
  yearMonth: string;   // yyyy-MM
  totalFeedings: number;
  totalDuration: number;
  avgPerDay: number;
  weeks: WeekHistoryItem[];
}

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
  const [todayBottle, setTodayBottle] = useState<BottleDayStats | null>(null);
  const [yesterdayBottle, setYesterdayBottle] = useState<BottleDayStats | null>(null);
  const [weekBottle, setWeekBottle] = useState<BottleWeekStats | null>(null);

  // History state
  const [previousWeeks, setPreviousWeeks] = useState<WeekHistoryItem[]>([]);
  const [months, setMonths] = useState<MonthHistoryItem[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedMonthWeeks, setExpandedMonthWeeks] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (selectedBaby) {
      loadStats();
      loadHistory();
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

      // Bottle stats - today
      const todayBottleRow = await getBottleDayStats(selectedBaby.id, today);
      if (todayBottleRow) {
        setTodayBottle({
          bottleCount: todayBottleRow.bottle_count ?? 0,
          breastCount: todayBottleRow.breast_count ?? 0,
          totalVolume: todayBottleRow.total_volume ?? 0,
          avgVolume: Math.round(todayBottleRow.avg_volume ?? 0),
        });
      }

      // Bottle stats - yesterday
      const yesterdayBottleRow = await getBottleDayStats(selectedBaby.id, yesterday);
      if (yesterdayBottleRow) {
        setYesterdayBottle({
          bottleCount: yesterdayBottleRow.bottle_count ?? 0,
          breastCount: yesterdayBottleRow.breast_count ?? 0,
          totalVolume: yesterdayBottleRow.total_volume ?? 0,
          avgVolume: Math.round(yesterdayBottleRow.avg_volume ?? 0),
        });
      }

      // Bottle stats - week
      const weekBottleRow = await getBottleWeekStats(selectedBaby.id, weekStart, weekEnd);
      if (weekBottleRow) {
        const days = 7;
        setWeekBottle({
          bottleCount: weekBottleRow.bottle_count ?? 0,
          breastCount: weekBottleRow.breast_count ?? 0,
          totalVolume: weekBottleRow.total_volume ?? 0,
          avgVolume: Math.round(weekBottleRow.avg_volume ?? 0),
          avgDailyVolume: Math.round((weekBottleRow.total_volume ?? 0) / days),
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadHistory = async () => {
    if (!selectedBaby) return;
    try {
      const firstDate = await getFirstSessionDate(selectedBaby.id);
      if (!firstDate) return;

      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

      // ── Previous 3 weeks ──
      const prevWeeks: WeekHistoryItem[] = [];
      for (let i = 1; i <= 3; i++) {
        const ws = subWeeks(currentWeekStart, i);
        const we = endOfWeek(ws, { weekStartsOn: 1 });
        const wsStr = format(ws, 'yyyy-MM-dd');
        const weStr = format(we, 'yyyy-MM-dd');

        if (isBefore(parseISO(firstDate), we) || firstDate <= weStr) {
          const weekRow = await getWeekStats(selectedBaby.id, wsStr, weStr);
          const dailyRows = await getDailyStatsForRange(selectedBaby.id, wsStr, weStr);
          const totalFeedings = weekRow?.total_feedings ?? 0;
          const totalDuration = weekRow?.total_duration ?? 0;

          if (totalFeedings > 0) {
            const days: DayRow[] = dailyRows.map((r: any) => ({
              date: r.date,
              label: format(parseISO(r.date), 'EEE MMM d'),
              totalFeedings: r.total_feedings,
              totalDuration: r.total_duration,
            }));

            prevWeeks.push({
              label: `${format(ws, 'MMM d')} \u2013 ${format(we, 'MMM d')}`,
              startDate: wsStr,
              endDate: weStr,
              totalFeedings,
              totalDuration,
              avgPerDay: Math.round(totalFeedings / 7 * 10) / 10,
              days,
            });
          }
        }
      }
      setPreviousWeeks(prevWeeks);

      // ── Monthly history (older than 4 weeks) ──
      const fourWeeksAgo = subWeeks(currentWeekStart, 4);
      const firstDateParsed = parseISO(firstDate);
      const monthsList: MonthHistoryItem[] = [];

      let cursor = startOfMonth(fourWeeksAgo);
      const firstMonth = startOfMonth(firstDateParsed);

      while (!isBefore(cursor, firstMonth)) {
        const monthStart = cursor;
        const monthEnd = endOfMonth(cursor);
        const msStr = format(monthStart, 'yyyy-MM-dd');
        const meStr = format(monthEnd, 'yyyy-MM-dd');

        const monthRow = await getWeekStats(selectedBaby.id, msStr, meStr);
        const totalFeedings = monthRow?.total_feedings ?? 0;
        const totalDuration = monthRow?.total_duration ?? 0;

        if (totalFeedings > 0) {
          // Build weeks inside this month
          const monthWeeks: WeekHistoryItem[] = [];
          let weekCursor = startOfWeek(monthStart, { weekStartsOn: 1 });
          if (isBefore(weekCursor, monthStart)) weekCursor = monthStart;

          while (isBefore(weekCursor, monthEnd) || format(weekCursor, 'yyyy-MM-dd') <= meStr) {
            const wStart = weekCursor;
            const wEnd = endOfWeek(weekCursor, { weekStartsOn: 1 });
            // Clamp to month boundaries
            const clampedStart = isBefore(wStart, monthStart) ? monthStart : wStart;
            const clampedEnd = isBefore(monthEnd, wEnd) ? monthEnd : wEnd;
            const cwsStr = format(clampedStart, 'yyyy-MM-dd');
            const cweStr = format(clampedEnd, 'yyyy-MM-dd');

            const wRow = await getWeekStats(selectedBaby.id, cwsStr, cweStr);
            const wFeedings = wRow?.total_feedings ?? 0;

            if (wFeedings > 0) {
              const dailyRows = await getDailyStatsForRange(selectedBaby.id, cwsStr, cweStr);
              const days: DayRow[] = dailyRows.map((r: any) => ({
                date: r.date,
                label: format(parseISO(r.date), 'EEE MMM d'),
                totalFeedings: r.total_feedings,
                totalDuration: r.total_duration,
              }));

              const numDays = Math.max(1, Math.round((clampedEnd.getTime() - clampedStart.getTime()) / 86400000) + 1);
              monthWeeks.push({
                label: `${format(clampedStart, 'MMM d')} \u2013 ${format(clampedEnd, 'MMM d')}`,
                startDate: cwsStr,
                endDate: cweStr,
                totalFeedings: wFeedings,
                totalDuration: wRow?.total_duration ?? 0,
                avgPerDay: Math.round(wFeedings / numDays * 10) / 10,
                days,
              });
            }

            weekCursor = subWeeks(weekCursor, -1); // next week
            weekCursor = startOfWeek(weekCursor, { weekStartsOn: 1 });
            if (format(weekCursor, 'yyyy-MM-dd') > meStr) break;
          }

          const numDaysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000) + 1;
          monthsList.push({
            label: format(monthStart, 'MMMM yyyy'),
            yearMonth: format(monthStart, 'yyyy-MM'),
            totalFeedings,
            totalDuration,
            avgPerDay: Math.round(totalFeedings / numDaysInMonth * 10) / 10,
            weeks: monthWeeks,
          });
        }

        cursor = subMonths(cursor, 1);
        cursor = startOfMonth(cursor);
      }
      setMonths(monthsList);
    } catch (err) {
      console.error('Failed to load history:', err);
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

        {/* Bottle / Feeding Mode Statistics */}
        <View style={styles.sectionDivider}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🍼 Bottle Feeding</Text>
        </View>

        <BottleStatsCard
          title={`📅 Today — ${formatDateDisplay(getTodayDate())}`}
          stats={todayBottle}
          colors={colors}
        />

        <BottleStatsCard
          title={`📅 Yesterday — ${formatDateDisplay(yesterday)}`}
          stats={yesterdayBottle}
          colors={colors}
        />

        <BottleWeekStatsCard
          stats={weekBottle}
          colors={colors}
        />

        {/* ─── Previous Weeks ─────────────────────────── */}
        {previousWeeks.length > 0 && (
          <>
            <View style={styles.sectionDivider}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>📂 Previous Weeks</Text>
            </View>
            {previousWeeks.map((week) => (
              <View key={week.startDate} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.historyHeader}
                  activeOpacity={0.6}
                  onPress={() => toggleExpand(week.startDate, setExpandedWeeks)}
                >
                  <View style={styles.historyHeaderLeft}>
                    <Text style={[styles.historyHeaderTitle, { color: colors.text }]}>{week.label}</Text>
                    <Text style={[styles.historyHeaderSub, { color: colors.textSecondary }]}>
                      {week.totalFeedings} feeds {'\u00B7'} {formatDurationHuman(week.totalDuration)} {'\u00B7'} {week.avgPerDay}/day
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                    {expandedWeeks.has(week.startDate) ? '\u25B2' : '\u25BC'}
                  </Text>
                </TouchableOpacity>
                {expandedWeeks.has(week.startDate) && (
                  <View style={[styles.dayList, { borderTopColor: colors.border }]}>
                    {week.days.map((day) => (
                      <TouchableOpacity
                        key={day.date}
                        style={[styles.dayRow, { borderBottomColor: colors.border }]}
                        activeOpacity={0.6}
                        onPress={() => goToCalendar(day.date)}
                      >
                        <Text style={[styles.dayLabel, { color: colors.text }]}>{day.label}</Text>
                        <Text style={[styles.dayStat, { color: colors.textSecondary }]}>
                          {day.totalFeedings} feeds {'\u00B7'} {formatDurationHuman(day.totalDuration)}
                        </Text>
                        <Text style={[styles.dayArrow, { color: colors.primary }]}>{'\u203A'}</Text>
                      </TouchableOpacity>
                    ))}
                    {week.days.length === 0 && (
                      <Text style={[styles.emptyDayText, { color: colors.textSecondary }]}>No feeds this week</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* ─── Monthly History ────────────────────────── */}
        {months.length > 0 && (
          <>
            <View style={styles.sectionDivider}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>📆 Monthly History</Text>
            </View>
            {months.map((month) => (
              <View key={month.yearMonth} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.historyHeader}
                  activeOpacity={0.6}
                  onPress={() => toggleExpand(month.yearMonth, setExpandedMonths)}
                >
                  <View style={styles.historyHeaderLeft}>
                    <Text style={[styles.historyHeaderTitle, { color: colors.text }]}>{month.label}</Text>
                    <Text style={[styles.historyHeaderSub, { color: colors.textSecondary }]}>
                      {month.totalFeedings} feeds {'\u00B7'} {formatDurationHuman(month.totalDuration)} {'\u00B7'} {month.avgPerDay}/day
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                    {expandedMonths.has(month.yearMonth) ? '\u25B2' : '\u25BC'}
                  </Text>
                </TouchableOpacity>
                {expandedMonths.has(month.yearMonth) && (
                  <View style={[styles.dayList, { borderTopColor: colors.border }]}>
                    {month.weeks.map((week) => (
                      <View key={week.startDate}>
                        <TouchableOpacity
                          style={[styles.weekSubHeader, { borderBottomColor: colors.border }]}
                          activeOpacity={0.6}
                          onPress={() => toggleExpand(`${month.yearMonth}-${week.startDate}`, setExpandedMonthWeeks)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.weekSubTitle, { color: colors.text }]}>{week.label}</Text>
                            <Text style={[styles.weekSubStat, { color: colors.textSecondary }]}>
                              {week.totalFeedings} feeds {'\u00B7'} {formatDurationHuman(week.totalDuration)}
                            </Text>
                          </View>
                          <Text style={[styles.chevronSmall, { color: colors.textSecondary }]}>
                            {expandedMonthWeeks.has(`${month.yearMonth}-${week.startDate}`) ? '\u25B2' : '\u25BC'}
                          </Text>
                        </TouchableOpacity>
                        {expandedMonthWeeks.has(`${month.yearMonth}-${week.startDate}`) && (
                          <View style={{ paddingLeft: 12 }}>
                            {week.days.map((day) => (
                              <TouchableOpacity
                                key={day.date}
                                style={[styles.dayRow, { borderBottomColor: colors.border }]}
                                activeOpacity={0.6}
                                onPress={() => goToCalendar(day.date)}
                              >
                                <Text style={[styles.dayLabel, { color: colors.text }]}>{day.label}</Text>
                                <Text style={[styles.dayStat, { color: colors.textSecondary }]}>
                                  {day.totalFeedings} feeds {'\u00B7'} {formatDurationHuman(day.totalDuration)}
                                </Text>
                                <Text style={[styles.dayArrow, { color: colors.primary }]}>{'\u203A'}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
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

// ─── Ratio Bar Component ─────────────────────────────────

function RatioBar({ breastCount, bottleCount, colors }: { breastCount: number; bottleCount: number; colors: any }) {
  const total = breastCount + bottleCount;
  if (total === 0) return null;
  const breastPct = Math.round((breastCount / total) * 100);
  const bottlePct = 100 - breastPct;

  return (
    <View style={styles.ratioContainer}>
      <View style={styles.ratioLabels}>
        <Text style={[styles.ratioLabelText, { color: '#2A9D8F' }]}>🤱 Breast {breastPct}%</Text>
        <Text style={[styles.ratioLabelText, { color: '#E67E22' }]}>🍼 Bottle {bottlePct}%</Text>
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

// ─── Bottle Stats Card (Day) ─────────────────────────────

function BottleStatsCard({ title, stats, colors }: { title: string; stats: BottleDayStats | null; colors: any }) {
  if (!stats || (stats.bottleCount === 0 && stats.breastCount === 0)) {
    return (
      <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.diaperCardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.diaperCardEmpty, { color: colors.textSecondary }]}>
          No feeding sessions recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.diaperCardTitle, { color: colors.text }]}>{title}</Text>

      <RatioBar breastCount={stats.breastCount} bottleCount={stats.bottleCount} colors={colors} />

      {stats.bottleCount > 0 && (
        <View style={[styles.diaperStatsRow, { marginTop: 12 }]}>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>🍼</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.bottleCount}</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Bottles</Text>
          </View>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>🧪</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.totalVolume} ml</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>📊</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.avgVolume} ml</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Avg</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Bottle Stats Card (Week) ────────────────────────────

function BottleWeekStatsCard({ stats, colors }: { stats: BottleWeekStats | null; colors: any }) {
  if (!stats || (stats.bottleCount === 0 && stats.breastCount === 0)) {
    return (
      <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.diaperCardTitle, { color: colors.text }]}>📊 This Week</Text>
        <Text style={[styles.diaperCardEmpty, { color: colors.textSecondary }]}>
          No feeding sessions recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.diaperCardTitle, { color: colors.text }]}>📊 This Week</Text>

      <RatioBar breastCount={stats.breastCount} bottleCount={stats.bottleCount} colors={colors} />

      {stats.bottleCount > 0 && (
        <View style={[styles.diaperStatsRow, { marginTop: 12 }]}>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>🍼</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.bottleCount}</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Bottles</Text>
          </View>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>🧪</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.totalVolume} ml</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>📊</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.avgVolume} ml</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Avg</Text>
          </View>
          <View style={[styles.diaperStatItem, { backgroundColor: colors.background }]}>
            <Text style={styles.diaperStatEmoji}>📈</Text>
            <Text style={[styles.diaperStatValue, { color: '#E67E22' }]}>{stats.avgDailyVolume} ml</Text>
            <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>Avg/Day</Text>
          </View>
        </View>
      )}
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
  // ─── History styles ────────────────────────────────────
  historyCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  historyHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  historyHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyHeaderSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  chevronSmall: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },
  dayList: {
    borderTopWidth: 1,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dayStat: {
    fontSize: 13,
    fontWeight: '500',
  },
  dayArrow: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyDayText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  weekSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekSubTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  weekSubStat: {
    fontSize: 12,
    fontWeight: '500',
  },
});
