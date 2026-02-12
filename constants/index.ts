import { ThemeColors } from '../types';

export const LIGHT_THEME: ThemeColors = {
  background: '#F7F7F8',
  surface: '#FFFFFF',
  primary: '#4A6572',
  primaryLight: '#E8EEF1',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E0E0E0',
  success: '#059669',
  danger: '#C0392B',
  warning: '#D97706',
  card: '#FFFFFF',
  statusBar: 'dark',
};

export const DARK_THEME: ThemeColors = {
  background: '#1A1A2E',
  surface: '#2D2D44',
  primary: '#7FA0B0',
  primaryLight: '#2A3A42',
  text: '#F0F0F0',
  textSecondary: '#9CA3AF',
  border: '#374151',
  success: '#34D399',
  danger: '#E07070',
  warning: '#FBBF24',
  card: '#2D2D44',
  statusBar: 'light',
};

export const DEBOUNCE_MS = 500;

export const DEFAULT_REMINDER_HOURS = 2;
export const DEFAULT_REMINDER_MINUTES = 30;

export const STORAGE_KEYS = {
  THEME_MODE: 'theme_mode',
  ACTIVE_SESSION: 'active_session',
  SELECTED_BABY_ID: 'selected_baby_id',
};

export const DATE_FORMATS = {
  TIME: 'HH:mm',
  TIME_WITH_SECONDS: 'HH:mm:ss',
  DATE: 'yyyy-MM-dd',
  DATE_DISPLAY: 'dd-MM-yyyy',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  DATETIME_DISPLAY: 'dd-MM-yyyy HH:mm',
};
