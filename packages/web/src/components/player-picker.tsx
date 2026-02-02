'use client';

import { useState, useMemo } from 'react';
import type { Player, PositionFilterGroup } from '@mockingboard/shared';
import { POSITION_GROUPS } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { cn } from '@/lib/utils';

interface PlayerPickerProps {
  players: Player[];
  onPick: (playerId: string) => void;
  disabled: boolean;
}

const FILTER_LABELS: Record<Exclude<PositionFilterGroup, null>, string> = {
  QB: 'QB',
  WR_TE: 'WR/TE',
  RB: 'RB',
  OL: 'OL',
  DEF: 'DEF',
};

export function PlayerPicker({ players, onPick, disabled }: PlayerPickerProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<PositionFilterGroup>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = players;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.school.toLowerCase().includes(query),
      );
    }

    if (posFilter) {
      const positions = POSITION_GROUPS[posFilter];
      result = result.filter((p) => positions.includes(p.position));
    }

    return result;
  }, [players, search, posFilter]);

  const selectedPlayer = selected
    ? players.find((p) => p.id === selected)
    : null;

  function handleDraft() {
    if (!selectedPlayer || disabled) return;
    onPick(selectedPlayer.id);
    setSelected(null);
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-[var(--shadow-glow)]"
      />

      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={posFilter === null ? 'default' : 'outline'}
          size="xs"
          onClick={() => setPosFilter(null)}
        >
          All
        </Button>
        {(
          Object.keys(FILTER_LABELS) as Exclude<PositionFilterGroup, null>[]
        ).map((group) => (
          <Button
            key={group}
            variant={posFilter === group ? 'default' : 'outline'}
            size="xs"
            onClick={() => setPosFilter(group)}
          >
            {FILTER_LABELS[group]}
          </Button>
        ))}
      </div>

      {selectedPlayer && (
        <div className="flex items-center justify-between rounded-md border border-mb-accent/30 bg-mb-accent-muted p-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedPlayer.name}</span>
            <Badge
              style={{
                backgroundColor: getPositionColor(selectedPlayer.position),
                color: '#0A0A0B',
              }}
              className="text-xs"
            >
              {selectedPlayer.position}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedPlayer.school}
            </span>
          </div>
          <Button size="sm" onClick={handleDraft} disabled={disabled}>
            {disabled ? 'Drafting...' : 'Draft'}
          </Button>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No players found
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-12 p-2">#</th>
                <th className="p-2">Player</th>
                <th className="w-14 p-2">Pos</th>
                <th className="hidden p-2 sm:table-cell">School</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((player) => (
                <tr
                  key={player.id}
                  onClick={() => setSelected(player.id)}
                  className={cn(
                    'cursor-pointer border-b transition-colors',
                    selected === player.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <td className="p-2 font-mono text-muted-foreground">
                    {player.consensusRank}
                  </td>
                  <td className="p-2 font-medium">{player.name}</td>
                  <td className="p-2">
                    <Badge
                      style={{
                        backgroundColor: getPositionColor(player.position),
                        color: '#0A0A0B',
                      }}
                      className="text-xs"
                    >
                      {player.position}
                    </Badge>
                  </td>
                  <td className="hidden p-2 text-muted-foreground sm:table-cell">
                    {player.school}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
