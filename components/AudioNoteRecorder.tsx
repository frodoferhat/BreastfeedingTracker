import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { formatDuration } from '../utils/time';

const RECORD_BUTTON_SIZE = Dimensions.get('window').width * 0.45;

interface AudioNoteRecorderProps {
  visible: boolean;
  onRecorded: (uri: string) => void;
  onCancel: () => void;
}

export default function AudioNoteRecorder({
  visible,
  onRecorded,
  onCancel,
}: AudioNoteRecorderProps) {
  const { colors } = useTheme();
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const handleStop = async () => {
    const uri = await stopRecording();
    if (uri) {
      onRecorded(uri);
    }
  };

  const handleCancel = async () => {
    if (isRecording) {
      await cancelRecording();
    }
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            🎤 Audio Note
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isRecording
              ? 'Recording... Tap to save'
              : 'Record a voice note about this feeding'}
          </Text>

          {/* Timer — always rendered to reserve space */}
          <Text
            style={[
              styles.timer,
              { color: colors.danger, opacity: isRecording ? 1 : 0 },
            ]}
          >
            {isRecording ? formatDuration(recordingDuration) : '00:00:00'}
          </Text>

          {/* Big Record / Stop Button */}
          <TouchableOpacity
            onPress={isRecording ? handleStop : startRecording}
            activeOpacity={0.8}
            style={[
              styles.recordButton,
              {
                width: RECORD_BUTTON_SIZE,
                height: RECORD_BUTTON_SIZE,
                borderRadius: RECORD_BUTTON_SIZE / 2,
                backgroundColor: isRecording ? colors.success : colors.danger,
                shadowColor: isRecording ? colors.success : colors.danger,
              },
            ]}
          >
            <Text style={styles.recordEmoji}>
              {isRecording ? '✓' : '🎤'}
            </Text>
            <Text style={styles.recordLabel}>
              {isRecording ? 'TAP TO SAVE' : 'TAP TO RECORD'}
            </Text>
          </TouchableOpacity>

          {/* Recording pulse indicator — always rendered to reserve space */}
          <View style={[styles.recordingIndicator, { opacity: isRecording ? 1 : 0 }]}>
            <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.recordingText, { color: colors.danger }]}>
              Recording in progress
            </Text>
          </View>

          {/* Action button — cancel while recording, skip otherwise */}
          <TouchableOpacity
            onPress={handleCancel}
            style={[styles.actionButton, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
              {isRecording ? '✕  Cancel Recording' : 'Skip →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popup: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 22,
    paddingVertical: 30,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  timer: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  recordButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    marginVertical: 20,
  },
  recordEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  recordLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
