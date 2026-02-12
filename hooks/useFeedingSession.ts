import { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveSession, FeedingPhase, FeedingMode, PhaseEntry } from '../types';
import {
  insertSession,
  endSession as dbEndSession,
  getActiveSession,
  getLastCompletedSession,
  updateSessionPhaseState,
  updateSessionVolume,
} from '../database';
import { nowISO, calculateDuration, generateId } from '../utils/time';
import { DEBOUNCE_MS } from '../constants';

interface PhaseStateSnapshot {
  currentPhase: FeedingPhase;
  onBreak: boolean;
  phases: PhaseEntry[];
  phaseStart: string | null;
  firstAcc: number;
  secondAcc: number;
  breakAcc: number;
  feedingMode: FeedingMode;
}

export function useFeedingSession(babyId: string | null) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isFeeding, setIsFeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [feedingMode, setFeedingMode] = useState<FeedingMode>('breast');

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
  const [lastWasBottle, setLastWasBottle] = useState(false);
  const [suggestedVersion, setSuggestedVersion] = useState(0);

  const loadSuggestedBreast = async () => {
    if (!babyId) return;
    try {
      const row = await getLastCompletedSession(babyId);
      if (!row) {
        setSuggestedBreast(null);
        setLastWasBottle(false);
        setSuggestedVersion(v => v + 1);
        return;
      }

      // If last session was bottle, don't suggest a breast
      if (row.feeding_mode === 'bottle') {
        setSuggestedBreast(null);
        setLastWasBottle(true);
        setSuggestedVersion(v => v + 1);
        return;
      }

      setLastWasBottle(false);
      if (row.phases) {
        const phases: PhaseEntry[] = JSON.parse(row.phases);
        // Find the last breast phase (not break)
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i].type === 'first' || phases[i].type === 'second') {
            setSuggestedBreast(phases[i].type === 'first' ? 'second' : 'first');
            setSuggestedVersion(v => v + 1);
            return;
          }
        }
      }
      setSuggestedBreast(null);
      setSuggestedVersion(v => v + 1);
    } catch {
      setSuggestedBreast(null);
      setLastWasBottle(false);
      setSuggestedVersion(v => v + 1);
    }
  };

  // Save current phase state to DB (called before switching babies)
  const savePhaseState = useCallback(async () => {
    if (!activeSession) return;
    const snapshot: PhaseStateSnapshot = {
      currentPhase,
      onBreak,
      phases: phasesRef.current,
      phaseStart: phaseStartRef.current,
      firstAcc: firstAccRef.current,
      secondAcc: secondAccRef.current,
      breakAcc: breakAccRef.current,
      feedingMode,
    };
    // Accumulate current running phase into snapshot so elapsed is correct on restore
    if (phaseStartRef.current) {
      const phaseElapsed = calculateDuration(phaseStartRef.current, nowISO());
      if (onBreak) {
        snapshot.breakAcc += phaseElapsed;
      } else if (currentPhase === 'first') {
        snapshot.firstAcc += phaseElapsed;
      } else {
        snapshot.secondAcc += phaseElapsed;
      }
      // Update phaseStart to now so the next tick starts fresh from this moment
      snapshot.phaseStart = nowISO();
    }
    try {
      await updateSessionPhaseState(activeSession.id, JSON.stringify(snapshot));
    } catch (err) {
      console.error('Failed to save phase state:', err);
    }
  }, [activeSession, currentPhase, onBreak, feedingMode]);

  // Ref to savePhaseState so the cleanup effect always sees the latest
  const savePhaseStateRef = useRef(savePhaseState);
  savePhaseStateRef.current = savePhaseState;

  // Restore active session on mount / baby switch
  useEffect(() => {
    if (!babyId) {
      // Clear UI state when no baby
      setIsFeeding(false);
      setActiveSession(null);
      setElapsed(0);
      setFirstElapsed(0);
      setSecondElapsed(0);
      setBreakElapsed(0);
      setCurrentPhase('first');
      setOnBreak(false);
      setFeedingMode('breast');
      return;
    }

    // Save outgoing baby's state before loading new baby
    savePhaseStateRef.current().then(() => {
      restoreSession();
      loadSuggestedBreast();
    });
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
        const restoredMode: FeedingMode = session.feeding_mode ?? 'breast';
        const active: ActiveSession = {
          id: session.id,
          babyId: session.baby_id,
          startTime: session.start_time,
          feedingMode: restoredMode,
        };
        setActiveSession(active);
        setIsFeeding(true);
        setFeedingMode(restoredMode);

        // Try to restore full phase state from DB
        if (session.phase_state) {
          try {
            const snap: PhaseStateSnapshot = JSON.parse(session.phase_state);
            setCurrentPhase(snap.currentPhase);
            setOnBreak(snap.onBreak);
            if (snap.feedingMode) setFeedingMode(snap.feedingMode);
            phasesRef.current = snap.phases;
            phaseStartRef.current = snap.phaseStart;
            firstAccRef.current = snap.firstAcc;
            secondAccRef.current = snap.secondAcc;
            breakAccRef.current = snap.breakAcc;
            setFirstElapsed(snap.firstAcc);
            setSecondElapsed(snap.secondAcc);
            setBreakElapsed(snap.breakAcc);
            setElapsed(snap.firstAcc + snap.secondAcc);
            setStatusMessage('FEEDING IN PROGRESS');
            return;
          } catch {
            // Fallback to basic restore
          }
        }

        // Basic restore (no phase state saved yet)
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
      } else {
        // No active session for this baby — clear state
        setIsFeeding(false);
        setActiveSession(null);
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
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    }
  };

  // Quick persist of current refs to DB (call after mutations)
  const persistPhaseState = async (sessionId: string, phase: FeedingPhase, isOnBreak: boolean) => {
    const snapshot: PhaseStateSnapshot = {
      currentPhase: phase,
      onBreak: isOnBreak,
      phases: phasesRef.current,
      phaseStart: phaseStartRef.current,
      firstAcc: firstAccRef.current,
      secondAcc: secondAccRef.current,
      breakAcc: breakAccRef.current,
      feedingMode,
    };
    try {
      await updateSessionPhaseState(sessionId, JSON.stringify(snapshot));
    } catch (err) {
      console.error('Failed to persist phase state:', err);
    }
  };

  const startFeeding = useCallback(async (mode: FeedingMode = 'breast'): Promise<void> => {
    if (!babyId) return;

    const now = Date.now();
    if (now - lastTapRef.current < DEBOUNCE_MS) return;
    lastTapRef.current = now;

    const id = generateId();
    const startTime = nowISO();

    try {
      await insertSession(id, babyId, startTime, mode);
      const session: ActiveSession = { id, babyId, startTime, feedingMode: mode };
      setActiveSession(session);
      setIsFeeding(true);
      setFeedingMode(mode);
      setCurrentPhase('first');
      setOnBreak(false);
      setFirstElapsed(0);
      setSecondElapsed(0);
      setBreakElapsed(0);
      firstAccRef.current = 0;
      secondAccRef.current = 0;
      breakAccRef.current = 0;
      phasesRef.current = mode === 'bottle'
        ? [{ type: 'first', startTime }]   // bottle uses single "first" phase
        : [{ type: 'first', startTime }];
      phaseStartRef.current = startTime;
      setStatusMessage(mode === 'bottle' ? 'BOTTLE FEEDING STARTED' : 'FEEDING STARTED');
      setElapsed(0);
      await persistPhaseState(id, 'first', false);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }, [babyId]);

  const stopFeeding = useCallback(async (): Promise<{
    sessionId: string;
    duration: number;
    feedingMode: FeedingMode;
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
    const endedMode = feedingMode;

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
      const result = { sessionId: activeSession.id, duration: feedingDuration, feedingMode: endedMode };
      setIsFeeding(false);
      setActiveSession(null);
      setFeedingMode('breast'); // Reset to default
      setStatusMessage(endedMode === 'bottle' ? 'BOTTLE FEEDING ENDED' : 'FEEDING ENDED');
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
    if (!isFeeding || !activeSession) return;

    const switchTime = nowISO();
    const newPhase: FeedingPhase = currentPhase === 'first' ? 'second' : 'first';

    if (onBreak) {
      // During break: just flip the breast label, break phase stays open.
      // When "Continue Feeding" is tapped, it will resume on the new breast.
      setCurrentPhase(newPhase);
      persistPhaseState(activeSession.id, newPhase, true);
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
    persistPhaseState(activeSession.id, newPhase, false);
  }, [isFeeding, onBreak, currentPhase, activeSession]);

  const toggleBreak = useCallback(() => {
    if (!isFeeding || !activeSession) return;

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
      persistPhaseState(activeSession.id, currentPhase, true);
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
      persistPhaseState(activeSession.id, currentPhase, false);
    }
  }, [isFeeding, onBreak, currentPhase, activeSession]);

  const toggleFeeding = useCallback(async (mode: FeedingMode = 'breast') => {
    if (isFeeding) {
      return await stopFeeding();
    } else {
      await startFeeding(mode);
      return null;
    }
  }, [isFeeding, startFeeding, stopFeeding]);

  const saveVolume = useCallback(async (sessionId: string, volume: number) => {
    try {
      await updateSessionVolume(sessionId, volume);
    } catch (err) {
      console.error('Failed to save volume:', err);
    }
  }, []);

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
    lastWasBottle,
    suggestedVersion,
    feedingMode,
    toggleFeeding,
    startFeeding,
    stopFeeding,
    switchBreast,
    toggleBreak,
    saveVolume,
  };
}
