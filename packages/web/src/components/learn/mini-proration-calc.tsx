'use client';

import { useMemo, useState } from 'react';
import { calculateProration } from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { fmtDollar } from '@/lib/firebase/format';
import { DollarInput } from '@/components/contract-builder/dollar-input';

export function MiniProrationCalc() {
  const [bonus, setBonus] = useState(20_000_000);
  const [years, setYears] = useState(5);

  const prorationPerYear = useMemo(
    () => calculateProration(bonus, years),
    [bonus, years],
  );

  const prorationYears = Math.min(years, 5);

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try It Yourself
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <DollarInput
            label="Signing Bonus"
            value={bonus}
            onChange={setBonus}
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Contract Length — {years} year{years > 1 ? 's' : ''}
            </label>
            <Slider
              min={1}
              max={7}
              step={1}
              value={[years]}
              onValueChange={([v]) => setYears(v)}
            />
            {years > 5 && (
              <p className="text-xs text-muted-foreground">
                Proration capped at 5 years even though contract is {years}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground">Annual Cap Charge</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {fmtDollar(prorationPerYear)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fmtDollar(bonus)} ÷ {prorationYears} years
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
