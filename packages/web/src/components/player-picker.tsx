'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Player, Position } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerCard } from '@/components/player-card';
import { getPositionColor } from '@/lib/position-colors';
import { cn } from '@/lib/utils';

interface PlayerPickerProps {
  players: Player[];
  onPick: (playerId: string) => void;
  disabled: boolean;
  rankOverride?: Map<string, number>;
}

const POSITIONS: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'OT',
  'OG',
  'C',
  'EDGE',
  'DL',
  'LB',
  'CB',
  'S',
];

export function PlayerPicker({
  players,
  onPick,
  disabled,
  rankOverride,
}: PlayerPickerProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<Position | null>(null);
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
      result = result.filter((p) => p.position === posFilter);
    }

    return result;
  }, [players, search, posFilter]);

  // Always have a selection: fall back to top available player
  const effectiveSelected = useMemo(() => {
    if (selected && players.some((p) => p.id === selected)) return selected;
    return players[0]?.id ?? null;
  }, [selected, players]);

  const selectedPlayer = effectiveSelected
    ? players.find((p) => p.id === effectiveSelected)
    : undefined;

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
        {POSITIONS.map((pos) => (
          <Button
            key={pos}
            variant={posFilter === pos ? 'default' : 'outline'}
            size="xs"
            onClick={() => setPosFilter(pos)}
          >
            {pos}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selectedPlayer && (
          <PlayerCard
            key={selectedPlayer.id}
            player={selectedPlayer}
            onDraft={handleDraft}
            disabled={disabled}
          />
        )}
      </AnimatePresence>

      <div className="max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-20rem)] overflow-y-auto rounded-md border">
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
                    effectiveSelected === player.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <td className="p-2 font-mono text-muted-foreground">
                    {rankOverride
                      ? rankOverride.has(player.id)
                        ? `BB ${rankOverride.get(player.id)}`
                        : '—'
                      : player.consensusRank >= 9999
                        ? 'NR'
                        : player.consensusRank}
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
