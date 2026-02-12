import { format, parseISO, differenceInSeconds } from 'date-fns';

/**
 * Format seconds into HH:MM:SS string
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into human readable string (e.g. "1h 23m")
 */
export function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Format seconds into MM:SS string (e.g. "05:23")
 */
export function formatDurationMMSS(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${totalMinutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format ISO datetime string to local time (HH:mm:ss — e.g. 14:02:35)
 */
/**
 * Safely parse a date string that may use 'T' or ' ' as separator
 */
function safeParseISO(dateStr: string): Date {
  return parseISO(dateStr.replace(' ', 'T'));
}

export function formatTime(isoString: string): string {
  return format(safeParseISO(isoString), 'HH:mm');
}

/**
 * Format ISO datetime string to local time with seconds (HH:mm:ss)
 */
export function formatTimeWithSeconds(isoString: string): string {
  return format(safeParseISO(isoString), 'HH:mm:ss');
}

/**
 * Format ISO date string to display format (e.g. "12-02-2026")
 */
export function formatDateDisplay(isoString: string): string {
  return format(safeParseISO(isoString), 'dd-MM-yyyy');
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get current year-month as YYYY-MM
 */
export function getCurrentYearMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Calculate duration between two ISO datetime strings in seconds
 */
export function calculateDuration(startTime: string, endTime: string): number {
  return differenceInSeconds(parseISO(endTime), parseISO(startTime));
}

/**
 * Get ISO datetime string for now (UTC)
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Generate a unique ID without requiring crypto.getRandomValues
 * Uses timestamp + random suffix for uniqueness
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const random2 = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}-${random2}`;
}
