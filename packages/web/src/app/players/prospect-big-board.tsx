'use client';

import { useState, useMemo } from 'react';
import type { Player, PositionFilterGroup } from '@mockingboard/shared';
import { POSITION_GROUPS } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { ProspectCard } from '@/components/prospect-card';

interface ProspectBigBoardProps {
  players: Player[];
}

const FILTER_LABELS: Record<Exclude<PositionFilterGroup, null>, string> = {
  QB: 'QB',
  WR_TE: 'WR/TE',
  RB: 'RB',
  OL: 'OL',
  DEF: 'DEF',
};

const PAGE_SIZE = 50;

export function ProspectBigBoard({ players }: ProspectBigBoardProps) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<PositionFilterGroup>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
      const positions = POSITION_GROUPS[posFilter];
      result = result.filter((p) => positions.includes(p.position));
    }

    return result;
  }, [players, search, posFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      {/* Sticky filter bar */}
      <div className="sticky top-14 z-10 -mx-4 mb-6 border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
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
            {(
              Object.keys(FILTER_LABELS) as Exclude<PositionFilterGroup, null>[]
            ).map((group) => (
              <Button
                key={group}
                variant={posFilter === group ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  setPosFilter(group);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                {FILTER_LABELS[group]}
              </Button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length} prospect{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Prospect cards */}
      {visible.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No prospects found.
        </p>
      ) : (
        <div className="space-y-6">
          {visible.map((player) => (
            <ProspectCard key={player.id} player={player} />
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
