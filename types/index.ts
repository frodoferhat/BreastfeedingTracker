export type BabyGender = 'boy' | 'girl' | undefined;

export type FeedingPhase = 'first' | 'break' | 'second';

export type FeedingMode = 'breast' | 'bottle';

export type DiaperType = 'pee' | 'poop' | 'both';

export interface DiaperLog {
  id: string;
  babyId: string;
  type: DiaperType;
  createdAt: string; // ISO datetime string
}

export interface DiaperDayStats {
  date: string;
  totalPee: number;
  totalPoop: number;
  total: number;
}

export interface DiaperWeekStats {
  totalPee: number;
  totalPoop: number;
  total: number;
  avgPerDay: number;
}

export interface BottleDayStats {
  bottleCount: number;
  breastCount: number;
  totalVolume: number;   // ml
  avgVolume: number;     // ml
}

export interface BottleWeekStats {
  bottleCount: number;
  breastCount: number;
  totalVolume: number;   // ml
  avgVolume: number;     // ml
  avgDailyVolume: number; // ml per day
}

export interface PhaseEntry {
  type: FeedingPhase;
  startTime: string; // ISO
  endTime?: string;  // ISO
  duration?: number;  // seconds
}

export interface Baby {
  id: string;
  name: string;
  birthDate: string; // ISO date string
  gender?: BabyGender;
  createdAt: string; // ISO datetime string
}

export interface FeedingSession {
  id: string;
  babyId: string;
  startTime: string; // ISO datetime string (UTC)
  endTime: string | null; // ISO datetime string (UTC), null if ongoing
  duration: number | null; // total feeding duration in seconds (excluding breaks), null if ongoing
  feedingMode: FeedingMode; // 'breast' or 'bottle'
  volume: number | null; // ml, for bottle feeding
  firstBreastDuration: number | null;
  secondBreastDuration: number | null;
  breakDuration: number | null;
  phases: string | null; // JSON string of PhaseEntry[]
  audioNotePath: string | null; // file URI for audio note
  note: string | null; // quick text note
  createdAt: string; // ISO datetime string
}

export interface ActiveSession {
  id: string;
  babyId: string;
  startTime: string;
  feedingMode: FeedingMode;
}

export interface LastFeedInfo {
  endTime: string;       // ISO datetime
  duration: number;      // seconds
  feedingMode: FeedingMode;
  lastBreast: 'first' | 'second' | null; // which breast was last used
  volume: number | null; // ml, for bottle
}

export interface DayStatistics {
  date: string;
  totalFeedings: number;
  totalDuration: number; // in seconds
  averageDuration: number; // in seconds
  longestSession: number; // in seconds
  shortestSession: number; // in seconds
}

export interface WeekStatistics {
  startDate: string;
  endDate: string;
  totalFeedings: number;
  totalDuration: number;
  averageDuration: number;
  averageFeedingsPerDay: number;
}

export interface MarkedDate {
  marked: boolean;
  dotColor: string;
  selected?: boolean;
  selectedColor?: string;
}

export interface MarkedDates {
  [date: string]: MarkedDate;
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  danger: string;
  warning: string;
  card: string;
  statusBar: 'light' | 'dark';
}
