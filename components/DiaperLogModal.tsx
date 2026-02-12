import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { insertDiaperLog } from '../database';
import { generateId } from '../utils/time';

interface DiaperLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DiaperLogModal({ visible, onClose }: DiaperLogModalProps) {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const [peeSelected, setPeeSelected] = useState(false);
  const [poopSelected, setPoopSelected] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setPeeSelected(false);
      setPoopSelected(false);
    }
  }, [visible]);

  const handleLog = async () => {
    if (!selectedBaby) return;
    if (!peeSelected && !poopSelected) {
      Alert.alert('Select Type', 'Please select at least Pee or Poop.');
      return;
    }

    setLoading(true);
    try {
      let type: string;
      if (peeSelected && poopSelected) {
        type = 'both';
      } else if (peeSelected) {
        type = 'pee';
      } else {
        type = 'poop';
      }

      await insertDiaperLog(generateId(), selectedBaby.id, type);
      Alert.alert('✅ Logged', 'Diaper change saved!', [{ text: 'OK' }]);
      setPeeSelected(false);
      setPoopSelected(false);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to log diaper change.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>🧷 Diaper Change</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select what happened:
          </Text>

          {/* Toggle Buttons */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setPeeSelected(!peeSelected);
              }}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: peeSelected ? '#3B82F6' : colors.background,
                  borderColor: peeSelected ? '#3B82F6' : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleEmoji}>💧</Text>
              <Text
                style={[
                  styles.toggleLabel,
                  { color: peeSelected ? '#FFFFFF' : colors.text },
                ]}
              >
                Pee
              </Text>
              {peeSelected && <Text style={styles.toggleCheck}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setPoopSelected(!poopSelected);
              }}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: poopSelected ? '#92400E' : colors.background,
                  borderColor: poopSelected ? '#92400E' : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleEmoji}>💩</Text>
              <Text
                style={[
                  styles.toggleLabel,
                  { color: poopSelected ? '#FFFFFF' : colors.text },
                ]}
              >
                Poop
              </Text>
              {poopSelected && <Text style={styles.toggleCheck}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* Log Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              handleLog();
            }}
            disabled={loading || (!peeSelected && !poopSelected)}
            style={[
              styles.logButton,
              {
                backgroundColor:
                  !peeSelected && !poopSelected
                    ? colors.border
                    : colors.primary,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>
              {loading ? 'Saving...' : '✅ Log Diaper Change'}
            </Text>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
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
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  toggleEmoji: {
    fontSize: 36,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggleCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    position: 'absolute',
    top: 8,
    right: 12,
  },
  logButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
