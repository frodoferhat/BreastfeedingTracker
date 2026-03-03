import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { useSleepSession } from '../hooks/useSleepSession';
import Chronometer from '../components/Chronometer';
import BabySelector from '../components/BabySelector';
import AddBabyModal from '../components/AddBabyModal';
import { formatTime, formatDurationHuman, getTodayDate } from '../utils/time';
import {
  getSleepSessionsByBabyAndDate,
  getSleepDayStats,
  deleteSleepSession,
} from '../database';

// ─── Constants ───────────────────────────────────────────────

const BUTTON_SIZE = Dimensions.get('window').width * 0.55;
const SLEEP_COLOR = '#6C5CE7';
const SLEEP_ACTIVE = '#A29BFE';
const WAKE_COLOR = '#FDCB6E';

// ─── Sleep Button Component ─────────────────────────────────

function SleepButton({
  isSleeping,
  onPress,
}: {
  isSleeping: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.sleepButton,
        {
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: BUTTON_SIZE / 2,
          backgroundColor: isSleeping ? SLEEP_ACTIVE : SLEEP_COLOR,
          // 3D bevel — matched to FeedingButton
          borderTopWidth: 2.5,
          borderLeftWidth: 1.5,
          borderBottomWidth: 3,
          borderRightWidth: 1.5,
          borderTopColor: isSleeping
            ? 'rgba(255,255,255,0.35)'
            : 'rgba(255,255,255,0.25)',
          borderLeftColor: isSleeping
            ? 'rgba(255,255,255,0.25)'
            : 'rgba(255,255,255,0.15)',
          borderBottomColor: isSleeping
            ? 'rgba(0,0,0,0.3)'
            : 'rgba(0,0,0,0.35)',
          borderRightColor: isSleeping
            ? 'rgba(0,0,0,0.2)'
            : 'rgba(0,0,0,0.25)',
          shadowColor: isSleeping ? WAKE_COLOR : SLEEP_COLOR,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 14,
          elevation: 14,
        },
      ]}
    >
      <Text style={styles.sleepButtonEmoji}>
        {isSleeping ? '☀️' : '🌙'}
      </Text>
      <Text style={styles.sleepButtonText}>
        {isSleeping ? 'Wake Up' : 'Sleep'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export default function SleepScreen() {
  const { colors } = useTheme();
  const { babies, selectedBaby, selectBaby, addBaby, removeBaby } = useBaby();
  const {
    isSleeping,
    elapsed,
    sleepType,
    lastSleepInfo,
    toggleSleep,
    loadLastSleep,
  } = useSleepSession(selectedBaby?.id ?? null);

  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [dayStats, setDayStats] = useState<any>(null);
  const [showAddBaby, setShowAddBaby] = useState(false);

  // "Time since last sleep" ticker
  const [timeSinceLast, setTimeSinceLast] = useState<number | null>(null);
  useEffect(() => {
    if (isSleeping || !lastSleepInfo?.endTime) {
      setTimeSinceLast(null);
      return;
    }
    const calc = () => {
      const endMs = new Date(lastSleepInfo.endTime.replace(' ', 'T')).getTime();
      setTimeSinceLast(Math.max(0, Math.floor((Date.now() - endMs) / 1000)));
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [isSleeping, lastSleepInfo?.endTime]);

  const loadToday = useCallback(async () => {
    if (!selectedBaby) return;
    const today = getTodayDate();
    const [sessions, stats] = await Promise.all([
      getSleepSessionsByBabyAndDate(selectedBaby.id, today),
      getSleepDayStats(selectedBaby.id, today),
    ]);
    setTodaySessions(sessions);
    setDayStats(stats);
  }, [selectedBaby]);

  useEffect(() => {
    loadToday();
  }, [selectedBaby?.id, isSleeping]);

  const handleToggle = useCallback(async () => {
    if (!selectedBaby) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await toggleSleep();
    if (result) {
      loadToday();
    }
  }, [selectedBaby, toggleSleep, loadToday]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Sleep', 'Remove this sleep record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSleepSession(id);
          loadToday();
          loadLastSleep();
        },
      },
    ]);
  };

  const handleAddBaby = async (name: string, birthDate?: string, gender?: 'boy' | 'girl') => {
    await addBaby(name, birthDate, gender);
    setShowAddBaby(false);
  };

  const formatTimeSince = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
  };

  const sleepTypeLabel = (type: string) =>
    type === 'night' ? '🌙 Night Sleep' : '☀️ Nap';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Baby Selector — same as home screen */}
      <BabySelector
        babies={babies}
        selectedBaby={selectedBaby}
        onSelect={selectBaby}
        onAddBaby={() => setShowAddBaby(true)}
        onDeleteBaby={removeBaby}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content — centered like feeding page */}
        <View style={styles.mainContent}>
          {/* Status message — same pattern as feeding page */}
          <View style={styles.statusContainer}>
            {isSleeping ? (
              <Text style={[styles.statusMessage, { color: SLEEP_ACTIVE }]}>
                {sleepType === 'night' ? '🌙 Night Sleep' : '☀️ Napping'}
              </Text>
            ) : lastSleepInfo?.sleepType ? (
              <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
                Last: {sleepTypeLabel(lastSleepInfo.sleepType)}
              </Text>
            ) : (
              <Text style={[styles.statusMessage, { opacity: 0 }]}>{'\u200B'}</Text>
            )}
          </View>

          {/* Big 3D Sleep Button — same size ratio as FeedingButton */}
          <SleepButton isSleeping={isSleeping} onPress={handleToggle} />

          {/* Chronometer — reusing the same component as feeding */}
          {isSleeping ? (
            <Chronometer elapsed={elapsed} isRunning={true} />
          ) : timeSinceLast != null && lastSleepInfo ? (
            <View style={styles.lastFeedContainer}>
              <Text style={[styles.lastFeedTime, { color: colors.textSecondary }]}>
                🕐 {formatTimeSince(timeSinceLast)}
              </Text>
              <Text style={[styles.lastFeedDetail, { color: colors.textSecondary }]}>
                awake · last {lastSleepInfo.sleepType === 'night' ? 'night' : 'nap'} was{' '}
                {formatDurationHuman(lastSleepInfo.duration)}
              </Text>
            </View>
          ) : (
            <Chronometer elapsed={0} isRunning={false} />
          )}
        </View>

        {/* Today's Stats — compact card */}
        {selectedBaby && dayStats && dayStats.total_sleeps > 0 ? (
          <View style={[styles.todayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.todayTitle, { color: colors.text }]}>
              📋 Today's Sleep
            </Text>
            <Text style={[styles.todayLine, { color: colors.textSecondary }]}>
              😴 {dayStats.total_sleeps} sleep{dayStats.total_sleeps > 1 ? 's' : ''} · {formatDurationHuman(dayStats.total_duration)} total
            </Text>
            <Text style={[styles.todayLine, { color: colors.textSecondary }]}>
              ⏱️ Longest: {formatDurationHuman(dayStats.longest_sleep)}
              {(dayStats.nap_count > 0 || dayStats.night_count > 0)
                ? `  ·  ${dayStats.nap_count > 0 ? `☀️${dayStats.nap_count}` : ''}${dayStats.nap_count > 0 && dayStats.night_count > 0 ? ' ' : ''}${dayStats.night_count > 0 ? `🌙${dayStats.night_count}` : ''}`
                : ''}
            </Text>
          </View>
        ) : selectedBaby ? (
          <View style={[styles.todayCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.5 }]}>
            <Text style={[styles.todayTitle, { color: colors.text }]}>
              📋 Today
            </Text>
            <Text style={[styles.todayLine, { color: colors.textSecondary }]}>
              No sleep recorded yet
            </Text>
          </View>
        ) : null}

        {/* Today's Sessions History — compact cards */}
        {todaySessions.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>
              Sessions
            </Text>
            {todaySessions.map((session) => {
              const isOngoing = !session.end_time;
              return (
                <TouchableOpacity
                  key={session.id}
                  onLongPress={() => !isOngoing && handleDelete(session.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.sessionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isOngoing ? SLEEP_ACTIVE : colors.border,
                      borderWidth: isOngoing ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.sessionRow}>
                    <Text style={[styles.sessionType, { color: colors.text }]}>
                      {session.sleep_type === 'night' ? '🌙' : '☀️'}{' '}
                      {session.sleep_type === 'night' ? 'Night' : 'Nap'}
                    </Text>
                    {isOngoing && (
                      <View style={[styles.ongoingBadge, { backgroundColor: SLEEP_ACTIVE }]}>
                        <Text style={styles.ongoingText}>SLEEPING</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.sessionTime, { color: colors.textSecondary }]}>
                      {formatTime(session.start_time)}
                      {session.end_time ? ` → ${formatTime(session.end_time)}` : ' → …'}
                    </Text>
                    {session.duration != null && (
                      <Text style={[styles.sessionDuration, { color: SLEEP_COLOR }]}>
                        {' · '}{formatDurationHuman(session.duration)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <AddBabyModal
        visible={showAddBaby}
        onAdd={handleAddBaby}
        onClose={() => setShowAddBaby(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Outer scroll so nothing overflows
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Main content area — centered like feeding page
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 340,
  },

  // Status message
  statusContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Sleep button
  sleepButton: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  sleepButtonEmoji: {
    fontSize: 48,
  },
  sleepButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // "Time since last"
  lastFeedContainer: {
    alignItems: 'center',
    marginTop: 12,
    gap: 2,
  },
  lastFeedTime: {
    fontSize: 26,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  lastFeedDetail: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Today card — compact
  todayCard: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  todayLine: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    lineHeight: 18,
    textAlign: 'center',
  },

  // History section
  historySection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sessionCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  sessionType: {
    fontSize: 13,
    fontWeight: '700',
  },
  ongoingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  ongoingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionDuration: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
