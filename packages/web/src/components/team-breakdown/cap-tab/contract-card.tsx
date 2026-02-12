'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlayerContract } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { getPositionColor } from '@/lib/colors/position-colors';
import { fmtDollar } from '@/lib/firebase/format';

interface ContractCardProps {
  contract: PlayerContract;
  position?: string;
}

export function ContractCard({ contract, position }: ContractCardProps) {
  const [open, setOpen] = useState(false);
  const c = contract;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-medium text-sm">{c.player}</span>
              {position && (
                <Badge
                  className="shrink-0 px-1.5 py-0 text-xs"
                  style={{
                    backgroundColor: getPositionColor(position),
                    color: '#0A0A0B',
                  }}
                >
                  {position}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-sm font-semibold">
                {fmtDollar(c.capNumber)}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-b-lg border border-t-0 border-border bg-card/50 px-3 pb-3 pt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Detail label="Base Salary" value={fmtDollar(c.baseSalary)} />
            <Detail label="Bonus" value={fmtDollar(c.proratedBonus)} />
            <Detail
              label="Dead (Pre June 1)"
              value={fmtDollar(c.deadMoney.cutPreJune1)}
            />
            <Detail
              label="Dead (Post June 1)"
              value={fmtDollar(c.deadMoney.cutPostJune1)}
            />
            <Detail
              label="Savings (Pre June 1)"
              value={fmtDollar(c.capSavings.cutPreJune1)}
            />
            <Detail
              label="Savings (Post June 1)"
              value={fmtDollar(c.capSavings.cutPostJune1)}
            />
            {c.restructureSavings > 0 && (
              <Detail
                label="Restructure"
                value={fmtDollar(c.restructureSavings)}
              />
            )}
            {c.extensionSavings > 0 && (
              <Detail label="Extension" value={fmtDollar(c.extensionSavings)} />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
