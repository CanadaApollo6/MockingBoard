'use client';

import { useMemo, useState } from 'react';
import { calculateProration } from '@mockingboard/shared';
import { Slider } from '@/components/ui/slider';
import { fmtDollar } from '@/lib/firebase/format';
import { DollarInput } from './dollar-input';
import { ProrationTable } from './proration-table';

export function BasicTier() {
  const [baseSalary, setBaseSalary] = useState(1_000_000);
  const [signingBonus, setSigningBonus] = useState(10_000_000);
  const [contractYears, setContractYears] = useState(4);

  const prorationPerYear = useMemo(
    () => calculateProration(signingBonus, contractYears),
    [signingBonus, contractYears],
  );

  const capHit = baseSalary + prorationPerYear;

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
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Year 1 Cap Hit
          </p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {fmtDollar(capHit)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fmtDollar(baseSalary)} base + {fmtDollar(prorationPerYear)}{' '}
            prorated bonus
          </p>
        </div>
        <ProrationTable
          totalBonus={signingBonus}
          contractYears={contractYears}
        />
      </div>
    </div>
  );
}
