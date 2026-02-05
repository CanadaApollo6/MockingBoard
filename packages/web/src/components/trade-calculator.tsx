'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  getPickValue,
  getFuturePickValue,
  baseSurplusValue,
} from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import type { TeamAbbreviation } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';

type ValueModel = 'trade' | 'surplus';

interface SlotInfo {
  overall: number;
  round: number;
  pick: number;
  team: string;
}

interface SelectedPick {
  id: string;
  type: 'current' | 'future';
  overall?: number;
  round: number;
  pick?: number;
  year?: number;
  yearsOut?: number;
  label: string;
}

interface TradeCalculatorProps {
  picks: SlotInfo[];
  year: number;
}

function getPickTradeValue(pick: SelectedPick): number {
  if (pick.type === 'current' && pick.overall) {
    return getPickValue(pick.overall);
  }
  if (pick.type === 'future' && pick.yearsOut != null) {
    return getFuturePickValue(pick.round, pick.yearsOut);
  }
  return 0;
}

function getPickSurplusValue(pick: SelectedPick): number {
  if (pick.type === 'current' && pick.overall) {
    return baseSurplusValue(pick.overall);
  }
  if (pick.type === 'future' && pick.yearsOut != null) {
    const estimatedPick = (pick.round - 1) * 32 + 16;
    const effectivePick = Math.min(256, estimatedPick + pick.yearsOut * 32);
    return baseSurplusValue(effectivePick);
  }
  return 0;
}

function getValue(pick: SelectedPick, model: ValueModel): number {
  return model === 'trade'
    ? getPickTradeValue(pick)
    : getPickSurplusValue(pick);
}

let nextId = 0;
function uid(): string {
  return `pick-${++nextId}`;
}

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

