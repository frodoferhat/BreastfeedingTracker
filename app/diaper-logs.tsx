import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useBaby } from '../contexts/BabyContext';
import { getDiaperLogsByBabyAndDateRange, deleteDiaperLog } from '../database';
import { formatTime, formatDateDisplay } from '../utils/time';
import { DiaperLog } from '../types';
import { format, subDays } from 'date-fns';

interface DayGroup {
  date: string;
  logs: DiaperLog[];
  peeCount: number;
  poopCount: number;
}

export default function DiaperLogsScreen() {
  const { colors } = useTheme();
  const { selectedBaby } = useBaby();
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!selectedBaby) return;
    const end = format(new Date(), 'yyyy-MM-dd');
    const start = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const rows = await getDiaperLogsByBabyAndDateRange(selectedBaby.id, start, end);

    const logs: DiaperLog[] = rows.map((r: any) => ({
      id: r.id,
      babyId: r.baby_id,
      type: r.type,
      createdAt: r.created_at,
    }));

    // Group by local date
    const map = new Map<string, DiaperLog[]>();
    for (const log of logs) {
      const localDate = format(new Date(log.createdAt.replace(' ', 'T')), 'yyyy-MM-dd');
      if (!map.has(localDate)) map.set(localDate, []);
      map.get(localDate)!.push(log);
    }

    const grouped: DayGroup[] = Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dayLogs]) => ({
        date,
        logs: dayLogs,
        peeCount: dayLogs.filter(l => l.type === 'pee' || l.type === 'both').length,
        poopCount: dayLogs.filter(l => l.type === 'poop' || l.type === 'both').length,
      }));

    setGroups(grouped);
  }, [selectedBaby]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDelete = (logId: string) => {
    Alert.alert('Delete', 'Remove this diaper log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDiaperLog(logId);
          await loadLogs();
        },
      },
    ]);
  };

  const toggleDate = (date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'pee': return '💧';
      case 'poop': return '💩';
      case 'both': return '💧💩';
      default: return '';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pee': return 'Pee';
      case 'poop': return 'Poop';
      case 'both': return 'Pee + Poop';
      default: return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pee': return '#3B82F6';
      case 'poop': return '#92400E';
      case 'both': return '#7C3AED';
      default: return colors.text;
    }
  };

  if (!selectedBaby) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No baby selected
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          🧷 Diaper Log
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {selectedBaby.name} — Last 30 days
        </Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🧷</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No diaper changes recorded yet
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {groups.map((group) => {
            const isExpanded = expandedDate === group.date;
            return (
              <View key={group.date}>
                {/* Date Header — tappable */}
                <TouchableOpacity
                  onPress={() => toggleDate(group.date)}
                  activeOpacity={0.7}
                  style={[
                    styles.dateCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isExpanded ? colors.primary : colors.border,
                      borderWidth: isExpanded ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.dateCardLeft}>
                    <Text style={[styles.dateCardArrow, { color: colors.textSecondary }]}>
                      {isExpanded ? '▼' : '▶'}
                    </Text>
                    <Text style={[styles.dateCardTitle, { color: colors.text }]}>
                      {formatDateDisplay(group.date)}
                    </Text>
                  </View>
                  <View style={styles.dateCardStats}>
                    <View style={[styles.miniChip, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={styles.miniChipEmoji}>💧</Text>
                      <Text style={[styles.miniChipValue, { color: '#3B82F6' }]}>{group.peeCount}</Text>
                    </View>
                    <View style={[styles.miniChip, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={styles.miniChipEmoji}>💩</Text>
                      <Text style={[styles.miniChipValue, { color: '#92400E' }]}>{group.poopCount}</Text>
                    </View>
                    <View style={[styles.miniChip, { backgroundColor: colors.background }]}>
                      <Text style={[styles.miniChipValue, { color: colors.text }]}>{group.logs.length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expanded logs */}
                {isExpanded && (
                  <View style={styles.logsContainer}>
                    {group.logs.map((log, index) => (
                      <TouchableOpacity
                        key={log.id}
                        onLongPress={() => handleDelete(log.id)}
                        activeOpacity={0.7}
                        style={[
                          styles.logRow,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.logNumber, { color: colors.textSecondary }]}>
                          #{group.logs.length - index}
                        </Text>
                        <View style={[styles.logTypeBadge, { backgroundColor: getTypeColor(log.type) + '18' }]}>
                          <Text style={styles.logTypeEmoji}>{getTypeEmoji(log.type)}</Text>
                          <Text style={[styles.logTypeLabel, { color: getTypeColor(log.type) }]}>
                            {getTypeLabel(log.type)}
                          </Text>
                        </View>
                        <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                          {formatTime(log.createdAt)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={[styles.deleteHint, { color: colors.textSecondary }]}>
                      Long press to delete
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  dateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateCardArrow: {
    fontSize: 12,
    fontWeight: '700',
    width: 16,
  },
  dateCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateCardStats: {
    flexDirection: 'row',
    gap: 6,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 3,
  },
  miniChipEmoji: {
    fontSize: 13,
  },
  miniChipValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  logsContainer: {
    paddingLeft: 20,
    paddingBottom: 12,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
    gap: 10,
  },
  logNumber: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 28,
  },
  logTypeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  logTypeEmoji: {
    fontSize: 18,
  },
  logTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
  },
});
