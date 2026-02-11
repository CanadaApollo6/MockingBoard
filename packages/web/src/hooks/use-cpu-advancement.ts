'use client';

import { useState, useEffect } from 'react';
import type { CpuSpeed } from '@mockingboard/shared';
import { CPU_SPEED_DELAY } from '@mockingboard/shared';

interface CpuAdvancementOptions {
  draftId: string;
  isActive: boolean;
  controller: string | null;
  submitting: boolean;
  cpuSpeed: CpuSpeed;
  tradesEnabled: boolean;
  showTrade: boolean;
  tradeResult: unknown;
  onError: (message: string) => void;
}

export function useCpuAdvancement({
  draftId,
  isActive,
  controller,
  submitting,
  cpuSpeed,
  tradesEnabled,
  showTrade,
  tradeResult,
  onError,
}: CpuAdvancementOptions): { advancingCpu: boolean } {
  const [advancingCpu, setAdvancingCpu] = useState(false);

  useEffect(() => {
    const isCpuTurn =
      isActive &&
      controller === null &&
      !submitting &&
      (!tradesEnabled || (!showTrade && !tradeResult));
    if (!isCpuTurn) {
      setAdvancingCpu(false);
      return;
    }

    setAdvancingCpu(true);
    let cancelled = false;

    if (cpuSpeed === 'instant') {
      fetch(`/api/drafts/${draftId}/advance`, { method: 'POST' })
        .catch((err: Error) => onError(err.message))
        .finally(() => {
          if (!cancelled) setAdvancingCpu(false);
        });
    } else {
      (async () => {
        while (!cancelled) {
          try {
            const res = await fetch(
              `/api/drafts/${draftId}/advance?mode=single`,
              { method: 'POST' },
            );
            const data = await res.json();
            if (!data.pick || data.isComplete || cancelled) break;
            await new Promise((r) => setTimeout(r, CPU_SPEED_DELAY[cpuSpeed]));
          } catch {
            break;
          }
        }
        if (!cancelled) setAdvancingCpu(false);
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [
    isActive,
    controller,
    submitting,
    tradesEnabled,
    showTrade,
    tradeResult,
    cpuSpeed,
    draftId,
    onError,
  ]);

  return { advancingCpu };
}
