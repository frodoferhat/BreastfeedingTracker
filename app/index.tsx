import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { useFeedingSession } from '../hooks/useFeedingSession';
import FeedingButton from '../components/FeedingButton';
import Chronometer from '../components/Chronometer';
import ReminderPopup from '../components/ReminderPopup';
import BabySelector from '../components/BabySelector';
import AddBabyModal from '../components/AddBabyModal';
import AudioNoteRecorder from '../components/AudioNoteRecorder';
import { scheduleFeedingReminder } from '../utils/notifications';
import { updateSessionAudioNote } from '../database';

const formatMM_SS = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function HomeScreen() {
  const { colors, toggleTheme, mode } = useTheme();
  const { babies, selectedBaby, selectBaby, addBaby, removeBaby, loading } = useBaby();
  const {
    isFeeding,
    elapsed,
    toggleFeeding,
    currentPhase,
    onBreak,
    firstElapsed,
    secondElapsed,
    breakElapsed,
    suggestedBreast,
    switchBreast,
    toggleBreak,
  } = useFeedingSession(selectedBaby?.id ?? null);
  const router = useRouter();

  const [showReminder, setShowReminder] = useState(false);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [showAddBaby, setShowAddBaby] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const handleFeedingToggle = useCallback(async () => {
    if (!selectedBaby) {
      setShowAddBaby(true);
      return;
    }

    const result = await toggleFeeding();
    if (result) {
      // Feeding just ended
      setLastSessionDuration(result.duration);
      setLastSessionId(result.sessionId);
      setShowAudioRecorder(true);
    }
  }, [selectedBaby, toggleFeeding]);

  const handleSetReminder = async (hours: number, minutes: number) => {
    setShowReminder(false);
    try {
      await scheduleFeedingReminder(hours, minutes, selectedBaby?.name ?? 'Baby');
      Alert.alert(
        '✅ Reminder Set',
        `You'll be reminded in ${hours}h ${minutes}m`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to set reminder');
    }
  };

  const handleSkipReminder = () => {
    setShowReminder(false);
    setLastSessionId(null);
  };

  const handleAudioRecorded = async (uri: string) => {
    if (lastSessionId) {
      await updateSessionAudioNote(lastSessionId, uri);
    }
    setShowAudioRecorder(false);
    setShowReminder(true);
  };

  const handleSkipAudio = () => {
    setShowAudioRecorder(false);
    setShowReminder(true);
  };

  const handleAddBaby = async (name: string, birthDate?: string, gender?: 'boy' | 'girl') => {
    await addBaby(name, birthDate, gender);
    setShowAddBaby(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Controls */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/calendar')}
          style={[styles.calendarButton, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.headerIcon}>📅</Text>
          <Text style={[styles.calendarButtonText, { color: colors.text }]}>Dates & Feeding Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.calendarButton, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.headerIcon}>
            {mode === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F'}
          </Text>
          <Text style={[styles.calendarButtonText, { color: colors.text }]}>
            {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Baby Selector */}
      <BabySelector
        babies={babies}
        selectedBaby={selectedBaby}
        onSelect={selectBaby}
        onAddBaby={() => setShowAddBaby(true)}
        onDeleteBaby={removeBaby}
      />

      {/* Main Feeding Button + Chronometer */}
      <View style={styles.buttonContainer}>
        {/* Reserved space for status message — always present to avoid layout shift */}
        <View style={styles.statusContainer}>
          {isFeeding ? (
            <Text style={[styles.statusMessage, { color: colors.success }]}>
              Feeding Started!
            </Text>
          ) : suggestedBreast ? (
            <Text
              style={[
                styles.statusMessage,
                { color: suggestedBreast === 'first' ? '#2A9D8F' : '#9B5DE5' },
              ]}
            >
              {suggestedBreast === 'first' ? '🟢 Start with 1st Breast' : '🟣 Start with 2nd Breast'}
            </Text>
          ) : (
            <Text style={[styles.statusMessage, { opacity: 0 }]}>
              {'\u200B'}
            </Text>
          )}
        </View>
        <FeedingButton
          isFeeding={isFeeding}
          onPress={handleFeedingToggle}
          currentPhase={currentPhase}
          onBreak={onBreak}
          onSwitch={switchBreast}
        />
        <Chronometer elapsed={elapsed} isRunning={isFeeding && !onBreak} />

        {/* Break Button + Phase Summary — always rendered to prevent layout shift */}
        <View style={styles.phaseControls}>
          {isFeeding ? (
            <>
              <TouchableOpacity
                onPress={toggleBreak}
                style={[
                  styles.breakButton,
                  {
                    backgroundColor: onBreak ? colors.success : colors.warning,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.breakButtonText}>
                  {onBreak ? '▶️  Continue Feeding' : '☕  Give a Break!'}
                </Text>
              </TouchableOpacity>

              {/* Break timer */}
              <View style={styles.breakTimerRow}>
                <Text style={[styles.breakTimerLabel, { color: colors.warning }]}>☕</Text>
                <Text style={[styles.breakTimerValue, { color: onBreak ? colors.warning : colors.textSecondary }]}>
                  {formatMM_SS(breakElapsed)}
                </Text>
              </View>

              {/* 1st & 2nd breast timers side by side */}
              <View style={styles.breastTimersRow}>
                <View style={[styles.breastTimerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.breastTimerLabel, { color: '#2A9D8F' }]}>1st</Text>
                  <Text style={[styles.breastTimerValue, { color: '#2A9D8F' }]}>
                    {formatMM_SS(firstElapsed)}
                  </Text>
                </View>
                <View style={[styles.breastTimerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.breastTimerLabel, { color: '#9B5DE5' }]}>2nd</Text>
                  <Text style={[styles.breastTimerValue, { color: '#9B5DE5' }]}>
                    {formatMM_SS(secondElapsed)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.breakButton, { opacity: 0 }]} pointerEvents="none">
                <Text style={styles.breakButtonText}>{'\u200B'}</Text>
              </View>
              <View style={[styles.breakTimerRow, { opacity: 0 }]} pointerEvents="none">
                <Text style={styles.breakTimerValue}>{'\u200B'}</Text>
              </View>
              <View style={[styles.breastTimersRow, { opacity: 0 }]} pointerEvents="none">
                <View style={styles.breastTimerCard}>
                  <Text style={styles.breastTimerLabel}>{'\u200B'}</Text>
                  <Text style={styles.breastTimerValue}>00:00</Text>
                </View>
                <View style={styles.breastTimerCard}>
                  <Text style={styles.breastTimerLabel}>{'\u200B'}</Text>
                  <Text style={styles.breastTimerValue}>00:00</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Audio Recorder Modal (shows after feeding ends) */}
      <AudioNoteRecorder
        visible={showAudioRecorder}
        onRecorded={handleAudioRecorded}
        onCancel={handleSkipAudio}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => router.push('/statistics')}
          style={[styles.navButton, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.navText, { color: colors.text }]}>📊 Statistics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/export')}
          style={[styles.navButton, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.navText, { color: colors.text }]}>📤 Export</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ReminderPopup
        visible={showReminder}
        sessionDuration={lastSessionDuration}
        babyName={selectedBaby?.name ?? ''}
        onSetReminder={handleSetReminder}
        onSkip={handleSkipReminder}
      />

      <AddBabyModal
        visible={showAddBaby}
        onAdd={handleAddBaby}
        onClose={() => setShowAddBaby(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarButton: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerIcon: {
    fontSize: 22,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusMessage: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  navText: {
    fontSize: 17,
    fontWeight: '600',
  },
  phaseControls: {
    alignItems: 'center',
    marginTop: 16,
  },
  breakButton: {
    width: 240,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  breakButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  phaseSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  phaseDot: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  breakTimerLabel: {
    fontSize: 18,
  },
  breakTimerValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  breastTimersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 10,
  },
  breastTimerCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 100,
  },
  breastTimerLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  breastTimerValue: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
});
