'use client';

import { useMemo, useState } from 'react';
import {
  calculateDeadMoney,
  calculateProration,
  type CapContract,
} from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { fmtDollar } from '@/lib/firebase/format';
import { DollarInput } from '@/components/contract-builder/dollar-input';

export function MiniDeadMoneyCalc() {
  const [baseSalary, setBaseSalary] = useState(8_000_000);
  const [signingBonus, setSigningBonus] = useState(25_000_000);
  const [yearsRemaining, setYearsRemaining] = useState(3);

  const contract = useMemo((): CapContract => {
    const proration = calculateProration(signingBonus, yearsRemaining);
    return {
      playerId: 'demo',
      playerName: 'Demo',
      team: 'FA' as CapContract['team'],
      position: 'QB' as CapContract['position'],
      totalSigningBonus: signingBonus,
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
  }, [baseSalary, signingBonus, yearsRemaining]);

  const preJune1 = useMemo(
    () => calculateDeadMoney(contract, 2026, 'pre-june-1'),
    [contract],
  );
  const postJune1 = useMemo(
    () => calculateDeadMoney(contract, 2026, 'post-june-1'),
    [contract],
  );

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try It Yourself
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <DollarInput
            label="Base Salary"
            value={baseSalary}
            onChange={setBaseSalary}
          />
          <DollarInput
            label="Signing Bonus"
            value={signingBonus}
            onChange={setSigningBonus}
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Years Remaining — {yearsRemaining}
            </label>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[yearsRemaining]}
              onValueChange={([v]) => setYearsRemaining(v)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DeadMoneyColumn title="Pre-June 1" result={preJune1} />
          <DeadMoneyColumn title="Post-June 1" result={postJune1} />
        </div>
      </CardContent>
    </Card>
  );
}

function DeadMoneyColumn({
  title,
  result,
}: {
  title: string;
  result: { currentYearDeadMoney: number; currentYearCapSavings: number };
}) {
  return (
    <div className="rounded-lg bg-muted p-3 text-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Dead Money</span>
        <span className="font-mono text-red-400">
          {fmtDollar(result.currentYearDeadMoney)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Cap Savings</span>
        <span className="font-mono text-emerald-500">
          {fmtDollar(result.currentYearCapSavings)}
        </span>
      </div>
    </div>
  );
}
