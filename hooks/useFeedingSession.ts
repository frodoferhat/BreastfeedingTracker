import { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveSession, FeedingPhase, PhaseEntry } from '../types';
import {
  insertSession,
  endSession as dbEndSession,
  getActiveSession,
  getLastCompletedSession,
} from '../database';
import { nowISO, calculateDuration, generateId } from '../utils/time';
import { DEBOUNCE_MS } from '../constants';

export function useFeedingSession(babyId: string | null) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isFeeding, setIsFeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Phase tracking
  const [currentPhase, setCurrentPhase] = useState<FeedingPhase>('first');
  const [onBreak, setOnBreak] = useState(false);
  const [firstElapsed, setFirstElapsed] = useState(0);
  const [secondElapsed, setSecondElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const phasesRef = useRef<PhaseEntry[]>([]);
  const phaseStartRef = useRef<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapRef = useRef<number>(0);

  // Accumulators for durations when phases complete
  const firstAccRef = useRef(0);
  const secondAccRef = useRef(0);
  const breakAccRef = useRef(0);

  // Suggested breast for next session
  const [suggestedBreast, setSuggestedBreast] = useState<FeedingPhase | null>(null);

  const loadSuggestedBreast = async () => {
    if (!babyId) return;
    try {
      const row = await getLastCompletedSession(babyId);
      if (row?.phases) {
        const phases: PhaseEntry[] = JSON.parse(row.phases);
        // Find the last breast phase (not break)
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i].type === 'first' || phases[i].type === 'second') {
            setSuggestedBreast(phases[i].type === 'first' ? 'second' : 'first');
            return;
          }
        }
      }
      setSuggestedBreast(null);
    } catch {
      setSuggestedBreast(null);
    }
  };

  // Restore active session on mount
  useEffect(() => {
    if (!babyId) return;
    restoreSession();
    loadSuggestedBreast();
  }, [babyId]);

  // Timer effect
  useEffect(() => {
    if (isFeeding && activeSession) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();

        // Current phase elapsed
        if (phaseStartRef.current) {
          const phaseStart = new Date(phaseStartRef.current).getTime();
          const phaseElapsed = Math.floor((now - phaseStart) / 1000);

          if (onBreak) {
            setBreakElapsed(breakAccRef.current + phaseElapsed);
          } else if (currentPhase === 'first') {
            setFirstElapsed(firstAccRef.current + phaseElapsed);
          } else {
            setSecondElapsed(secondAccRef.current + phaseElapsed);
          }
        }

        // Total elapsed = feeding time only (first + second, excluding breaks)
        // We need live values, so recalculate from accumulators + current phase
        if (onBreak) {
          // During break, feeding chrono is frozen
          setElapsed(firstAccRef.current + secondAccRef.current);
        } else if (phaseStartRef.current) {
          const phaseStart = new Date(phaseStartRef.current).getTime();
          const phaseElapsed = Math.floor((now - phaseStart) / 1000);
          if (currentPhase === 'first') {
            setElapsed(firstAccRef.current + phaseElapsed + secondAccRef.current);
          } else {
            setElapsed(firstAccRef.current + secondAccRef.current + phaseElapsed);
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isFeeding) {
        setElapsed(0);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFeeding, activeSession, currentPhase, onBreak]);

  const restoreSession = async () => {
    if (!babyId) return;
    try {
      const session = await getActiveSession(babyId);
      if (session) {
        const active: ActiveSession = {
          id: session.id,
          babyId: session.baby_id,
          startTime: session.start_time,
        };
        setActiveSession(active);
        setIsFeeding(true);
        setCurrentPhase('first');
        setOnBreak(false);
        phasesRef.current = [{ type: 'first', startTime: session.start_time }];
        phaseStartRef.current = session.start_time;
        firstAccRef.current = 0;
        secondAccRef.current = 0;
        breakAccRef.current = 0;
        setStatusMessage('FEEDING IN PROGRESS');
        const start = new Date(session.start_time).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
        setFirstElapsed(Math.floor((Date.now() - start) / 1000));
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    }
  };

  const startFeeding = useCallback(async (): Promise<void> => {
    if (!babyId) return;

    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) return;
    lastTapRef.current = now;

    const id = generateId();
    const startTime = nowISO();

    try {
      await insertSession(id, babyId, startTime);
      const session: ActiveSession = { id, babyId, startTime };
      setActiveSession(session);
      setIsFeeding(true);
      setCurrentPhase('first');
      setOnBreak(false);
      setFirstElapsed(0);
      setSecondElapsed(0);
      setBreakElapsed(0);
      firstAccRef.current = 0;
      secondAccRef.current = 0;
      breakAccRef.current = 0;
      phasesRef.current = [{ type: 'first', startTime }];
      phaseStartRef.current = startTime;
      setStatusMessage('FEEDING STARTED');
      setElapsed(0);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }, [babyId]);

  const stopFeeding = useCallback(async (): Promise<{
    sessionId: string;
    duration: number;
  } | null> => {
    if (!activeSession) return null;

    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) return null;
    lastTapRef.current = now;

    const endTime = nowISO();

    // Close current phase
    if (phasesRef.current.length > 0 && phaseStartRef.current) {
      const lastPhase = phasesRef.current[phasesRef.current.length - 1];
      lastPhase.endTime = endTime;
      lastPhase.duration = calculateDuration(phaseStartRef.current, endTime);

      if (onBreak) {
        breakAccRef.current += lastPhase.duration;
      } else if (currentPhase === 'first') {
        firstAccRef.current += lastPhase.duration;
      } else {
        secondAccRef.current += lastPhase.duration;
      }
    }

    const firstTotal = firstAccRef.current;
    const secondTotal = secondAccRef.current;
    const breakTotal = breakAccRef.current;
    const feedingDuration = firstTotal + secondTotal; // Exclude breaks

    try {
      await dbEndSession(
        activeSession.id,
        endTime,
        feedingDuration,
        firstTotal,
        secondTotal,
        breakTotal,
        JSON.stringify(phasesRef.current)
      );
      const result = { sessionId: activeSession.id, duration: feedingDuration };
      setIsFeeding(false);
      setActiveSession(null);
      setStatusMessage('FEEDING ENDED');
      setElapsed(0);
      setFirstElapsed(0);
      setSecondElapsed(0);
      setBreakElapsed(0);
      setCurrentPhase('first');
      setOnBreak(false);
      phasesRef.current = [];
      phaseStartRef.current = null;
      firstAccRef.current = 0;
      secondAccRef.current = 0;
      breakAccRef.current = 0;

      setTimeout(() => setStatusMessage(''), 3000);

      // Reload suggestion for next session
      loadSuggestedBreast();

      return result;
    } catch (err) {
      console.error('Failed to end session:', err);
      return null;
    }
  }, [activeSession, currentPhase, onBreak]);

  const switchBreast = useCallback(() => {
    if (!isFeeding) return;

    const switchTime = nowISO();
    const newPhase: FeedingPhase = currentPhase === 'first' ? 'second' : 'first';

    if (onBreak) {
      // During break: just flip the breast label, break phase stays open.
      // When "Continue Feeding" is tapped, it will resume on the new breast.
      setCurrentPhase(newPhase);
      return;
    }

    // Close current breast phase
    if (phaseStartRef.current) {
      const lastPhase = phasesRef.current[phasesRef.current.length - 1];
      lastPhase.endTime = switchTime;
      lastPhase.duration = calculateDuration(phaseStartRef.current, switchTime);

      if (currentPhase === 'first') {
        firstAccRef.current += lastPhase.duration;
      } else {
        secondAccRef.current += lastPhase.duration;
      }
    }

    // Switch to other breast
    setCurrentPhase(newPhase);
    phasesRef.current.push({ type: newPhase, startTime: switchTime });
    phaseStartRef.current = switchTime;
  }, [isFeeding, onBreak, currentPhase]);

  const toggleBreak = useCallback(() => {
    if (!isFeeding) return;

    const breakTime = nowISO();

    if (!onBreak) {
      // Start break — close current breast phase
      if (phaseStartRef.current) {
        const lastPhase = phasesRef.current[phasesRef.current.length - 1];
        lastPhase.endTime = breakTime;
        lastPhase.duration = calculateDuration(phaseStartRef.current, breakTime);

        if (currentPhase === 'first') {
          firstAccRef.current += lastPhase.duration;
        } else {
          secondAccRef.current += lastPhase.duration;
        }
      }

      setOnBreak(true);
      phasesRef.current.push({ type: 'break', startTime: breakTime });
      phaseStartRef.current = breakTime;
    } else {
      // End break — close break phase, resume current breast
      if (phaseStartRef.current) {
        const lastPhase = phasesRef.current[phasesRef.current.length - 1];
        lastPhase.endTime = breakTime;
        lastPhase.duration = calculateDuration(phaseStartRef.current, breakTime);
        breakAccRef.current += lastPhase.duration;
      }

      setOnBreak(false);
      phasesRef.current.push({ type: currentPhase, startTime: breakTime });
      phaseStartRef.current = breakTime;
    }
  }, [isFeeding, onBreak, currentPhase]);

  const toggleFeeding = useCallback(async () => {
    if (isFeeding) {
      return await stopFeeding();
    } else {
      await startFeeding();
      return null;
    }
  }, [isFeeding, startFeeding, stopFeeding]);

  return {
    isFeeding,
    elapsed,
    statusMessage,
    activeSession,
    currentPhase,
    onBreak,
    firstElapsed,
    secondElapsed,
    breakElapsed,
    suggestedBreast,
    toggleFeeding,
    startFeeding,
    stopFeeding,
    switchBreast,
    toggleBreak,
  };
}
