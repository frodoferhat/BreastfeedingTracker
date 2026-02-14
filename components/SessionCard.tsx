import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { formatTime, formatDurationMMSS } from '../utils/time';
import { FeedingSession, PhaseEntry } from '../types';

const formatPhaseDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

interface SessionCardProps {
  session: FeedingSession;
  sessionNumber?: number;
  onDelete?: () => void;
}

export default function SessionCard({ session, sessionNumber, onDelete }: SessionCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const handlePress = () => {
    setExpanded((prev) => !prev);
  };

  const handleLongPress = () => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this feeding session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const handlePlayAudio = async () => {
    if (!session.audioNotePath) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
        return;
      }

      // Ensure playback goes through loudspeaker
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: session.audioNotePath },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.error('Failed to play audio:', err);
      Alert.alert('Error', 'Could not play the audio note.');
      setIsPlaying(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {sessionNumber != null && (
          <View style={[styles.numberBadge, { backgroundColor: session.feedingMode === 'bottle' ? '#E67E22' : colors.primary }]}>
            <Text style={styles.numberText}>
              {session.feedingMode === 'bottle' ? `🍼${sessionNumber}` : `#${sessionNumber}`}
            </Text>
          </View>
        )}
        <View style={styles.timeColumn}>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
            Started
          </Text>
          <Text style={[styles.timeValue, { color: colors.text }]}>
            {formatTime(session.startTime)}
          </Text>
        </View>

        <View style={styles.arrow}>
          <Text style={{ color: colors.textSecondary }}>{'\u2192'}</Text>
        </View>

        <View style={styles.timeColumn}>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
            Ended
          </Text>
          <Text style={[styles.timeValue, { color: colors.text }]}>
            {session.endTime ? formatTime(session.endTime) : '...'}
          </Text>
        </View>

        <View style={{ marginLeft: 'auto', alignItems: 'flex-end', flexShrink: 0 }}>
          <View style={[styles.durationBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.durationText, { color: colors.primary }]}>
              {session.duration
                ? formatDurationMMSS(session.duration)
                : 'Active'}
            </Text>
          </View>
          {session.feedingMode === 'bottle' && session.volume != null && (
            <View style={styles.volumeBadge}>
              <Text style={styles.volumeBadgeText}>{session.volume}ml</Text>
            </View>
          )}
        </View>
      </View>

      {(session.audioNotePath || session.note) && (
        <View style={styles.metaRow}>
          {session.audioNotePath && (
            <TouchableOpacity
              onPress={handlePlayAudio}
              style={[styles.playButton, { backgroundColor: '#F3E5F5', flex: session.note ? undefined : 1 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.playButtonText, { color: '#7B1FA2' }]}>
                {isPlaying ? '⏹ Stop Audio' : '🎙️ Play Note'}
              </Text>
            </TouchableOpacity>
          )}
          {session.note ? (
            <View style={[
              styles.qualityBadge,
              {
                flex: 1,
                backgroundColor:
                  session.note === 'good' ? '#E8F5E9' :
                  session.note === 'okay' ? '#FFF8E1' :
                  session.note === 'poor' ? '#FFEBEE' :
                  colors.primaryLight,
              },
            ]}>
              <Text style={[
                styles.qualityBadgeText,
                {
                  color:
                    session.note === 'good' ? '#2E7D32' :
                    session.note === 'okay' ? '#F9A825' :
                    session.note === 'poor' ? '#C62828' :
                    colors.text,
                },
              ]}>
                {session.note === 'good' ? '😊 Good' :
                 session.note === 'okay' ? '😐 Okay' :
                 session.note === 'poor' ? '😟 Poor' :
                 `📝 ${session.note}`}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          {/* Phase Breakdown — breast mode only */}
          {session.feedingMode !== 'bottle' && (session.firstBreastDuration != null || session.secondBreastDuration != null) && (
            <View style={styles.phaseBreakdown}>
              <View style={styles.phaseRow}>
                <View style={[styles.phaseDot, { backgroundColor: '#2A9D8F' }]} />
                <Text style={[styles.phaseLabel, { color: colors.text }]}>Left Breast</Text>
                <Text style={[styles.phaseDuration, { color: '#2A9D8F' }]}>
                  {formatPhaseDuration(session.firstBreastDuration)}
                </Text>
              </View>
              <View style={styles.phaseRow}>
                <View style={[styles.phaseDot, { backgroundColor: '#9B5DE5' }]} />
                <Text style={[styles.phaseLabel, { color: colors.text }]}>Right Breast</Text>
                <Text style={[styles.phaseDuration, { color: '#9B5DE5' }]}>
                  {formatPhaseDuration(session.secondBreastDuration)}
                </Text>
              </View>
              {session.breakDuration != null && session.breakDuration > 0 && (
                <View style={styles.phaseRow}>
                  <View style={[styles.phaseDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.phaseLabel, { color: colors.text }]}>Break</Text>
                  <Text style={[styles.phaseDuration, { color: colors.warning }]}>
                    {formatPhaseDuration(session.breakDuration)}
                  </Text>
                </View>
              )}
              <View style={[styles.phaseTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.phaseTotalLabel, { color: colors.text }]}>Total Feeding</Text>
                <Text style={[styles.phaseTotalValue, { color: colors.primary }]}>
                  {formatPhaseDuration(session.duration)}
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            Started: {new Date(session.startTime).toLocaleString()}
          </Text>
          {session.endTime && (
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              Ended: {new Date(session.endTime).toLocaleString()}
            </Text>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={handleLongPress}
              style={[styles.deleteButton, { backgroundColor: '#FEE2E2' }]}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>🗑 Delete Session</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  timeColumn: {
    alignItems: 'center',
    minWidth: 80,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  arrow: {
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  durationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '700',
  },
  audioIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  audioText: {
    fontSize: 12,
  },
  playButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  qualityBadge: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityBadgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  detailText: {
    fontSize: 12,
    marginBottom: 4,
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  phaseBreakdown: {
    marginBottom: 10,
    paddingBottom: 8,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  phaseDuration: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  phaseTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
  },
  phaseTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  phaseTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'] as any,
  },
  volumeBadge: {
    marginTop: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  volumeBadgeText: {
    color: '#E67E22',
    fontSize: 13,
    fontWeight: '700',
  },
});
