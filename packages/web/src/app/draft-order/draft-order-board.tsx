'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type {
  DraftSlot,
  TeamAbbreviation,
  Position,
} from '@mockingboard/shared';
import { teams, getPickValue, baseSurplusValue } from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { buildRowColors } from '@/lib/colors/team-colors';
import { getPositionColor } from '@/lib/colors/position-colors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';

type ValueModel = 'trade' | 'surplus';

const teamSeedMap = new Map(teams.map((t) => [t.id, t]));

interface DraftOrderBoardProps {
  slots: DraftSlot[];
}

export function DraftOrderBoard({ slots }: DraftOrderBoardProps) {
  const [model, setModel] = useState<ValueModel>('trade');

  const colorMap = useMemo(() => buildRowColors(slots), [slots]);

  const rounds = useMemo(() => {
    const map = new Map<number, DraftSlot[]>();
    for (const slot of slots) {
      const items = map.get(slot.round) ?? [];
      items.push(slot);
      map.set(slot.round, items);
    }
    return map;
  }, [slots]);

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
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {model === 'trade'
            ? 'Rich Hill trade value chart (1,000 = #1 overall)'
            : 'Baldwin surplus value \u2014 peaks at pick 12, not pick 1'}
        </p>
      </div>

      {/* Per-round tables */}
      {Array.from(rounds.entries()).map(([round, roundSlots]) => (
        <div key={round}>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Round {round}
          </h3>
          <div
            className="overflow-x-auto rounded-md border"
            style={{ contain: 'layout' }}
          >
            <Table>
              <TableHeader>
                <tr className="border-b">
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="w-24 text-right">Value</TableHead>
                  <TableHead className="hidden sm:table-cell">Needs</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {roundSlots.map((slot) => {
                  const displayTeam = (slot.teamOverride ??
                    slot.team) as TeamAbbreviation;
                  const isTraded =
                    slot.teamOverride && slot.teamOverride !== slot.team;
                  const tc = colorMap.get(slot.overall)!;
                  const seed = teamSeedMap.get(displayTeam);
                  const value =
                    model === 'trade'
                      ? getPickValue(slot.overall)
                      : baseSurplusValue(slot.overall);

                  return (
                    <tr
                      key={slot.overall}
                      style={{ borderLeft: `3px solid ${tc}` }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        {round}.{String(slot.pick).padStart(2, '0')}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/teams/${displayTeam}`}
                          className="font-medium hover:underline"
                        >
                          {getTeamName(displayTeam)}
                        </Link>
                        {isTraded && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            via{' '}
                            <Link
                              href={`/teams/${slot.team}`}
                              className="hover:underline"
                            >
                              {getTeamName(slot.team as TeamAbbreviation)}
                            </Link>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {value.toFixed(1)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {seed?.needs.map((pos: Position) => (
                            <Badge
                              key={pos}
                              style={{
                                backgroundColor: getPositionColor(pos),
                                color: '#0A0A0B',
                              }}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {pos}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
