import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { insertGrowthRecord, getGrowthRecordsByBaby, deleteGrowthRecord } from '../database';
import { GrowthRecord } from '../types';
import { format, parseISO, differenceInDays, parse, isValid } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { generateId } from '../utils/time';
import { calculatePercentile, getPercentileLabel } from '../constants/whoData';

// Birth dates are stored as DD-MM-YYYY or DD-MM-YY; growth dates as YYYY-MM-DD
const safeParseBirthDate = (dateStr: string): Date | null => {
  // Normalise 2-digit year → 4-digit (e.g. "29-12-25" → "29-12-2025")
  const parts = dateStr.split('-');
  let normalised = dateStr;
  if (parts.length === 3 && parts[2].length === 2) {
    const yy = parseInt(parts[2], 10);
    const fullYear = yy > 50 ? 1900 + yy : 2000 + yy;
    normalised = `${parts[0]}-${parts[1]}-${fullYear}`;
  }

  // Try DD-MM-YYYY first (AddBabyModal format)
  const ddmmyyyy = parse(normalised, 'dd-MM-yyyy', new Date());
  if (isValid(ddmmyyyy)) return ddmmyyyy;
  // Fall back to ISO (YYYY-MM-DD)
  const iso = parseISO(dateStr);
  if (isValid(iso)) return iso;
  return null;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 40;
const CHART_WIDTH = SCREEN_WIDTH - 32 - CHART_PADDING * 2;
const CHART_HEIGHT = 180;

export default function GrowthScreen() {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [chartMetric, setChartMetric] = useState<'weight' | 'height' | 'head'>('weight');

  // Form state
  const [formWeight, setFormWeight] = useState('');
  const [formWeightUnit, setFormWeightUnit] = useState<'kg' | 'g'>('kg');
  const [formHeight, setFormHeight] = useState('');
  const [formHead, setFormHead] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'dd-MM-yyyy'));

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '-';
      formatted += digits[i];
    }
    const parts = formatted.split('-');
    if (parts[0]) {
      const day = parseInt(parts[0], 10);
      if (day > 31) parts[0] = '31';
    }
    if (parts[1]) {
      const month = parseInt(parts[1], 10);
      if (month > 12) parts[1] = '12';
      if (month === 0 && parts[1].length === 2) parts[1] = '01';
    }
    setFormDate(parts.join('-'));
  };

  // Convert DD-MM-YYYY display format to YYYY-MM-DD for DB storage
  const formDateToISO = (): string | null => {
    const parsed = parse(formDate, 'dd-MM-yyyy', new Date());
    if (!isValid(parsed)) return null;
    return format(parsed, 'yyyy-MM-dd');
  };

  const loadRecords = useCallback(async () => {
    if (!selectedBaby) return;
    try {
      const rows = await getGrowthRecordsByBaby(selectedBaby.id);
      setRecords(rows.map((r: any) => ({
        id: r.id,
        babyId: r.baby_id,
        date: r.date,
        weightKg: r.weight_kg,
        heightCm: r.height_cm,
        headCm: r.head_cm,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error('Failed to load growth records:', err);
    }
  }, [selectedBaby]);

  useEffect(() => {
    loadRecords();
  }, [selectedBaby]);

  const handleAdd = async () => {
    if (!selectedBaby) return;
    let w = formWeight.trim() ? parseFloat(formWeight) : null;
    const h = formHeight.trim() ? parseFloat(formHeight) : null;
    const hd = formHead.trim() ? parseFloat(formHead) : null;

    if (w === null && h === null && hd === null) {
      Alert.alert('Missing Data', 'Please enter at least one measurement.');
      return;
    }

    if ((w !== null && (isNaN(w) || w <= 0)) ||
        (h !== null && (isNaN(h) || h <= 0)) ||
        (hd !== null && (isNaN(hd) || hd <= 0))) {
      Alert.alert('Invalid Value', 'Please enter valid positive numbers.');
      return;
    }

    // Convert grams to kg for storage
    if (w !== null && formWeightUnit === 'g') {
      w = Math.round((w / 1000) * 1000) / 1000; // e.g. 4500g → 4.5kg
    }

    const dateISO = formDateToISO();
    if (!dateISO) {
      Alert.alert('Invalid Date', 'Please enter a valid date (DD-MM-YYYY).');
      return;
    }

    try {
      await insertGrowthRecord(generateId(), selectedBaby.id, dateISO, w, h, hd);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFormWeight('');
      setFormHeight('');
      setFormHead('');
      setFormDate(format(new Date(), 'dd-MM-yyyy'));
      setShowAddModal(false);
      loadRecords();
    } catch (err) {
      console.error('Failed to save growth record:', err);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this measurement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGrowthRecord(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadRecords();
        },
      },
    ]);
  };

  const getAgeLabel = (dateStr: string): string => {
    if (!selectedBaby?.birthDate) return '';
    const birthParsed = safeParseBirthDate(selectedBaby.birthDate);
    if (!birthParsed) return '';
    const days = differenceInDays(parseISO(dateStr), birthParsed);
    if (days < 0) return '';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    const months = Math.floor(days / 30.44);
    const remainingDays = days - Math.round(months * 30.44);
    if (months < 12) {
      return remainingDays > 6 ? `${months}m ${Math.floor(remainingDays / 7)}w` : `${months}m`;
    }
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}y ${remMonths}m` : `${years}y`;
  };

  // ─── Percentile calculation ─────────────────────────
  const getPercentileForRecord = (
    record: GrowthRecord,
    metric: 'weight' | 'height' | 'head',
  ): number | null => {
    if (!selectedBaby?.birthDate || !selectedBaby?.gender) return null;
    const gender = selectedBaby.gender;
    if (gender !== 'boy' && gender !== 'girl') return null;

    const birthParsed = safeParseBirthDate(selectedBaby.birthDate);
    if (!birthParsed) return null;

    const days = differenceInDays(parseISO(record.date), birthParsed);
    if (days < 0) return null;
    const ageMonths = days / 30.4375;

    const value = metric === 'weight' ? record.weightKg :
                  metric === 'height' ? record.heightCm :
                  record.headCm;
    if (value == null) return null;

    return calculatePercentile(value, ageMonths, gender, metric);
  };

  // ─── Chart data ──────────────────────────────────────
  const chartData = [...records]
    .reverse()
    .map(r => ({
      date: r.date,
      value: chartMetric === 'weight' ? r.weightKg :
             chartMetric === 'height' ? r.heightCm :
             r.headCm,
    }))
    .filter(d => d.value !== null && d.value !== undefined) as { date: string; value: number }[];

  const chartUnit = chartMetric === 'weight' ? 'kg' : 'cm';
  const chartColor = chartMetric === 'weight' ? '#4CAF50' :
                     chartMetric === 'height' ? '#2196F3' : '#FF9800';

  if (!selectedBaby) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Please add a baby first
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            📏 {selectedBaby.name}'s Growth
          </Text>
          {selectedBaby.birthDate && safeParseBirthDate(selectedBaby.birthDate) && (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Born {format(safeParseBirthDate(selectedBaby.birthDate)!, 'MMM d, yyyy')}
            </Text>
          )}
        </View>

        {/* Add Measurement Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Measurement</Text>
        </TouchableOpacity>

        {/* Latest Measurements Summary */}
        {records.length > 0 && (
          <View style={[styles.latestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.latestTitle, { color: colors.text }]}>Latest Measurements</Text>
            <Text style={[styles.latestDate, { color: colors.textSecondary }]}>
              {format(parseISO(records[0].date), 'MMM d, yyyy')}
              {selectedBaby.birthDate ? ` · ${getAgeLabel(records[0].date)}` : ''}
            </Text>
            <View style={styles.latestRow}>
              {records[0].weightKg != null && (() => {
                const pct = getPercentileForRecord(records[0], 'weight');
                const pctLabel = pct != null ? getPercentileLabel(pct) : null;
                return (
                  <View style={[styles.latestItem, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={styles.latestEmoji}>⚖️</Text>
                    <Text style={[styles.latestValue, { color: '#2E7D32' }]}>{records[0].weightKg}</Text>
                    <Text style={[styles.latestUnit, { color: '#4CAF50' }]}>kg</Text>
                    {pct != null && pctLabel && (
                      <View style={[styles.percentileBadge, { backgroundColor: pctLabel.color + '18' }]}>
                        <Text style={[styles.percentileText, { color: pctLabel.color }]}>
                          P{pct}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
              {records[0].heightCm != null && (() => {
                const pct = getPercentileForRecord(records[0], 'height');
                const pctLabel = pct != null ? getPercentileLabel(pct) : null;
                return (
                  <View style={[styles.latestItem, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.latestEmoji}>📐</Text>
                    <Text style={[styles.latestValue, { color: '#1565C0' }]}>{records[0].heightCm}</Text>
                    <Text style={[styles.latestUnit, { color: '#2196F3' }]}>cm</Text>
                    {pct != null && pctLabel && (
                      <View style={[styles.percentileBadge, { backgroundColor: pctLabel.color + '18' }]}>
                        <Text style={[styles.percentileText, { color: pctLabel.color }]}>
                          P{pct}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
              {records[0].headCm != null && (() => {
                const pct = getPercentileForRecord(records[0], 'head');
                const pctLabel = pct != null ? getPercentileLabel(pct) : null;
                return (
                  <View style={[styles.latestItem, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={styles.latestEmoji}>🧒</Text>
                    <Text style={[styles.latestValue, { color: '#E65100' }]}>{records[0].headCm}</Text>
                    <Text style={[styles.latestUnit, { color: '#FF9800' }]}>cm</Text>
                    {pct != null && pctLabel && (
                      <View style={[styles.percentileBadge, { backgroundColor: pctLabel.color + '18' }]}>
                        <Text style={[styles.percentileText, { color: pctLabel.color }]}>
                          P{pct}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
            {/* Percentile info note */}
            {selectedBaby.gender && selectedBaby.birthDate && records[0] && (
              getPercentileForRecord(records[0], 'weight') != null ||
              getPercentileForRecord(records[0], 'height') != null ||
              getPercentileForRecord(records[0], 'head') != null
            ) && (
              <Text style={[styles.percentileNote, { color: colors.textSecondary }]}>
                WHO percentiles for {selectedBaby.gender === 'boy' ? 'boys' : 'girls'} (0–24m)
              </Text>
            )}
            {selectedBaby.gender == null && records.length > 0 && (
              <Text style={[styles.percentileNote, { color: colors.textSecondary }]}>
                Set baby's gender to see WHO percentiles
              </Text>
            )}
          </View>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Growth Trend</Text>
            <View style={styles.chartTabs}>
              {(['weight', 'height', 'head'] as const).map(metric => (
                <TouchableOpacity
                  key={metric}
                  style={[
                    styles.chartTab,
                    chartMetric === metric && {
                      backgroundColor: metric === 'weight' ? '#E8F5E9' :
                                       metric === 'height' ? '#E3F2FD' : '#FFF3E0',
                    },
                  ]}
                  onPress={() => setChartMetric(metric)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chartTabText,
                    {
                      color: chartMetric === metric
                        ? (metric === 'weight' ? '#2E7D32' : metric === 'height' ? '#1565C0' : '#E65100')
                        : colors.textSecondary,
                      fontWeight: chartMetric === metric ? '700' : '500',
                    },
                  ]}>
                    {metric === 'weight' ? '⚖️ Weight' : metric === 'height' ? '📐 Height' : '🧒 Head'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {chartData.length >= 2 ? (
              <GrowthChart data={chartData} color={chartColor} unit={chartUnit} colors={colors} />
            ) : (
              <Text style={[styles.chartEmpty, { color: colors.textSecondary }]}>
                Need at least 2 {chartMetric} measurements to show chart
              </Text>
            )}
          </View>
        )}

        {/* Records History */}
        {records.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>📋 All Records</Text>
            {records.map((record, index) => (
              <View
                key={record.id}
                style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.recordHeader}>
                  <View>
                    <Text style={[styles.recordDate, { color: colors.text }]}>
                      {format(parseISO(record.date), 'MMM d, yyyy')}
                    </Text>
                    {selectedBaby.birthDate && (
                      <Text style={[styles.recordAge, { color: colors.textSecondary }]}>
                        Age: {getAgeLabel(record.date)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(record.id)} activeOpacity={0.6}>
                    <Text style={[styles.deleteButton, { color: colors.danger }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recordValues}>
                  {record.weightKg != null && (() => {
                    const pct = getPercentileForRecord(record, 'weight');
                    const pctLabel = pct != null ? getPercentileLabel(pct) : null;
                    return (
                      <View style={styles.recordValueItem}>
                        <Text style={[styles.recordValueLabel, { color: colors.textSecondary }]}>⚖️ Weight</Text>
                        <Text style={[styles.recordValueText, { color: '#4CAF50' }]}>{record.weightKg} kg</Text>
                        {pct != null && pctLabel && (
                          <Text style={[styles.recordPercentile, { color: pctLabel.color }]}>P{pct}</Text>
                        )}
                        {index < records.length - 1 && records[index + 1].weightKg != null && (
                          <Text style={[styles.recordDelta, {
                            color: record.weightKg >= records[index + 1].weightKg! ? '#4CAF50' : '#F44336',
                          }]}>
                            {record.weightKg >= records[index + 1].weightKg! ? '↑' : '↓'}
                            {Math.abs(record.weightKg - records[index + 1].weightKg!).toFixed(2)} kg
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                  {record.heightCm != null && (() => {
                    const pct = getPercentileForRecord(record, 'height');
                    const pctLabel = pct != null ? getPercentileLabel(pct) : null;
                    return (
                      <View style={styles.recordValueItem}>
                        <Text style={[styles.recordValueLabel, { color: colors.textSecondary }]}>📐 Height</Text>
                        <Text style={[styles.recordValueText, { color: '#2196F3' }]}>{record.heightCm} cm</Text>
                        {pct != null && pctLabel && (
                          <Text style={[styles.recordPercentile, { color: pctLabel.color }]}>P{pct}</Text>
                        )}
                        {index < records.length - 1 && records[index + 1].heightCm != null && (
                          <Text style={[styles.recordDelta, {
                            color: record.heightCm >= records[index + 1].heightCm! ? '#4CAF50' : '#F44336',
                          }]}>
                            {record.heightCm >= records[index + 1].heightCm! ? '↑' : '↓'}
                            {Math.abs(record.heightCm - records[index + 1].heightCm!).toFixed(1)} cm
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                  {record.headCm != null && (() => {
                    const pct = getPercentileForRecord(record, 'head');
                    const pctLabel = pct != null ? getPercentileLabel(pct) : null;
                    return (
                      <View style={styles.recordValueItem}>
                        <Text style={[styles.recordValueLabel, { color: colors.textSecondary }]}>🧒 Head</Text>
                        <Text style={[styles.recordValueText, { color: '#FF9800' }]}>{record.headCm} cm</Text>
                        {pct != null && pctLabel && (
                          <Text style={[styles.recordPercentile, { color: pctLabel.color }]}>P{pct}</Text>
                        )}
                        {index < records.length - 1 && records[index + 1].headCm != null && (
                          <Text style={[styles.recordDelta, {
                            color: record.headCm >= records[index + 1].headCm! ? '#4CAF50' : '#F44336',
                          }]}>
                            {record.headCm >= records[index + 1].headCm! ? '↑' : '↓'}
                            {Math.abs(record.headCm - records[index + 1].headCm!).toFixed(1)} cm
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              </View>
            ))}
          </View>
        )}

        {records.length === 0 && (
          <View style={styles.emptyHistory}>
            <Text style={{ fontSize: 48 }}>📏</Text>
            <Text style={[styles.emptyHistoryTitle, { color: colors.text }]}>No measurements yet</Text>
            <Text style={[styles.emptyHistoryDesc, { color: colors.textSecondary }]}>
              Tap "+ Add Measurement" to record your baby's weight, height, or head circumference.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Measurement Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Measurement</Text>

            {/* Date */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DATE</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={formDate}
              onChangeText={handleDateChange}
              placeholder="DD-MM-YYYY"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={10}
            />

            {/* Weight */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>⚖️ WEIGHT</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={[styles.input, styles.weightInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={formWeight}
                onChangeText={setFormWeight}
                placeholder={formWeightUnit === 'kg' ? 'e.g. 4.5' : 'e.g. 4500'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
              <View style={[styles.unitToggle, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    formWeightUnit === 'kg' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setFormWeightUnit('kg')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.unitOptionText,
                    { color: formWeightUnit === 'kg' ? '#FFF' : colors.textSecondary },
                  ]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    formWeightUnit === 'g' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setFormWeightUnit('g')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.unitOptionText,
                    { color: formWeightUnit === 'g' ? '#FFF' : colors.textSecondary },
                  ]}>g</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Height */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>📐 HEIGHT (cm)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={formHeight}
              onChangeText={setFormHeight}
              placeholder="e.g. 52"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />

            {/* Head */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>🧒 HEAD (cm)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={formHead}
              onChangeText={setFormHead}
              placeholder="e.g. 35"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: colors.primary }]}
                onPress={handleAdd}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Simple SVG-free Line Chart ──────────────────────────
function GrowthChart({
  data,
  color,
  unit,
  colors,
}: {
  data: { date: string; value: number }[];
  color: string;
  unit: string;
  colors: any;
}) {
  if (data.length < 2) return null;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  const getX = (i: number) => CHART_PADDING + (i / (data.length - 1)) * CHART_WIDTH;
  const getY = (val: number) => CHART_HEIGHT - ((val - yMin) / yRange) * CHART_HEIGHT;

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange * i) / 4);

  return (
    <View style={styles.chartContainer}>
      {/* Y-axis labels */}
      {yTicks.map((tick, i) => {
        const y = getY(tick);
        return (
          <React.Fragment key={i}>
            <Text
              style={[styles.yLabel, { color: colors.textSecondary, top: y - 7, left: 0 }]}
            >
              {tick.toFixed(1)}
            </Text>
            <View
              style={[styles.gridLine, { top: y, left: CHART_PADDING, width: CHART_WIDTH, borderColor: colors.border }]}
            />
          </React.Fragment>
        );
      })}

      {/* Data points and connecting lines */}
      {data.map((point, i) => {
        const x = getX(i);
        const y = getY(point.value);
        return (
          <React.Fragment key={i}>
            {/* Connecting line to next point */}
            {i < data.length - 1 && (() => {
              const x2 = getX(i + 1);
              const y2 = getY(data[i + 1].value);
              const dx = x2 - x;
              const dy = y2 - y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  style={[
                    styles.chartLine,
                    {
                      left: x,
                      top: y,
                      width: length,
                      backgroundColor: color,
                      transform: [{ rotate: `${angle}deg` }],
                      transformOrigin: 'left center',
                    },
                  ]}
                />
              );
            })()}
            {/* Dot */}
            <View
              style={[
                styles.chartDot,
                {
                  left: x - 5,
                  top: y - 5,
                  backgroundColor: color,
                  borderColor: colors.surface,
                },
              ]}
            />
            {/* Value label on first, last, and every other point */}
            {(i === 0 || i === data.length - 1 || data.length <= 6 || i % Math.ceil(data.length / 5) === 0) && (
              <Text
                style={[
                  styles.dotLabel,
                  { left: x - 20, top: y - 20, color },
                ]}
              >
                {point.value}{unit}
              </Text>
            )}
          </React.Fragment>
        );
      })}

      {/* X-axis labels */}
      {data.map((point, i) => {
        if (data.length <= 6 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 5) === 0) {
          const x = getX(i);
          return (
            <Text
              key={`x-${i}`}
              style={[styles.xLabel, { left: x - 20, top: CHART_HEIGHT + 6, color: colors.textSecondary }]}
            >
              {format(parseISO(point.date), 'MMM d')}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
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
  // Latest measurement card
  latestCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  latestTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  latestDate: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  latestRow: {
    flexDirection: 'row',
    gap: 10,
  },
  latestItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 4,
  },
  latestEmoji: {
    fontSize: 22,
  },
  latestValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  latestUnit: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  percentileBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  percentileText: {
    fontSize: 11,
    fontWeight: '800',
  },
  percentileNote: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  // Chart
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  chartTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  chartTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  chartTabText: {
    fontSize: 13,
  },
  chartEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 30,
  },
  chartContainer: {
    height: CHART_HEIGHT + 30,
    marginTop: 8,
    position: 'relative',
  },
  yLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '500',
    width: CHART_PADDING - 4,
    textAlign: 'right',
  },
  xLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  gridLine: {
    position: 'absolute',
    height: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  chartLine: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 1.5,
  },
  chartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  dotLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    width: 40,
    textAlign: 'center',
  },
  // History
  historySection: {
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  recordCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  recordAge: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  deleteButton: {
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  recordValues: {
    flexDirection: 'row',
    gap: 12,
  },
  recordValueItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  recordValueLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordValueText: {
    fontSize: 18,
    fontWeight: '800',
  },
  recordDelta: {
    fontSize: 11,
    fontWeight: '700',
  },
  recordPercentile: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  // Empty state
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyHistoryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHistoryDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightInput: {
    flex: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
