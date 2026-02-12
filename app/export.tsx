import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { getSessionsByBabyAndDateRange, getDiaperLogsByBabyAndDateRange } from '../database';
import { exportToCSV } from '../utils/export';
import { FeedingSession, DiaperLog } from '../types';
import { format, subDays } from 'date-fns';

export default function ExportScreen() {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const [startDay, setStartDay] = useState(format(weekAgo, 'dd'));
  const [startMonth, setStartMonth] = useState(format(weekAgo, 'MM'));
  const [startYear, setStartYear] = useState(format(weekAgo, 'yyyy'));
  const [endDay, setEndDay] = useState(format(now, 'dd'));
  const [endMonth, setEndMonth] = useState(format(now, 'MM'));
  const [endYear, setEndYear] = useState(format(now, 'yyyy'));
  const [loading, setLoading] = useState(false);
  const [selectedQuick, setSelectedQuick] = useState<number | null>(7);

  const startDate = `${startDay}-${startMonth}-${startYear}`;
  const endDate = `${endDay}-${endMonth}-${endYear}`;

  // Convert dd-MM-yyyy to yyyy-MM-dd for DB query
  const toISODate = (ddmmyyyy: string): string => {
    const parts = ddmmyyyy.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddmmyyyy;
  };

  // Clamp a numeric string to a range
  const clamp = (val: string, max: number, pad: number): string => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return val;
    const clamped = Math.min(Math.max(num, 0), max);
    return clamped.toString().padStart(pad, '0');
  };

  const handleFieldChange = (
    text: string,
    setter: (v: string) => void,
    max: number,
    pad: number
  ) => {
    setSelectedQuick(null);
    const digits = text.replace(/\D/g, '').slice(0, pad);
    setter(digits);
    // Auto-clamp when fully typed
    if (digits.length === pad) {
      setter(clamp(digits, max, pad));
    }
  };

  const handleExport = async () => {
    if (!selectedBaby) return;

    setLoading(true);
    try {
      const rows = await getSessionsByBabyAndDateRange(
        selectedBaby.id,
        toISODate(startDate),
        toISODate(endDate)
      );
      const sessions: FeedingSession[] = rows.map((r: any) => ({
        id: r.id,
        babyId: r.baby_id,
        startTime: r.start_time,
        endTime: r.end_time,
        duration: r.duration,
        feedingMode: r.feeding_mode ?? 'breast',
        volume: r.volume ?? null,
        firstBreastDuration: r.first_breast_duration,
        secondBreastDuration: r.second_breast_duration,
        breakDuration: r.break_duration,
        phases: r.phases,
        audioNotePath: r.audio_note_path,
        createdAt: r.created_at,
      }));

      // Fetch diaper logs for the same date range
      const diaperRows = await getDiaperLogsByBabyAndDateRange(
        selectedBaby.id,
        toISODate(startDate),
        toISODate(endDate)
      );
      const diaperLogs: DiaperLog[] = diaperRows.map((r: any) => ({
        id: r.id,
        babyId: r.baby_id,
        type: r.type,
        createdAt: r.created_at,
      }));

      if (sessions.length === 0 && diaperLogs.length === 0) {
        Alert.alert('No Data', 'No feeding sessions or diaper changes found in the selected date range.');
        setLoading(false);
        return;
      }

      await exportToCSV(sessions, selectedBaby.name, toISODate(startDate), toISODate(endDate), diaperLogs);
    } catch (err) {
      console.error('Export failed:', err);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickSelect = (days: number) => {
    setSelectedQuick(days);
    const s = subDays(new Date(), days);
    const e = new Date();
    setStartDay(format(s, 'dd'));
    setStartMonth(format(s, 'MM'));
    setStartYear(format(s, 'yyyy'));
    setEndDay(format(e, 'dd'));
    setEndMonth(format(e, 'MM'));
    setEndYear(format(e, 'yyyy'));
  };

  if (!selectedBaby) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Please add a baby first to export data
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>
          📤 Export Feeding And Diaper Logs
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Export as a document for doctor visits or personal records.
        </Text>

        {/* Quick select buttons */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          QUICK SELECT
        </Text>
        <View style={styles.quickRow}>
          {[
            { label: 'Last 7 Days', days: 7 },
            { label: 'Last 14 Days', days: 14 },
            { label: 'Last 30 Days', days: 30 },
          ].map((item) => {
            const isActive = selectedQuick === item.days;
            return (
              <TouchableOpacity
                key={item.days}
                onPress={() => quickSelect(item.days)}
                style={[
                  styles.quickButton,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickText,
                    { color: isActive ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {isActive ? '\u2713 ' : ''}{item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom date range */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          CUSTOM RANGE
        </Text>

        {/* From date */}
        <Text style={[styles.dateGroupLabel, { color: colors.text }]}>From</Text>
        <View style={styles.dateFieldsRow}>
          <View style={styles.dateFieldBox}>
            <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>DD</Text>
            <TextInput
              style={[styles.dateFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={startDay}
              onChangeText={(t) => handleFieldChange(t, setStartDay, 31, 2)}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
          <Text style={[styles.dateSeparator, { color: colors.textSecondary }]}>/</Text>
          <View style={styles.dateFieldBox}>
            <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>MM</Text>
            <TextInput
              style={[styles.dateFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={startMonth}
              onChangeText={(t) => handleFieldChange(t, setStartMonth, 12, 2)}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
          <Text style={[styles.dateSeparator, { color: colors.textSecondary }]}>/</Text>
          <View style={styles.dateFieldBox}>
            <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>YYYY</Text>
            <TextInput
              style={[styles.dateFieldInput, styles.yearInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={startYear}
              onChangeText={(t) => handleFieldChange(t, setStartYear, 2099, 4)}
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
          </View>
        </View>

        {/* To date */}
        <Text style={[styles.dateGroupLabel, { color: colors.text }]}>To</Text>
        <View style={styles.dateFieldsRow}>
          <View style={styles.dateFieldBox}>
            <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>DD</Text>
            <TextInput
              style={[styles.dateFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={endDay}
              onChangeText={(t) => handleFieldChange(t, setEndDay, 31, 2)}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
          <Text style={[styles.dateSeparator, { color: colors.textSecondary }]}>/</Text>
          <View style={styles.dateFieldBox}>
            <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>MM</Text>
            <TextInput
              style={[styles.dateFieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={endMonth}
              onChangeText={(t) => handleFieldChange(t, setEndMonth, 12, 2)}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
          <Text style={[styles.dateSeparator, { color: colors.textSecondary }]}>/</Text>
          <View style={styles.dateFieldBox}>
            <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>YYYY</Text>
            <TextInput
              style={[styles.dateFieldInput, styles.yearInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={endYear}
              onChangeText={(t) => handleFieldChange(t, setEndYear, 2099, 4)}
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
          </View>
        </View>

        {/* Export button */}
        <TouchableOpacity
          onPress={handleExport}
          disabled={loading}
          style={[
            styles.exportButton,
            { backgroundColor: loading ? colors.textSecondary : colors.primary },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.exportText}>{'\uD83D\uDCCA'} Export Report</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Exports a beautifully formatted report with summary stats, feeding times, and durations. Opens in any browser.
        </Text>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  dateGroupLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  dateFieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 20,
  },
  dateFieldBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dateFieldInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700',
  },
  yearInput: {
    fontSize: 20,
  },
  dateSeparator: {
    fontSize: 24,
    fontWeight: '300',
    marginBottom: 16,
  },
  exportButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
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
