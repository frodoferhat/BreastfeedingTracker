import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BabyGender } from '../types';

interface AddBabyModalProps {
  visible: boolean;
  onAdd: (name: string, birthDate?: string, gender?: BabyGender) => void;
  onClose: () => void;
}

export default function AddBabyModal({ visible, onAdd, onClose }: AddBabyModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<BabyGender>(undefined);

  const handleBirthDateChange = (text: string) => {
    // Strip non-digits
    const digits = text.replace(/\D/g, '');
    let formatted = '';

    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '-';
      formatted += digits[i];
    }

    // Validate day (DD) and month (MM)
    const parts = formatted.split('-');
    if (parts[0]) {
      let day = parseInt(parts[0], 10);
      if (day > 31) parts[0] = '31';
    }
    if (parts[1]) {
      let month = parseInt(parts[1], 10);
      if (month > 12) parts[1] = '12';
      if (month === 0 && parts[1].length === 2) parts[1] = '01';
    }

    setBirthDate(parts.join('-'));
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, birthDate.trim() || undefined, gender);
    setName('');
    setBirthDate('');
    setGender(undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.popup, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            👶 Add Baby
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Baby's name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Birth Date (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="DD-MM-YYYY"
            placeholderTextColor={colors.textSecondary}
            value={birthDate}
            onChangeText={handleBirthDateChange}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Gender (optional)
          </Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              onPress={() => setGender(gender === 'boy' ? undefined : 'boy')}
              style={[
                styles.genderOption,
                {
                  backgroundColor: gender === 'boy' ? '#DBEAFE' : colors.background,
                  borderColor: gender === 'boy' ? '#3B82F6' : colors.border,
                },
              ]}
            >
              <Text style={styles.genderEmoji}>👦</Text>
              <Text
                style={[
                  styles.genderText,
                  { color: gender === 'boy' ? '#3B82F6' : colors.textSecondary },
                ]}
              >
                Boy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGender(gender === 'girl' ? undefined : 'girl')}
              style={[
                styles.genderOption,
                {
                  backgroundColor: gender === 'girl' ? '#FCE7F3' : colors.background,
                  borderColor: gender === 'girl' ? '#EC4899' : colors.border,
                },
              ]}
            >
              <Text style={styles.genderEmoji}>👧</Text>
              <Text
                style={[
                  styles.genderText,
                  { color: gender === 'girl' ? '#EC4899' : colors.textSecondary },
                ]}
              >
                Girl
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAdd}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popup: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  genderEmoji: {
    fontSize: 22,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
