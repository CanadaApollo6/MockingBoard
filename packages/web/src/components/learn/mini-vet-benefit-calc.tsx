'use client';

import { useMemo, useState } from 'react';
import {
  applyVeteranBenefit,
  getVeteranMinimum,
} from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { fmtDollar } from '@/lib/firebase/format';

export function MiniVetBenefitCalc() {
  const [accruedSeasons, setAccruedSeasons] = useState(6);

  const veteranMin = useMemo(
    () => getVeteranMinimum(accruedSeasons),
    [accruedSeasons],
  );

  const result = useMemo(
    () => applyVeteranBenefit(veteranMin, accruedSeasons),
    [veteranMin, accruedSeasons],
  );

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try It Yourself
        </p>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Accrued Seasons — {accruedSeasons}
          </label>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[accruedSeasons]}
            onValueChange={([v]) => setAccruedSeasons(v)}
          />
        </div>
        <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Veteran Minimum</span>
            <span className="font-mono">{fmtDollar(veteranMin)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cap Charge</span>
            <span className="font-mono font-semibold">
              {fmtDollar(result.capCharge)}
            </span>
          </div>
          {result.isEligible ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">League Credit</span>
              <span className="font-mono text-emerald-500">
                {fmtDollar(result.benefitCredit)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {accruedSeasons <= 2
                ? 'Players with 2 or fewer accrued seasons are not eligible for the veteran benefit.'
                : 'Veteran benefit applies when the player is on a minimum-salary contract with 3+ accrued seasons.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
