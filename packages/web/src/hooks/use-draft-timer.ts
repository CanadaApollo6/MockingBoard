'use client';

import { useEffect, useRef } from 'react';
import { usePickTimer } from '@/hooks/use-pick-timer';

interface DraftTimerOptions {
  secondsPerPick: number;
  isActive: boolean;
  onExpire: () => void;
  /** Current pick number — resets timer when it changes */
  currentPick: number | undefined;
  /** Status string — resets timer when resuming from pause */
  status: string | undefined;
}

export interface DraftTimerState {
  remaining: number | null;
  clockUrgency: 'normal' | 'warning' | 'critical';
  resetTimer: () => void;
}

export function useDraftTimer({
  secondsPerPick,
  isActive,
  onExpire,
  currentPick,
  status,
}: DraftTimerOptions): DraftTimerState {
  const {
    remaining,
    isWarning,
    isCritical,
    reset: resetTimer,
  } = usePickTimer({
    secondsPerPick,
    isActive,
    onExpire,
  });

  const clockUrgency = isCritical
    ? ('critical' as const)
    : isWarning
      ? ('warning' as const)
      : ('normal' as const);

  // Reset timer when pick changes or draft resumes from pause
  const prevPickRef = useRef(currentPick);
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const pickChanged = currentPick !== prevPickRef.current;
    const resumed = prevStatusRef.current === 'paused' && status === 'active';
    prevPickRef.current = currentPick;
    prevStatusRef.current = status;
    if (pickChanged || resumed) resetTimer();
  }, [currentPick, status, resetTimer]);

  return { remaining, clockUrgency, resetTimer };
}
