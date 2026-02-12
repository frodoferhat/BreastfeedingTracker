import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { useFeedingSession } from '../hooks/useFeedingSession';
import { FeedingMode } from '../types';
import FeedingButton from '../components/FeedingButton';
import Chronometer from '../components/Chronometer';
import ReminderPopup from '../components/ReminderPopup';
import BabySelector from '../components/BabySelector';
import AddBabyModal from '../components/AddBabyModal';
import AudioNoteRecorder from '../components/AudioNoteRecorder';
import DiaperLogModal from '../components/DiaperLogModal';
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
    lastWasBottle,
    feedingMode,
    switchBreast,
    toggleBreak,
    saveVolume,
  } = useFeedingSession(selectedBaby?.id ?? null);
  const router = useRouter();

  const [showReminder, setShowReminder] = useState(false);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [showAddBaby, setShowAddBaby] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showDiaper, setShowDiaper] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [volumeValue, setVolumeValue] = useState(0);
  const [volumeUnit, setVolumeUnit] = useState<'ml' | 'oz'>('ml');
  const [selectedMode, setSelectedMode] = useState<FeedingMode>('breast');
  const volumeScrollRef = useRef<ScrollView>(null);

  // Reset to breast mode when switching babies
  const prevBabyIdRef = useRef(selectedBaby?.id);
  useEffect(() => {
    if (selectedBaby?.id !== prevBabyIdRef.current) {
      prevBabyIdRef.current = selectedBaby?.id;
      setSelectedMode('breast');
    }
  }, [selectedBaby?.id]);

  // Volume picker constants
  const ITEM_HEIGHT = 50;
  const ML_VALUES = Array.from({ length: 61 }, (_, i) => i * 5); // 0, 5, 10, ... 300
  const OZ_VALUES = Array.from({ length: 21 }, (_, i) => i * 0.5); // 0, 0.5, 1, ... 10

  const handleFeedingToggle = useCallback(async () => {
    if (!selectedBaby) {
      setShowAddBaby(true);
      return;
    }

    const result = await toggleFeeding(selectedMode);
    if (result) {
      // Feeding just ended
      setLastSessionDuration(result.duration);
      setLastSessionId(result.sessionId);
      if (result.feedingMode === 'bottle') {
        // Show volume input for bottle feedings
        setVolumeValue(0);
        setShowVolumeModal(true);
        // Scroll to top after modal renders
        setTimeout(() => volumeScrollRef.current?.scrollTo({ y: 0, animated: false }), 100);
      } else {
        setShowAudioRecorder(true);
      }
    }
  }, [selectedBaby, toggleFeeding, selectedMode]);

  const handleModeToggle = useCallback(() => {
    setSelectedMode((prev) => (prev === 'breast' ? 'bottle' : 'breast'));
  }, []);

  const handleVolumeSubmit = async () => {
    if (lastSessionId && volumeValue > 0) {
      // Always store in ml
      const mlValue = volumeUnit === 'oz'
        ? Math.round(volumeValue * 29.5735)
        : volumeValue;
      await saveVolume(lastSessionId, mlValue);
    }
    setShowVolumeModal(false);
    setShowAudioRecorder(true);
  };

  const handleVolumeSkip = () => {
    setShowVolumeModal(false);
    setShowAudioRecorder(true);
  };

  const handleVolumeScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const values = volumeUnit === 'oz' ? OZ_VALUES : ML_VALUES;
    const clamped = Math.max(0, Math.min(index, values.length - 1));
    setVolumeValue(values[clamped]);
  }, [volumeUnit]);

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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDiaper(true);
          }}
          style={[styles.calendarButton, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.headerIcon}>🧷</Text>
          <Text style={[styles.calendarButtonText, { color: colors.text }]}>Diaper</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.headerIcon}>
            {mode === 'light' ? '\uD83C\uDF19' : '\uD83C\uDF1E'}
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
            <Text style={[styles.statusMessage, { color: feedingMode === 'bottle' ? '#E67E22' : colors.success }]}>
              {feedingMode === 'bottle' ? 'Bottle Feeding!' : 'Feeding Started!'}
            </Text>
          ) : selectedMode === 'bottle' ? (
            <Text style={[styles.statusMessage, { color: '#E67E22' }]}>
              🍼 Bottle Mode
            </Text>
          ) : lastWasBottle ? (
            <Text style={[styles.statusMessage, { color: '#E67E22' }]}>
              🍼 Last feed was Bottle!
            </Text>
          ) : suggestedBreast ? (
            <Text
              style={[
                styles.statusMessage,
                { color: suggestedBreast === 'first' ? '#2A9D8F' : '#9B5DE5' },
              ]}
            >
              {suggestedBreast === 'first' ? '🟢 Start with Left Breast' : '🟣 Start with Right Breast'}
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
          feedingMode={isFeeding ? feedingMode : selectedMode}
          onModeToggle={handleModeToggle}
        />
        <Chronometer elapsed={elapsed} isRunning={isFeeding && !onBreak} />

        {/* Break Button + Phase Summary — always rendered to prevent layout shift */}
        <View style={styles.phaseControls}>
          {isFeeding ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleBreak();
                }}
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

              {/* Left & Right breast timers — only for breast mode */}
              {feedingMode === 'breast' ? (
                <View style={styles.breastTimersRow}>
                  <View style={[styles.breastTimerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.breastTimerLabel, { color: '#2A9D8F' }]}>Left</Text>
                    <Text style={[styles.breastTimerValue, { color: '#2A9D8F' }]}>
                      {formatMM_SS(firstElapsed)}
                    </Text>
                  </View>
                  <View style={[styles.breastTimerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.breastTimerLabel, { color: '#9B5DE5' }]}>Right</Text>
                    <Text style={[styles.breastTimerValue, { color: '#9B5DE5' }]}>
                      {formatMM_SS(secondElapsed)}
                    </Text>
                  </View>
                </View>
              ) : (
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
              )}
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

      {/* Volume Input Modal (shows after bottle feeding ends) */}
      <Modal visible={showVolumeModal} transparent animationType="fade">
        <View style={styles.volumeModalOverlay}>
          <View style={[styles.volumeModalCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.volumeModalEmoji}>🍼</Text>
            <Text style={[styles.volumeModalTitle, { color: colors.text }]}>
              How much did they drink?
            </Text>

            {/* Unit Toggle */}
            <View style={styles.unitToggleRow}>
              <TouchableOpacity
                onPress={() => {
                  setVolumeUnit('ml');
                  setVolumeValue(0);
                  setTimeout(() => volumeScrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
                }}
                style={[
                  styles.unitButton,
                  volumeUnit === 'ml' && styles.unitButtonActive,
                  volumeUnit === 'ml' && { backgroundColor: '#E67E22' },
                ]}
              >
                <Text style={[styles.unitButtonText, volumeUnit === 'ml' && styles.unitButtonTextActive]}>ml</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setVolumeUnit('oz');
                  setVolumeValue(0);
                  setTimeout(() => volumeScrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
                }}
                style={[
                  styles.unitButton,
                  volumeUnit === 'oz' && styles.unitButtonActive,
                  volumeUnit === 'oz' && { backgroundColor: '#E67E22' },
                ]}
              >
                <Text style={[styles.unitButtonText, volumeUnit === 'oz' && styles.unitButtonTextActive]}>oz</Text>
              </TouchableOpacity>
            </View>

            {/* Scroll Picker */}
            <View style={styles.scrollPickerContainer}>
              <View style={[styles.scrollPickerHighlight, { borderColor: '#E67E22' }]} pointerEvents="none" />
              <ScrollView
                ref={volumeScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleVolumeScroll}
                contentContainerStyle={{
                  paddingVertical: ITEM_HEIGHT * 2,
                }}
                style={styles.scrollPicker}
              >
                {(volumeUnit === 'oz' ? OZ_VALUES : ML_VALUES).map((val, i) => {
                  const label = volumeUnit === 'oz' ? val.toFixed(1) : String(val);
                  return (
                    <View key={i} style={[styles.scrollPickerItem, { height: ITEM_HEIGHT }]}>
                      <Text style={[
                        styles.scrollPickerText,
                        { color: volumeValue === val ? '#E67E22' : colors.textSecondary },
                        volumeValue === val && styles.scrollPickerTextActive,
                      ]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              <Text style={[styles.scrollPickerUnit, { color: colors.textSecondary }]}>
                {volumeUnit}
              </Text>
            </View>

            <View style={styles.volumeButtons}>
              <TouchableOpacity
                onPress={handleVolumeSkip}
                style={[styles.volumeSkipButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.volumeSkipText, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleVolumeSubmit}
                style={[styles.volumeSaveButton, { backgroundColor: '#E67E22' }]}
              >
                <Text style={styles.volumeSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audio Recorder Modal (shows after feeding ends) */}
      <AudioNoteRecorder
        visible={showAudioRecorder}
        onRecorded={handleAudioRecorded}
        onCancel={handleSkipAudio}
      />

      {/* Diaper Log Modal */}
      <DiaperLogModal
        visible={showDiaper}
        onClose={() => setShowDiaper(false)}
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
    gap: 8,
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
  volumeModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  volumeModalCard: {
    width: 300,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  volumeModalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  volumeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  unitButtonActive: {
    borderWidth: 0,
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  unitButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  scrollPickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 50,
    marginTop: -25,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderRadius: 8,
  },
  scrollPicker: {
    height: 250,
    width: 120,
  },
  scrollPickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollPickerText: {
    fontSize: 24,
    fontWeight: '500',
  },
  scrollPickerTextActive: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E67E22',
  },
  scrollPickerUnit: {
    fontSize: 20,
    fontWeight: '600',
  },
  volumeButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  volumeSkipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  volumeSkipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  volumeSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  volumeSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
