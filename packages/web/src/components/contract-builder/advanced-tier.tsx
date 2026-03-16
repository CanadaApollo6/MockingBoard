'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  calculateCapHit,
  calculateDeadMoney,
  calculateProration,
  type CapContract,
  type CapHitBreakdown,
} from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import { fmtDollar } from '@/lib/firebase/format';
import { DollarInput } from './dollar-input';
import { YearRow, type YearInput } from './year-row';
import { IncentiveRow, type IncentiveInput } from './incentive-row';
import { CapHitBreakdownCard } from './cap-hit-breakdown-card';
import { DeadMoneyPreview } from './dead-money-preview';
import { RestructurePanel } from './restructure-panel';

const START_YEAR = 2026;

function defaultYearInput(): YearInput {
  return { baseSalary: 1_000_000, rosterBonus: 0, optionBonus: 0, workoutBonus: 0 };
}

export function AdvancedTier() {
  const [contractYears, setContractYears] = useState(4);
  const [signingBonus, setSigningBonus] = useState(25_000_000);
  const [yearInputs, setYearInputs] = useState<YearInput[]>(() =>
    Array.from({ length: 4 }, () => defaultYearInput()),
  );
  const [incentives, setIncentives] = useState<IncentiveInput[]>([]);

  const handleYearsChange = useCallback(
    ([newYears]: number[]) => {
      setContractYears(newYears);
      setYearInputs((prev) => {
        if (newYears > prev.length) {
          return [
            ...prev,
            ...Array.from({ length: newYears - prev.length }, () =>
              defaultYearInput(),
            ),
          ];
        }
        return prev.slice(0, newYears);
      });
      // Clamp incentive yearIndexes
      setIncentives((prev) =>
        prev.map((inc) =>
          inc.yearIndex >= newYears
            ? { ...inc, yearIndex: newYears - 1 }
            : inc,
        ),
      );
    },
    [],
  );

  const updateYear = useCallback((index: number, values: YearInput) => {
    setYearInputs((prev) => prev.map((y, i) => (i === index ? values : y)));
  }, []);

  const addIncentive = useCallback(() => {
    setIncentives((prev) => [
      ...prev,
      {
        description: '',
        amount: 500_000,
        classification: 'LTBE',
        yearIndex: 0,
      },
    ]);
  }, []);

  const updateIncentive = useCallback(
    (index: number, inc: IncentiveInput) => {
      setIncentives((prev) => prev.map((i, idx) => (idx === index ? inc : i)));
    },
    [],
  );

  const removeIncentive = useCallback((index: number) => {
    setIncentives((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const contract = useMemo((): CapContract => {
    const proration = calculateProration(signingBonus, contractYears);
    return {
      playerId: 'builder',
      playerName: 'Builder',
      team: 'FA' as CapContract['team'],
      position: 'QB' as CapContract['position'],
      totalSigningBonus: signingBonus,
      signingBonusYearsRemaining: contractYears,
      years: yearInputs.map((yi, i) => ({
        year: START_YEAR + i,
        baseSalary: yi.baseSalary,
        signingBonusProration: proration,
        rosterBonus: yi.rosterBonus,
        optionBonus: yi.optionBonus,
        workoutBonus: yi.workoutBonus,
        otherBonus: 0,
        incentives: incentives
          .filter((inc) => inc.yearIndex === i)
          .map((inc) => ({
            description: inc.description,
            amount: inc.amount,
            classification: inc.classification,
          })),
        isVoidYear: false,
        isGuaranteed: false,
        guaranteedSalary: 0,
      })),
      startYear: START_YEAR,
      endYear: START_YEAR + contractYears - 1,
      isRookieContract: false,
    };
  }, [signingBonus, contractYears, yearInputs, incentives]);

  const yearlyBreakdowns = useMemo((): (CapHitBreakdown | null)[] => {
    return Array.from({ length: contractYears }, (_, i) =>
      calculateCapHit(contract, START_YEAR + i),
    );
  }, [contract, contractYears]);

  const deadMoneyPre = useMemo(
    () => calculateDeadMoney(contract, START_YEAR, 'pre-june-1'),
    [contract],
  );
  const deadMoneyPost = useMemo(
    () => calculateDeadMoney(contract, START_YEAR, 'post-june-1'),
    [contract],
  );

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="grid gap-5 sm:grid-cols-2">
        <DollarInput
          label="Total Signing Bonus"
          value={signingBonus}
          onChange={setSigningBonus}
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
            onValueChange={handleYearsChange}
          />
        </div>
      </div>

      {/* Year-by-year inputs */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Year-by-Year Salaries</p>
        {yearInputs.map((yi, i) => (
          <YearRow
            key={i}
            year={START_YEAR + i}
            values={yi}
            onChange={(v) => updateYear(i, v)}
          />
        ))}
      </div>

      {/* Incentives */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Incentives</p>
          <Button variant="outline" size="sm" onClick={addIncentive}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Incentive
          </Button>
        </div>
        {incentives.map((inc, i) => (
          <IncentiveRow
            key={i}
            incentive={inc}
            contractYears={contractYears}
            startYear={START_YEAR}
            onChange={(v) => updateIncentive(i, v)}
            onRemove={() => removeIncentive(i)}
          />
        ))}
        {incentives.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No incentives added. LTBE incentives count against the current
            year&apos;s cap; NLTBE do not.
          </p>
        )}
      </div>

      <Separator />

      {/* Results */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Multi-year cap hits */}
        <div className="space-y-4">
          <p className="text-sm font-semibold">Cap Hit by Year</p>
          <div className="space-y-2">
            {yearlyBreakdowns.map((bd, i) => {
              if (!bd) return null;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{START_YEAR + i}</span>
                  <span className="font-mono font-semibold">
                    {fmtDollar(bd.totalCapHit)}
                  </span>
                </div>
              );
            })}
          </div>
          {yearlyBreakdowns[0] && (
            <CapHitBreakdownCard
              breakdown={yearlyBreakdowns[0]}
              year={START_YEAR}
            />
          )}
        </div>

        {/* Dead money + restructure */}
        <div className="space-y-4">
          <DeadMoneyPreview
            preJune1={deadMoneyPre}
            postJune1={deadMoneyPost}
          />
          <RestructurePanel contract={contract} />
        </div>
      </div>
    </div>
  );
}
