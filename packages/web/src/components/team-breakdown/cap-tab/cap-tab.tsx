'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TeamContractData, PlayerContract } from '@mockingboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GradientCard,
  GradientCardContent,
} from '@/components/ui/gradient-card';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { normalizePlayerName, fmtDollar } from '@/lib/format';
import { PositionBars } from './position-bars';
import { ContractCard } from './contract-card';

const TIERS = [
  { label: 'Premium', min: 15_000_000 },
  { label: 'Mid-Range', min: 5_000_000 },
  { label: 'Standard', min: 1_255_000 },
  { label: 'Minimum', min: 0 },
];

type SortField = 'player' | 'capNumber' | 'baseSalary';

interface CapTabProps {
  contracts: TeamContractData;
  colors: { primary: string; secondary: string };
  nameToPosition: Map<string, string>;
}

export function CapTab({ contracts, colors, nameToPosition }: CapTabProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('capNumber');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedRoster = [...contracts.roster].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortField === 'player') return dir * a.player.localeCompare(b.player);
    return dir * (a[sortField] - b[sortField]);
  });

  // Group contracts into tiers (sorted by cap hit descending within each tier)
  const tieredContracts = TIERS.map((tier, i) => {
    const players = contracts.roster
      .filter(
        (c) =>
          c.capNumber >= tier.min &&
          (i === 0 || c.capNumber < TIERS[i - 1].min),
      )
      .sort((a, b) => b.capNumber - a.capNumber);
    const total = players.reduce((sum, c) => sum + c.capNumber, 0);
    return { ...tier, players, total };
  });

  return (
    <div className="space-y-6">
      {/* Cap Summary */}
      <GradientCard from={colors.primary} to={colors.secondary}>
        <GradientCardContent>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-medium">Cap Summary</h3>
            <Badge
              variant="outline"
              className="border-white/30 text-xs text-white"
            >
              {contracts.year}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Stat label="Cap Space" value={fmtDollar(contracts.capSpace)} />
            <Stat
              label="Effective"
              value={fmtDollar(contracts.effectiveCapSpace)}
            />
            <Stat label="Players" value={String(contracts.playerCount)} />
            <Stat
              label="Active Spending"
              value={fmtDollar(contracts.activeCapSpending)}
            />
            <Stat
              label="Dead Money"
              value={fmtDollar(contracts.deadMoneyTotal)}
            />
            <Stat label="Salary Cap" value={fmtDollar(contracts.salaryCap)} />
          </div>
        </GradientCardContent>
      </GradientCard>

      {/* Position Spending Bars */}
      <PositionBars
        contracts={contracts.roster}
        nameToPosition={nameToPosition}
      />

      {/* Tiered Contract Cards */}
      {tieredContracts.map(
        (tier) =>
          tier.players.length > 0 && (
            <div key={tier.label}>
              <div className="mb-3 flex items-baseline gap-2">
                <h3 className="text-lg font-medium">{tier.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {tier.players.length}
                </Badge>
                <span className="ml-auto font-mono text-sm text-muted-foreground">
                  {fmtDollar(tier.total)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tier.players.map((c, i) => (
                  <ContractCard
                    key={`${c.player}-${i}`}
                    contract={c}
                    position={nameToPosition.get(normalizePlayerName(c.player))}
                  />
                ))}
              </div>
            </div>
          ),
      )}

      {/* Dead Cap */}
      {contracts.deadCap.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">
              Dead Cap
              <Badge variant="secondary" className="ml-2 text-xs">
                {contracts.deadCap.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-2">Name</th>
                    <th className="pb-2">Cap Number</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.deadCap.map((dc, i) => (
                    <tr
                      key={`${dc.name}-${i}`}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-1.5 pr-2">{dc.name}</td>
                      <td className="py-1.5 font-mono text-xs">
                        {fmtDollar(dc.capNumber)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View as table (power user) */}
      <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            View as table
            <ChevronDown
              className={`h-4 w-4 transition-transform ${tableOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <SortHeader
                        label="Player"
                        field="player"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Cap Hit"
                        field="capNumber"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Base Salary"
                        field="baseSalary"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <th className="pb-2 pr-2">Bonus</th>
                      <th className="pb-2 pr-2">Dead (Cut)</th>
                      <th className="pb-2">Savings (Cut)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRoster.map((c: PlayerContract, i: number) => (
                      <tr
                        key={`${c.player}-${i}`}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-1.5 pr-2 font-medium">{c.player}</td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.capNumber)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.baseSalary)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.proratedBonus)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.deadMoney.cutPreJune1)}
                        </td>
                        <td className="py-1.5 font-mono text-xs">
                          {fmtDollar(c.capSavings.cutPreJune1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/60">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SortHeader({
  label,
  field,
  current,
  asc,
  onClick,
}: {
  label: string;
  field: SortField;
  current: SortField;
  asc: boolean;
  onClick: (f: SortField) => void;
}) {
  const indicator = current === field ? (asc ? ' \u25B2' : ' \u25BC') : '';
  return (
    <th
      className="cursor-pointer pb-2 pr-2 select-none"
      onClick={() => onClick(field)}
    >
      {label}
      {indicator}
    </th>
  );
}
