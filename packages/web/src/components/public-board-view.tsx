'use client';

import { useState, useMemo } from 'react';
import type { Player, Position } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPositionColor } from '@/lib/position-colors';
import { ProspectCard } from '@/components/prospect-card';
import { ProspectRow } from '@/components/prospect-row';

type ViewMode = 'skim' | 'peruse' | 'deep-dive';

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

const PAGE_SIZE = 50;

interface PublicBoardViewProps {
  rankedPlayers: Player[];
}

export function PublicBoardView({ rankedPlayers }: PublicBoardViewProps) {
  const [view, setView] = useState<ViewMode>('peruse');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<Position | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let result = rankedPlayers;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.school.toLowerCase().includes(query) ||
          p.scouting?.comparison?.toLowerCase().includes(query),
      );
    }

    if (posFilter) {
      result = result.filter((p) => p.position === posFilter);
    }

    return result;
  }, [rankedPlayers, search, posFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background px-4 py-3">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="text"
            placeholder="Search by name, school, or comp..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={posFilter === null ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                setPosFilter(null);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              All
            </Button>
            {POSITIONS.map((pos) => (
              <Button
                key={pos}
                variant={posFilter === pos ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  setPosFilter(pos);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                {pos}
              </Button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length} player{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-1">
            <Button
              variant={view === 'skim' ? 'default' : 'outline'}
              size="xs"
              onClick={() => setView('skim')}
            >
              Skim
            </Button>
            <Button
              variant={view === 'peruse' ? 'default' : 'outline'}
              size="xs"
              onClick={() => setView('peruse')}
            >
              Peruse
            </Button>
            <Button
              variant={view === 'deep-dive' ? 'default' : 'outline'}
              size="xs"
              onClick={() => setView('deep-dive')}
            >
              Deep Dive
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No players found.
        </p>
      ) : view === 'skim' ? (
        <SkimView players={visible} />
      ) : view === 'peruse' ? (
        <div className="space-y-2">
          {visible.map((player) => (
            <ProspectRow key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {visible.map((player) => (
            <ProspectCard key={player.id} player={player} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

function SkimView({ players }: { players: Player[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="w-14 px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">
              School
            </th>
            <th className="w-16 px-3 py-2 font-medium">Pos</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => (
            <tr
              key={player.id}
              className="border-b last:border-0 transition-colors hover:bg-muted/30"
            >
              <td className="px-3 py-2 font-mono font-bold text-muted-foreground">
                {i + 1}
              </td>
              <td className="px-3 py-2 font-[family-name:var(--font-display)] font-bold uppercase tracking-tight">
                {player.name}
              </td>
              <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                {player.school}
              </td>
              <td className="px-3 py-2">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
