'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePickTimerOptions {
  secondsPerPick: number;
  isActive: boolean;
  onExpire: () => void;
}

export function usePickTimer({
  secondsPerPick,
  isActive,
  onExpire,
}: UsePickTimerOptions) {
  const [remaining, setRemaining] = useState<number | null>(
    secondsPerPick > 0 ? secondsPerPick : null,
  );
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reset = useCallback(() => {
    expiredRef.current = false;
    setRemaining(secondsPerPick > 0 ? secondsPerPick : null);
  }, [secondsPerPick]);

  // Tick countdown while active
  useEffect(() => {
    if (secondsPerPick <= 0 || !isActive) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsPerPick, isActive]);

  // Fire onExpire once when countdown reaches 0
  useEffect(() => {
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current();
    }
  }, [remaining]);

  return {
    remaining,
    isWarning: remaining !== null && remaining > 0 && remaining <= 30,
    isCritical: remaining !== null && remaining > 0 && remaining <= 10,
    reset,
  };
}
