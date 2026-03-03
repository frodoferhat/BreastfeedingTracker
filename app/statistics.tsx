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
  getSleepDayStats, getSleepWeekStats,
} from '../database';
import { getTodayDate, formatDateDisplay, formatDurationHuman } from '../utils/time';
import { DayStatistics, DiaperDayStats, DiaperWeekStats, BottleDayStats, BottleWeekStats, SleepDayStats, SleepWeekStats } from '../types';
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

  // Sleep stats
  const [todaySleep, setTodaySleep] = useState<SleepDayStats | null>(null);
  const [yesterdaySleep, setYesterdaySleep] = useState<SleepDayStats | null>(null);
  const [weekSleep, setWeekSleep] = useState<SleepWeekStats | null>(null);

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

      // ── Sleep stats ──
      const todaySleepRow = await getSleepDayStats(selectedBaby.id, today);
      if (todaySleepRow) {
        setTodaySleep({
          totalSleeps: todaySleepRow.total_sleeps ?? 0,
          totalDuration: todaySleepRow.total_duration ?? 0,
          longestSleep: todaySleepRow.longest_sleep ?? 0,
          napCount: todaySleepRow.nap_count ?? 0,
          nightCount: todaySleepRow.night_count ?? 0,
        });
      }

      const yesterdaySleepRow = await getSleepDayStats(selectedBaby.id, yesterday);
      if (yesterdaySleepRow) {
        setYesterdaySleep({
          totalSleeps: yesterdaySleepRow.total_sleeps ?? 0,
          totalDuration: yesterdaySleepRow.total_duration ?? 0,
          longestSleep: yesterdaySleepRow.longest_sleep ?? 0,
          napCount: yesterdaySleepRow.nap_count ?? 0,
          nightCount: yesterdaySleepRow.night_count ?? 0,
        });
      }

      const weekSleepRow = await getSleepWeekStats(selectedBaby.id, weekStart, weekEnd);
      if (weekSleepRow) {
        setWeekSleep({
          totalSleeps: weekSleepRow.total_sleeps ?? 0,
          totalDuration: weekSleepRow.total_duration ?? 0,
          longestSleep: weekSleepRow.longest_sleep ?? 0,
          napCount: weekSleepRow.nap_count ?? 0,
          nightCount: weekSleepRow.night_count ?? 0,
          avgPerDay: Math.round((weekSleepRow.total_sleeps ?? 0) / 7 * 10) / 10,
          avgDuration: Math.round(weekSleepRow.avg_duration ?? 0),
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

        {/* Growth Tracking Button */}
        <TouchableOpacity
          style={[styles.growthButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.push('/growth')}
        >
          <Text style={styles.growthButtonEmoji}>📏</Text>
          <View style={styles.growthButtonContent}>
            <Text style={[styles.growthButtonTitle, { color: colors.text }]}>Baby Growth</Text>
            <Text style={[styles.growthButtonSub, { color: colors.textSecondary }]}>
              Track weight, height & head circumference
            </Text>
          </View>
          <Text style={[styles.growthButtonArrow, { color: colors.primary }]}>{'\u203A'}</Text>
        </TouchableOpacity>

        <StatsSummary
          stats={todayStats}
          title={`\uD83D\uDCC5 Today \u2014 ${formatDateDisplay(getTodayDate())}`}
          onTotalFeedingsPress={() => goToCalendar(today)}
          bottleStats={todayBottle}
        />

        <StatsSummary
          stats={yesterdayStats}
          title={`\uD83D\uDCC5 Yesterday \u2014 ${formatDateDisplay(yesterday)}`}
          onTotalFeedingsPress={() => goToCalendar(yesterday)}
          bottleStats={yesterdayBottle}
        />

        <StatsSummary
          stats={weekStats}
          title={'\uD83D\uDCCA This Week'}
          bottleWeekStats={weekBottle}
          isWeek
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

        {/* ─── Sleep Statistics ───────────────────────── */}
        <View style={styles.sectionDivider}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>😴 Sleep Tracking</Text>
        </View>

        <SleepStatsCard
          title={`📅 Today — ${formatDateDisplay(getTodayDate())}`}
          stats={todaySleep}
          colors={colors}
          onPress={() => router.push('/sleep')}
        />

        <SleepStatsCard
          title={`📅 Yesterday — ${formatDateDisplay(yesterday)}`}
          stats={yesterdaySleep}
          colors={colors}
        />

        <SleepWeekStatsCard
          stats={weekSleep}
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

const DIAPER_COLOR = '#F59E0B';

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

  const rows = [
    { label: 'Total', value: stats.total.toString(), icon: '🧷', tappable: !!onTotalPress },
    { label: 'Pee', value: stats.totalPee.toString(), icon: '💧' },
    { label: 'Poop', value: stats.totalPoop.toString(), icon: '💩' },
  ];

  return (
    <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.diaperCardTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.diaperGrid}>
        {rows.map((row) => {
          const Wrapper = row.tappable && onTotalPress ? TouchableOpacity : View;
          return (
            <Wrapper
              key={row.label}
              onPress={row.tappable ? onTotalPress : undefined}
              style={[
                styles.diaperStatRow,
                { backgroundColor: colors.background },
                row.tappable ? { borderWidth: 1.5, borderColor: DIAPER_COLOR } : undefined,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.diaperStatIcon}>{row.icon}</Text>
              <View style={styles.diaperStatContent}>
                <Text style={[styles.diaperStatValue, { color: row.tappable ? DIAPER_COLOR : colors.text }]}>
                  {row.value}
                </Text>
                <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>
                  {row.label}
                </Text>
              </View>
              {row.tappable && onTotalPress && (
                <Text style={[styles.diaperTapHint, { color: DIAPER_COLOR }]}>View ›</Text>
              )}
            </Wrapper>
          );
        })}
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

  const rows = [
    { label: 'Total', value: stats.total.toString(), icon: '🧷' },
    { label: 'Pee', value: stats.totalPee.toString(), icon: '💧' },
    { label: 'Poop', value: stats.totalPoop.toString(), icon: '💩' },
    { label: 'Avg / Day', value: stats.avgPerDay.toString(), icon: '📈' },
  ];

  return (
    <View style={[styles.diaperCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.diaperCardTitle, { color: colors.text }]}>📊 This Week</Text>
      <View style={styles.diaperGrid}>
        {rows.map((row) => (
          <View
            key={row.label}
            style={[styles.diaperStatRow, { backgroundColor: colors.background }]}
          >
            <Text style={styles.diaperStatIcon}>{row.icon}</Text>
            <View style={styles.diaperStatContent}>
              <Text style={[styles.diaperStatValue, { color: colors.text }]}>
                {row.value}
              </Text>
              <Text style={[styles.diaperStatLabel, { color: colors.textSecondary }]}>
                {row.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Sleep Stats Card (Day) ──────────────────────────────

const SLEEP_COLOR = '#6C5CE7';

function SleepStatsCard({ title, stats, colors, onPress }: { title: string; stats: SleepDayStats | null; colors: any; onPress?: () => void }) {
  if (!stats || stats.totalSleeps === 0) {
    return (
      <View style={[styles.sleepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sleepCardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sleepCardEmpty, { color: colors.textSecondary }]}>
          No sleep recorded
        </Text>
      </View>
    );
  }

  const rows = [
    { label: 'Total Sleeps', value: stats.totalSleeps.toString(), icon: '😴', tappable: !!onPress },
    { label: 'Total Time', value: formatDurationHuman(stats.totalDuration), icon: '⏱️' },
    { label: 'Longest', value: formatDurationHuman(stats.longestSleep), icon: '📈' },
  ];
  if (stats.napCount > 0) rows.push({ label: 'Naps', value: `${stats.napCount}`, icon: '☀️' });
  if (stats.nightCount > 0) rows.push({ label: 'Nights', value: `${stats.nightCount}`, icon: '🌙' });

  return (
    <View style={[styles.sleepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sleepCardTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sleepGrid}>
        {rows.map((row) => {
          const Wrapper = row.tappable && onPress ? TouchableOpacity : View;
          return (
            <Wrapper
              key={row.label}
              onPress={row.tappable ? onPress : undefined}
              style={[
                styles.sleepStatRow,
                { backgroundColor: colors.background },
                row.tappable ? { borderWidth: 1.5, borderColor: SLEEP_COLOR } : undefined,
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.sleepStatIcon}>{row.icon}</Text>
              <View style={styles.sleepStatContent}>
                <Text style={[styles.sleepStatValue, { color: row.tappable ? SLEEP_COLOR : colors.text }]}>
                  {row.value}
                </Text>
                <Text style={[styles.sleepStatLabel, { color: colors.textSecondary }]}>
                  {row.label}
                </Text>
              </View>
              {row.tappable && onPress && (
                <Text style={[styles.sleepTapHint, { color: SLEEP_COLOR }]}>View ›</Text>
              )}
            </Wrapper>
          );
        })}
      </View>
    </View>
  );
}

// ─── Sleep Stats Card (Week) ─────────────────────────────

function SleepWeekStatsCard({ stats, colors }: { stats: SleepWeekStats | null; colors: any }) {
  if (!stats || stats.totalSleeps === 0) {
    return (
      <View style={[styles.sleepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sleepCardTitle, { color: colors.text }]}>📊 This Week</Text>
        <Text style={[styles.sleepCardEmpty, { color: colors.textSecondary }]}>
          No sleep recorded
        </Text>
      </View>
    );
  }

  const rows = [
    { label: 'Total Sleeps', value: stats.totalSleeps.toString(), icon: '😴' },
    { label: 'Total Time', value: formatDurationHuman(stats.totalDuration), icon: '⏱️' },
    { label: 'Average', value: formatDurationHuman(stats.avgDuration), icon: '📊' },
    { label: 'Longest', value: formatDurationHuman(stats.longestSleep), icon: '📈' },
    { label: 'Per Day', value: stats.avgPerDay.toString(), icon: '📅' },
  ];
  if (stats.napCount > 0) rows.push({ label: 'Naps', value: `${stats.napCount}`, icon: '☀️' });
  if (stats.nightCount > 0) rows.push({ label: 'Nights', value: `${stats.nightCount}`, icon: '🌙' });

  return (
    <View style={[styles.sleepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sleepCardTitle, { color: colors.text }]}>📊 This Week</Text>
      <View style={styles.sleepGrid}>
        {rows.map((row) => (
          <View
            key={row.label}
            style={[styles.sleepStatRow, { backgroundColor: colors.background }]}
          >
            <Text style={styles.sleepStatIcon}>{row.icon}</Text>
            <View style={styles.sleepStatContent}>
              <Text style={[styles.sleepStatValue, { color: colors.text }]}>
                {row.value}
              </Text>
              <Text style={[styles.sleepStatLabel, { color: colors.textSecondary }]}>
                {row.label}
              </Text>
            </View>
          </View>
        ))}
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
  growthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  growthButtonEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  growthButtonContent: {
    flex: 1,
    gap: 2,
  },
  growthButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  growthButtonSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  growthButtonArrow: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 8,
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
  diaperGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  diaperStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  diaperStatIcon: {
    fontSize: 24,
  },
  diaperStatContent: {
    flex: 1,
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
  // ─── Sleep styles ──────────────────────────────────────
  sleepCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sleepCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  sleepCardEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sleepGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  sleepStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  sleepStatIcon: {
    fontSize: 24,
  },
  sleepStatContent: {
    flex: 1,
  },
  sleepStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sleepStatLabel: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  sleepTapHint: {
    fontSize: 12,
    fontWeight: '600',
  },
});
