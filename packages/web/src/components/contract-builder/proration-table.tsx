'use client';

import { useMemo } from 'react';
import { calculateProration } from '@mockingboard/shared';
import { fmtDollar } from '@/lib/firebase/format';

interface ProrationTableProps {
  totalBonus: number;
  contractYears: number;
  startYear?: number;
}

export function ProrationTable({
  totalBonus,
  contractYears,
  startYear = 2026,
}: ProrationTableProps) {
  const prorationPerYear = useMemo(
    () => calculateProration(totalBonus, contractYears),
    [totalBonus, contractYears],
  );

  const prorationYears = Math.min(contractYears, 5);

  if (totalBonus <= 0 || contractYears <= 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Signing Bonus Proration
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {Array.from({ length: prorationYears }, (_, i) => (
          <div key={i} className="contents">
            <span className="text-muted-foreground">{startYear + i}</span>
            <span className="font-mono">{fmtDollar(prorationPerYear)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
