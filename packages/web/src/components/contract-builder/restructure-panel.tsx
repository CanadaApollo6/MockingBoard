'use client';

import { useMemo, useState } from 'react';
import {
  calculateRestructure,
  maxRestructureAmount,
  type CapContract,
} from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtDollar } from '@/lib/firebase/format';

interface RestructurePanelProps {
  contract: CapContract;
  accruedSeasons?: number;
}

export function RestructurePanel({
  contract,
  accruedSeasons = 3,
}: RestructurePanelProps) {
  const [selectedYear, setSelectedYear] = useState(contract.startYear);
  const [convertPct, setConvertPct] = useState(50);

  const maxAmount = useMemo(
    () => maxRestructureAmount(contract, selectedYear, accruedSeasons),
    [contract, selectedYear, accruedSeasons],
  );

  const convertAmount = Math.round((maxAmount * convertPct) / 100);

  const result = useMemo(() => {
    if (convertAmount <= 0 || maxAmount <= 0) return null;
    try {
      return calculateRestructure(contract, selectedYear, convertAmount);
    } catch {
      return null;
    }
  }, [contract, selectedYear, convertAmount, maxAmount]);

  if (maxAmount <= 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No salary available to restructure in {selectedYear}. The base
            salary must exceed the veteran minimum.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Restructure Simulation
        </p>

        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Year
            </label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contract.years
                  .filter((y) => !y.isVoidYear)
                  .map((y) => (
                    <SelectItem key={y.year} value={String(y.year)}>
                      {y.year}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Convert {fmtDollar(convertAmount)} of {fmtDollar(maxAmount)}
            </label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[convertPct]}
              onValueChange={([v]) => setConvertPct(v)}
            />
          </div>
        </div>

        {result && (
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Current Year Savings
              </span>
              <span className="font-mono font-semibold text-emerald-500">
                {fmtDollar(result.currentYearSavings)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">New Base Salary</span>
              <span className="font-mono">{fmtDollar(result.newBaseSalary)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Added Proration/Year
              </span>
              <span className="font-mono">
                {fmtDollar(result.newProrationPerYear)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
