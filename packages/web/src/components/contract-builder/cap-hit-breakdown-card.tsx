'use client';

import type { CapHitBreakdown } from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fmtDollar } from '@/lib/firebase/format';

interface CapHitBreakdownCardProps {
  breakdown: CapHitBreakdown;
  year?: number;
}

const BREAKDOWN_ROWS: { key: keyof CapHitBreakdown; label: string }[] = [
  { key: 'baseSalary', label: 'Base Salary' },
  { key: 'signingBonusProration', label: 'Signing Bonus (Prorated)' },
  { key: 'rosterBonus', label: 'Roster Bonus' },
  { key: 'optionBonus', label: 'Option Bonus' },
  { key: 'workoutBonus', label: 'Workout Bonus' },
  { key: 'otherBonus', label: 'Other Bonus' },
  { key: 'ltbeIncentives', label: 'LTBE Incentives' },
];

export function CapHitBreakdownCard({
  breakdown,
  year,
}: CapHitBreakdownCardProps) {
  const activeRows = BREAKDOWN_ROWS.filter((r) => breakdown[r.key] > 0);

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {year ? `${year} Cap Hit` : 'Cap Hit Breakdown'}
        </p>
        <div className="space-y-1.5">
          {activeRows.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono">{fmtDollar(breakdown[key])}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Total Cap Hit</span>
          <span className="font-mono text-base">
            {fmtDollar(breakdown.totalCapHit)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
