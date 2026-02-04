'use client';

import { useState, useMemo } from 'react';
import type { Player, Position } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { ProspectCard } from '@/components/prospect-card';
import { ProspectRow } from '@/components/prospect-row';

interface ProspectBigBoardProps {
  players: Player[];
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

const PAGE_SIZE = 50;

type ViewMode = 'full' | 'condensed';

export function ProspectBigBoard({ players }: ProspectBigBoardProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<Position | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState<ViewMode>('condensed');

  const filtered = useMemo(() => {
    let result = players;

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
  }, [players, search, posFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name, school, or NFL comp..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:shadow-[var(--shadow-glow)] sm:w-64"
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
            {filtered.length} prospect{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-1">
            <Button
              variant={view === 'full' ? 'default' : 'outline'}
              size="xs"
              onClick={() => setView('full')}
              aria-label="Full view"
            >
              Full
            </Button>
            <Button
              variant={view === 'condensed' ? 'default' : 'outline'}
              size="xs"
              onClick={() => setView('condensed')}
              aria-label="Condensed view"
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Prospect cards */}
      {visible.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No prospects found.
        </p>
      ) : view === 'full' ? (
        <div className="space-y-6">
          {visible.map((player) => (
            <ProspectCard key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((player) => (
            <ProspectRow key={player.id} player={player} />
          ))}
        </div>
      )}

      {/* Load more */}
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
