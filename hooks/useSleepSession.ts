import { useState, useEffect, useRef, useCallback } from 'react';
import { LastSleepInfo, SleepType } from '../types';
import {
  insertSleepSession,
  endSleepSession as dbEndSleep,
  getActiveSleepSession,
  getLastCompletedSleepSession,
} from '../database';
import { nowISO, calculateDuration, generateId } from '../utils/time';
import { DEBOUNCE_MS } from '../constants';

function detectSleepType(): SleepType {
  const hour = new Date().getHours();
  // Night sleep: 7pm–7am
  return hour >= 19 || hour < 7 ? 'night' : 'nap';
}

export function useSleepSession(babyId: string | null) {
  const [isSleeping, setIsSleeping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [sleepType, setSleepType] = useState<SleepType>('nap');
  const [lastSleepInfo, setLastSleepInfo] = useState<LastSleepInfo | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapRef = useRef<number>(0);

  // Load last completed sleep for "slept X ago" ticker
  const loadLastSleep = useCallback(async () => {
    if (!babyId) { setLastSleepInfo(null); return; }
    try {
      const row = await getLastCompletedSleepSession(babyId);
      if (row) {
        setLastSleepInfo({
          endTime: row.end_time,
          duration: row.duration ?? 0,
          sleepType: row.sleep_type ?? 'nap',
        });
      } else {
        setLastSleepInfo(null);
      }
    } catch {
      setLastSleepInfo(null);
    }
  }, [babyId]);

  // Restore active session on mount / baby switch
  useEffect(() => {
    if (!babyId) {
      setIsSleeping(false);
      setSessionId(null);
      setStartTime(null);
      setElapsed(0);
      return;
    }

    const restore = async () => {
      try {
        const session = await getActiveSleepSession(babyId);
        if (session) {
          setSessionId(session.id);
          setStartTime(session.start_time);
          setSleepType(session.sleep_type ?? 'nap');
          setIsSleeping(true);
          const start = new Date(session.start_time.replace(' ', 'T')).getTime();
          setElapsed(Math.floor((Date.now() - start) / 1000));
        } else {
          setIsSleeping(false);
          setSessionId(null);
          setStartTime(null);
          setElapsed(0);
        }
      } catch (err) {
        console.error('Failed to restore sleep session:', err);
      }
      loadLastSleep();
    };

    restore();
  }, [babyId]);

  // Timer
  useEffect(() => {
    if (isSleeping && startTime) {
      intervalRef.current = setInterval(() => {
        const start = new Date(startTime.replace(' ', 'T')).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isSleeping) setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSleeping, startTime]);

  const toggleSleep = useCallback(async (): Promise<{
    duration: number;
    sessionId: string;
    sleepType: SleepType;
  } | null> => {
    // Debounce
    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) return null;
    lastTapRef.current = now;

    if (!babyId) return null;

    if (!isSleeping) {
      // Start sleep
      const id = generateId();
      const start = nowISO();
      const type = detectSleepType();
      await insertSleepSession(id, babyId, start, type);
      setSessionId(id);
      setStartTime(start);
      setSleepType(type);
      setIsSleeping(true);
      return null;
    } else {
      // End sleep
      if (!sessionId || !startTime) return null;
      const end = nowISO();
      const dur = calculateDuration(startTime, end);
      await dbEndSleep(sessionId, end, dur);

      const result = { duration: dur, sessionId, sleepType };

      setIsSleeping(false);
      setSessionId(null);
      setStartTime(null);
      setElapsed(0);

      // Refresh last sleep info
      loadLastSleep();

      return result;
    }
  }, [babyId, isSleeping, sessionId, startTime, sleepType, loadLastSleep]);

  return {
    isSleeping,
    elapsed,
    sleepType,
    lastSleepInfo,
    toggleSleep,
    loadLastSleep,
  };
}
