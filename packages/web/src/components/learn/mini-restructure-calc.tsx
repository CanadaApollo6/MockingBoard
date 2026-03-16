'use client';

import { useMemo, useState } from 'react';
import {
  calculateProration,
  calculateRestructure,
  maxRestructureAmount,
  type CapContract,
} from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { fmtDollar } from '@/lib/firebase/format';
import { DollarInput } from '@/components/contract-builder/dollar-input';

export function MiniRestructureCalc() {
  const [baseSalary, setBaseSalary] = useState(15_000_000);
  const [yearsRemaining, setYearsRemaining] = useState(3);
  const [convertPct, setConvertPct] = useState(75);

  const contract = useMemo((): CapContract => {
    const proration = calculateProration(0, yearsRemaining);
    return {
      playerId: 'demo',
      playerName: 'Demo',
      team: 'FA' as CapContract['team'],
      position: 'QB' as CapContract['position'],
      totalSigningBonus: 0,
      signingBonusYearsRemaining: yearsRemaining,
      years: Array.from({ length: yearsRemaining }, (_, i) => ({
        year: 2026 + i,
        baseSalary,
        signingBonusProration: proration,
        rosterBonus: 0,
        optionBonus: 0,
        workoutBonus: 0,
        otherBonus: 0,
        incentives: [],
        isVoidYear: false,
        isGuaranteed: false,
        guaranteedSalary: 0,
      })),
      startYear: 2026,
      endYear: 2026 + yearsRemaining - 1,
      isRookieContract: false,
    };
  }, [baseSalary, yearsRemaining]);

  const maxAmount = useMemo(
    () => maxRestructureAmount(contract, 2026, 3),
    [contract],
  );

  const convertAmount = Math.round((maxAmount * convertPct) / 100);

  const result = useMemo(() => {
    if (convertAmount <= 0) return null;
    try {
      return calculateRestructure(contract, 2026, convertAmount);
    } catch {
      return null;
    }
  }, [contract, convertAmount]);

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try It Yourself
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <DollarInput
            label="Base Salary"
            value={baseSalary}
            onChange={setBaseSalary}
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Years Remaining — {yearsRemaining}
            </label>
            <Slider
              min={2}
              max={5}
              step={1}
              value={[yearsRemaining]}
              onValueChange={([v]) => setYearsRemaining(v)}
            />
          </div>
        </div>
        {maxAmount > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Convert {fmtDollar(convertAmount)} of {fmtDollar(maxAmount)}
            </label>
            <Slider
              min={10}
              max={100}
              step={5}
              value={[convertPct]}
              onValueChange={([v]) => setConvertPct(v)}
            />
          </div>
        )}
        {result && (
          <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Current Year Savings
              </span>
              <span className="font-mono font-semibold text-emerald-500">
                {fmtDollar(result.currentYearSavings)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">New Base Salary</span>
              <span className="font-mono">{fmtDollar(result.newBaseSalary)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Added Proration/Year
              </span>
              <span className="font-mono text-red-400">
                +{fmtDollar(result.newProrationPerYear)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