function TradeSide({
  label,
  picks: selectedPicks,
  allSlots,
  model,
  year,
  onAdd,
  onRemove,
}: {
  label: string;
  picks: SelectedPick[];
  allSlots: SlotInfo[];
  model: ValueModel;
  year: number;
  onAdd: (pick: SelectedPick) => void;
  onRemove: (id: string) => void;
}) {
  const [pickType, setPickType] = useState<'current' | 'future'>('current');
  const [currentOverall, setCurrentOverall] = useState<string>('');
  const [futureRound, setFutureRound] = useState<string>('1');
  const [futureYear, setFutureYear] = useState<string>(String(year + 1));

  const total = selectedPicks.reduce((sum, p) => sum + getValue(p, model), 0);

  const handleAdd = () => {
    if (pickType === 'current' && currentOverall) {
      const overall = parseInt(currentOverall, 10);
      const slot = allSlots.find((s) => s.overall === overall);
      if (!slot) return;
      onAdd({
        id: uid(),
        type: 'current',
        overall: slot.overall,
        round: slot.round,
        pick: slot.pick,
        label: `${slot.round}.${String(slot.pick).padStart(2, '0')} (#${slot.overall})`,
      });
      setCurrentOverall('');
    } else if (pickType === 'future') {
      const round = parseInt(futureRound, 10);
      const fy = parseInt(futureYear, 10);
      const yearsOut = fy - year;
      onAdd({
        id: uid(),
        type: 'future',
        round,
        year: fy,
        yearsOut,
        label: `${fy} Rd ${round}`,
      });
    }
  };

  // Group current-year picks by round for the selector
  const picksByRound = useMemo(() => {
    const map = new Map<number, SlotInfo[]>();
    for (const s of allSlots) {
      const items = map.get(s.round) ?? [];
      items.push(s);
      map.set(s.round, items);
    }
    return map;
  }, [allSlots]);

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pick type toggle */}
        <div className="flex gap-2">
          <Button
            variant={pickType === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPickType('current')}
          >
            {year} Pick
          </Button>
          <Button
            variant={pickType === 'future' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPickType('future')}
          >
            Future Pick
          </Button>
        </div>

        {/* Pick selector */}
        <div className="flex gap-2">
          {pickType === 'current' ? (
            <select
              value={currentOverall}
              onChange={(e) => setCurrentOverall(e.target.value)}
              className={`${selectClass} flex-1`}
            >
              <option value="">Select pick...</option>
              {Array.from(picksByRound.entries()).map(([round, roundPicks]) => (
                <optgroup key={round} label={`Round ${round}`}>
                  {roundPicks.map((s) => (
                    <option key={s.overall} value={String(s.overall)}>
                      {round}.{String(s.pick).padStart(2, '0')} —{' '}
                      {getTeamName(s.team as TeamAbbreviation)} (#{s.overall})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <>
              <select
                value={futureYear}
                onChange={(e) => setFutureYear(e.target.value)}
                className={`${selectClass} w-24`}
              >
                {[year + 1, year + 2, year + 3].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={futureRound}
                onChange={(e) => setFutureRound(e.target.value)}
                className={`${selectClass} w-24`}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                  <option key={r} value={String(r)}>
                    Rd {r}
                  </option>
                ))}
              </select>
            </>
          )}
          <Button size="sm" onClick={handleAdd}>
            Add
          </Button>
        </div>

        {/* Selected picks */}
        <div className="space-y-1.5">
          {selectedPicks.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No picks added
            </p>
          )}
          {selectedPicks.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border px-3 py-1.5"
            >
              <span className="text-sm">{p.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums">
                  {getValue(p, model).toFixed(1)}
                </span>
                <button
                  onClick={() => onRemove(p.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="font-mono text-lg font-bold tabular-nums">
            {total.toFixed(1)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function TradeCalculator({ picks, year }: TradeCalculatorProps) {
  const [model, setModel] = useState<ValueModel>('trade');
  const [sideA, setSideA] = useState<SelectedPick[]>([]);
  const [sideB, setSideB] = useState<SelectedPick[]>([]);

  const addA = useCallback(
    (p: SelectedPick) => setSideA((prev) => [...prev, p]),
    [],
  );
  const addB = useCallback(
    (p: SelectedPick) => setSideB((prev) => [...prev, p]),
    [],
  );
  const removeA = useCallback(
    (id: string) => setSideA((prev) => prev.filter((p) => p.id !== id)),
    [],
  );
  const removeB = useCallback(
    (id: string) => setSideB((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  const totalA = useMemo(
    () => sideA.reduce((sum, p) => sum + getValue(p, model), 0),
    [sideA, model],
  );
  const totalB = useMemo(
    () => sideB.reduce((sum, p) => sum + getValue(p, model), 0),
    [sideB, model],
  );

  const net = totalA - totalB;
  const hasPicks = sideA.length > 0 || sideB.length > 0;

  const verdictText = useMemo(() => {
    if (!hasPicks || (sideA.length === 0 && sideB.length === 0)) return null;
    const abs = Math.abs(net);
    if (abs < 10) return 'Even trade';
    if (abs < 50) return `Slight edge to ${net > 0 ? 'Side A' : 'Side B'}`;
    if (abs < 150) return `Clear advantage ${net > 0 ? 'Side A' : 'Side B'}`;
    return `Significant advantage ${net > 0 ? 'Side A' : 'Side B'}`;
  }, [net, hasPicks, sideA.length, sideB.length]);

  const handleReset = () => {
    setSideA([]);
    setSideB([]);
  };

  return (
    <div className="space-y-6">
      {/* Value model toggle */}
      <div>
        <div className="flex gap-2">
          <Button
            variant={model === 'trade' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModel('trade')}
          >
            Trade Value
          </Button>
          <Button
            variant={model === 'surplus' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setModel('surplus')}
          >
            Surplus Value
          </Button>
          {hasPicks && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {model === 'trade'
            ? 'Rich Hill trade value chart (1,000 = #1 overall)'
            : 'Baldwin surplus value \u2014 peaks at pick 12, not pick 1'}
        </p>
      </div>

      {/* Two sides */}
      <div className="grid gap-6 md:grid-cols-2">
        <TradeSide
          label="Side A"
          picks={sideA}
          allSlots={picks}
          model={model}
          year={year}
          onAdd={addA}
          onRemove={removeA}
        />
        <TradeSide
          label="Side B"
          picks={sideB}
          allSlots={picks}
          model={model}
          year={year}
          onAdd={addB}
          onRemove={removeB}
        />
      </div>

      {/* Comparison */}
      {hasPicks && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4">
              {/* Value bar */}
              <div className="flex w-full max-w-md items-center gap-3">
                <span className="w-16 text-right font-mono text-sm font-bold tabular-nums">
                  {totalA.toFixed(0)}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-muted">
                  {totalA + totalB > 0 && (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 rounded-l-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(totalA / (totalA + totalB)) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 rounded-r-full transition-all duration-300"
                        style={{
                          width: `${(totalB / (totalA + totalB)) * 100}%`,
                          backgroundColor:
                            'var(--mb-secondary, var(--muted-foreground))',
                        }}
                      />
                    </>
                  )}
                </div>
                <span className="w-16 font-mono text-sm font-bold tabular-nums">
                  {totalB.toFixed(0)}
                </span>
              </div>

              {/* Net and verdict */}
              <div className="text-center">
                <p className="font-mono text-xl font-bold tabular-nums">
                  {net > 0 ? '+' : ''}
                  {net.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Net difference (Side A perspective)
                </p>
                {verdictText && (
                  <p className="mt-2 text-sm font-medium">{verdictText}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
