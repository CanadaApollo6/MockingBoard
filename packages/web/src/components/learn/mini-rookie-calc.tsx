'use client';

import { useMemo, useState } from 'react';
import type { RookieSlotEntry } from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { fmtDollar } from '@/lib/firebase/format';

interface MiniRookieCalcProps {
  slots: RookieSlotEntry[];
  draftYear: number;
}

export function MiniRookieCalc({ slots, draftYear }: MiniRookieCalcProps) {
  const [overall, setOverall] = useState(1);

  const slot = useMemo(
    () => slots.find((s) => s.overall === overall),
    [slots, overall],
  );

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try It Yourself
        </p>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Pick #{overall} — Round {slot?.round ?? '?'}, Pick{' '}
            {slot?.pick ?? '?'}
          </label>
          <Slider
            min={1}
            max={Math.min(slots.length, 262)}
            step={1}
            value={[overall]}
            onValueChange={([v]) => setOverall(v)}
          />
        </div>
        {slot && (
          <div className="space-y-3 rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-mono font-semibold">
                {fmtDollar(slot.totalValue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Signing Bonus</span>
              <span className="font-mono">{fmtDollar(slot.signingBonus)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[slot.year1Cap, slot.year2Cap, slot.year3Cap, slot.year4Cap].map(
                (cap, i) => (
                  <div key={i} className="rounded border p-2">
                    <p className="text-muted-foreground">{draftYear + i}</p>
                    <p className="font-mono font-semibold">{fmtDollar(cap)}</p>
                  </div>
                ),
              )}
            </div>
            {overall <= 32 && (
              <p className="text-xs text-muted-foreground">
                First-round pick — eligible for 5th-year option
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
