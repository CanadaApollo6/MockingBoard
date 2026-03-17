'use client';

import type { DeadMoneyResult } from '@mockingboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { fmtDollar } from '@/lib/firebase/format';

interface DeadMoneyPreviewProps {
  preJune1: DeadMoneyResult;
  postJune1: DeadMoneyResult;
}

function Column({ title, result }: { title: string; result: DeadMoneyResult }) {
  return (
    <div className="flex-1 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1 text-sm">
        <Row label="Dead Money (Year 1)" value={result.currentYearDeadMoney} />
        <Row label="Dead Money (Year 2)" value={result.nextYearDeadMoney} />
        <Row
          label="Cap Savings (Year 1)"
          value={result.currentYearCapSavings}
          positive
        />
        <Row
          label="Cap Savings (Year 2)"
          value={result.nextYearCapSavings}
          positive
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  if (value === 0) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono ${positive && value > 0 ? 'text-emerald-500' : 'text-red-400'}`}
      >
        {fmtDollar(value)}
      </span>
    </div>
  );
}

export function DeadMoneyPreview({
  preJune1,
  postJune1,
}: DeadMoneyPreviewProps) {
  const hasData =
    preJune1.currentYearDeadMoney > 0 || postJune1.currentYearDeadMoney > 0;

  if (!hasData) return null;

  return (
    <Card>
      <CardContent>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Dead Money If Released
        </p>
        <div className="flex gap-6">
          <Column title="Pre-June 1" result={preJune1} />
          <Column title="Post-June 1" result={postJune1} />
        </div>
      </CardContent>
    </Card>
  );
}
