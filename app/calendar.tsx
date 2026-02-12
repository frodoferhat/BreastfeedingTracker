import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import SessionCard from '../components/SessionCard';
import { getSessionsByBabyAndDate, getMarkedDatesForBaby, deleteSession } from '../database';
import { getTodayDate, getCurrentYearMonth, formatDateDisplay } from '../utils/time';
import { FeedingSession, MarkedDates } from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const initialDate = dateParam || getTodayDate();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentMonth, setCurrentMonth] = useState(initialDate.substring(0, 7));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(parseInt(initialDate.substring(0, 4)));
  const [calendarKey, setCalendarKey] = useState(initialDate);

  useEffect(() => {
    if (selectedBaby) {
      loadMarkedDates();
    }
  }, [selectedBaby, currentMonth, selectedDate]);

  useEffect(() => {
    if (selectedBaby) {
      loadSessions();
    }
  }, [selectedBaby, selectedDate]);

  const loadMarkedDates = async () => {
    if (!selectedBaby) return;
    try {
      const dates = await getMarkedDatesForBaby(selectedBaby.id, currentMonth);
      const marked: MarkedDates = {};
      const today = getTodayDate();

      dates.forEach((date) => {
        marked[date] = {
          marked: true,
          dotColor: colors.primary,
          selected: false,
          selectedColor: undefined,
        };
      });

      // Always highlight selected date with primary color
      if (!marked[selectedDate]) {
        marked[selectedDate] = {
          marked: false,
          dotColor: colors.primary,
          selected: true,
          selectedColor: colors.primary,
        };
      } else {
        marked[selectedDate].selected = true;
        marked[selectedDate].selectedColor = colors.primary;
      }

      // Highlight today with a soft distinct color (if not the selected date)
      if (today !== selectedDate) {
        const todayInMonth = today.substring(0, 7) === currentMonth;
        if (todayInMonth) {
          if (!marked[today]) {
            marked[today] = {
              marked: false,
              dotColor: colors.primary,
              selected: true,
              selectedColor: '#9CA3AF',
            };
          } else {
            marked[today].selected = true;
            marked[today].selectedColor = '#9CA3AF';
          }
        }
      }

      setMarkedDates(marked);
    } catch (err) {
      console.error('Failed to load marked dates:', err);
    }
  };

  const loadSessions = async () => {
    if (!selectedBaby) return;
    try {
      const rows = await getSessionsByBabyAndDate(selectedBaby.id, selectedDate);
      const mapped: FeedingSession[] = rows.map((r: any) => ({
        id: r.id,
        babyId: r.baby_id,
        startTime: r.start_time,
        endTime: r.end_time,
        duration: r.duration,
        firstBreastDuration: r.first_breast_duration,
        secondBreastDuration: r.second_breast_duration,
        breakDuration: r.break_duration,
        phases: r.phases,
        audioNotePath: r.audio_note_path,
        createdAt: r.created_at,
      }));
      setSessions(mapped);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const handleMonthChange = useCallback((month: DateData) => {
    setCurrentMonth(`${month.year}-${String(month.month).padStart(2, '0')}`);
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      loadSessions();
      loadMarkedDates();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handlePickMonth = (monthIndex: number) => {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const newDate = `${pickerYear}-${mm}-01`;
    setCurrentMonth(`${pickerYear}-${mm}`);
    setSelectedDate(newDate);
    setCalendarKey(newDate);
    setShowMonthPicker(false);
  };

  const handleReturnToToday = () => {
    const today = getTodayDate();
    const todayMonth = today.substring(0, 7);
    setSelectedDate(today);
    setCurrentMonth(todayMonth);
    setCalendarKey(today);
  };

  const isToday = selectedDate === getTodayDate();
  const currentMonthIndex = parseInt(currentMonth.substring(5, 7)) - 1;
  const currentYear = parseInt(currentMonth.substring(0, 4));

  if (!selectedBaby) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Please add a baby first to view logs
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Calendar
        key={calendarKey}
        initialDate={calendarKey}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        renderHeader={(date: any) => {
          const d = date instanceof Date ? date : new Date(date);
          const monthName = MONTHS[d.getMonth()];
          const year = d.getFullYear();
          return (
            <TouchableOpacity
              onPress={() => {
                setPickerYear(year);
                setShowMonthPicker(true);
              }}
              activeOpacity={0.6}
              style={[styles.headerTouchable, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.headerMonth, { color: colors.text }]}>
                {monthName} {year}
              </Text>
            </TouchableOpacity>
          );
        }}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textSecondary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.border,
          dotColor: colors.primary,
          selectedDotColor: '#FFFFFF',
          arrowColor: colors.primary,
          monthTextColor: colors.text,
          textMonthFontWeight: '700',
          textDayFontWeight: '500',
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
      />

      {/* Context button — always present for consistent layout */}
      {isToday ? (
        <View
          style={[styles.contextButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[styles.contextButtonText, { color: colors.text }]}>
            📋 Today's Breast Feeding Log
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleReturnToToday}
          style={[styles.contextButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
        >
          <Text style={styles.contextButtonTextWhite}>↩ Return to Today</Text>
        </TouchableOpacity>
      )}

      <View style={styles.dateHeader}>
        <Text style={[styles.dateTitle, { color: colors.text }]}>
          {formatDateDisplay(selectedDate)}
        </Text>
        <Text style={[styles.sessionCount, { color: colors.textSecondary }]}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SessionCard
            session={item}
            sessionNumber={sessions.length - index}
            onDelete={() => handleDeleteSession(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
              No feeding sessions on this day
            </Text>
          </View>
        }
      />

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={[styles.pickerPopup, { backgroundColor: colors.surface }]}>
            {/* Year selector */}
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)} style={styles.yearArrow}>
                <Text style={[styles.yearArrowText, { color: colors.primary }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: colors.text }]}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)} style={styles.yearArrow}>
                <Text style={[styles.yearArrowText, { color: colors.primary }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month grid */}
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => {
                const isCurrentMonth = i === currentMonthIndex && pickerYear === currentYear;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handlePickMonth(i)}
                    style={[
                      styles.monthCell,
                      {
                        backgroundColor: isCurrentMonth ? colors.primary : 'transparent',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        { color: isCurrentMonth ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {m.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contextButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  contextButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  contextButtonTextWhite: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sessionCount: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  emptyList: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
  },
  headerTouchable: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerMonth: {
    fontSize: 17,
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pickerPopup: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearArrow: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowText: {
    fontSize: 28,
    fontWeight: '600',
  },
  yearText: {
    fontSize: 22,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  monthCellText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
