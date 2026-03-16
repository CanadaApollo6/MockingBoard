'use client';

import { useMemo, useState } from 'react';
import {
  calculateCapHit,
  calculateDeadMoney,
  calculateProration,
  type CapContract,
} from '@mockingboard/shared';
import { Slider } from '@/components/ui/slider';
import { DollarInput } from './dollar-input';
import { CapHitBreakdownCard } from './cap-hit-breakdown-card';
import { DeadMoneyPreview } from './dead-money-preview';

const START_YEAR = 2026;

export function StandardTier() {
  const [baseSalary, setBaseSalary] = useState(5_000_000);
  const [signingBonus, setSigningBonus] = useState(20_000_000);
  const [rosterBonus, setRosterBonus] = useState(0);
  const [optionBonus, setOptionBonus] = useState(0);
  const [workoutBonus, setWorkoutBonus] = useState(0);
  const [contractYears, setContractYears] = useState(4);

  const contract = useMemo((): CapContract => {
    const proration = calculateProration(signingBonus, contractYears);
    return {
      playerId: 'builder',
      playerName: 'Builder',
      team: 'FA' as CapContract['team'],
      position: 'QB' as CapContract['position'],
      totalSigningBonus: signingBonus,
      signingBonusYearsRemaining: contractYears,
      years: Array.from({ length: contractYears }, (_, i) => ({
        year: START_YEAR + i,
        baseSalary: i === 0 ? baseSalary : baseSalary,
        signingBonusProration: proration,
        rosterBonus: i === 0 ? rosterBonus : 0,
        optionBonus: i === 0 ? optionBonus : 0,
        workoutBonus: i === 0 ? workoutBonus : 0,
        otherBonus: 0,
        incentives: [],
        isVoidYear: false,
        isGuaranteed: false,
        guaranteedSalary: 0,
      })),
      startYear: START_YEAR,
      endYear: START_YEAR + contractYears - 1,
      isRookieContract: false,
    };
  }, [
    baseSalary,
    signingBonus,
    rosterBonus,
    optionBonus,
    workoutBonus,
    contractYears,
  ]);

  const capHitBreakdown = useMemo(
    () => calculateCapHit(contract, START_YEAR),
    [contract],
  );

  const deadMoneyPre = useMemo(
    () => calculateDeadMoney(contract, START_YEAR, 'pre-june-1'),
    [contract],
  );

  const deadMoneyPost = useMemo(
    () => calculateDeadMoney(contract, START_YEAR, 'post-june-1'),
    [contract],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Inputs */}
      <div className="space-y-5">
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
        <DollarInput
          label="Roster Bonus"
          value={rosterBonus}
          onChange={setRosterBonus}
        />
        <DollarInput
          label="Option Bonus"
          value={optionBonus}
          onChange={setOptionBonus}
        />
        <DollarInput
          label="Workout Bonus"
          value={workoutBonus}
          onChange={setWorkoutBonus}
        />
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Contract Length — {contractYears} year
            {contractYears > 1 ? 's' : ''}
          </label>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[contractYears]}
            onValueChange={([v]) => setContractYears(v)}
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {capHitBreakdown && (
          <CapHitBreakdownCard breakdown={capHitBreakdown} year={START_YEAR} />
        )}
        <DeadMoneyPreview preJune1={deadMoneyPre} postJune1={deadMoneyPost} />
      </div>
    </div>
  );
}
