'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Routes } from '@/routes';
import { Search, X, ArrowLeftRight } from 'lucide-react';
import { isTeamAbbreviation } from '@mockingboard/shared';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/ui/sparkline';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { getPositionGroup } from '@/lib/position-groups';
import { getKeyStatIndices, parseStatValue } from './stat-keys';
import { CompareStatBar } from './compare-stat-bar';
import type { EspnPlayerBio, EspnStatCategory } from '@/lib/cache';
import type { SearchResult } from '@/app/api/search/route';

interface PlayerData {
  bio: EspnPlayerBio;
  statCategories: EspnStatCategory[];
}

interface PlayerCompareProps {
  player1: PlayerData | null;
  player2: PlayerData | null;
}

function getTeamColors(abbr: string) {
  return isTeamAbbreviation(abbr)
    ? TEAM_COLORS[abbr]
    : { primary: '#3b82f6', secondary: '#8b5cf6' };
}

export function PlayerCompare({ player1, player2 }: PlayerCompareProps) {
  const router = useRouter();

  const handleSelect = useCallback(
    (slot: 'p1' | 'p2', espnId: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set(slot, espnId);
      router.replace(`${Routes.COMPARE_PLAYERS}?${params.toString()}`);
    },
    [router],
  );

  const handleClear = useCallback(
    (slot: 'p1' | 'p2') => {
      const params = new URLSearchParams(window.location.search);
      params.delete(slot);
      router.replace(`${Routes.COMPARE_PLAYERS}?${params.toString()}`);
    },
    [router],
  );

  return (
    <div className="space-y-12">
      {/* Hero Banner */}
      <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
        <PlayerSlot
          player={player1}
          onSelect={(id) => handleSelect('p1', id)}
          onClear={() => handleClear('p1')}
          posGroupFilter={
            player2 ? getPositionGroup(player2.bio.position) : null
          }
          side="left"
        />

        {/* VS Divider */}
        <div className="flex items-center justify-center self-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-mb-accent/40 bg-background shadow-[0_0_20px_rgba(61,255,160,0.15)]">
            <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wider text-mb-accent">
              VS
            </span>
          </div>
        </div>

        <PlayerSlot
          player={player2}
          onSelect={(id) => handleSelect('p2', id)}
          onClear={() => handleClear('p2')}
          posGroupFilter={
            player1 ? getPositionGroup(player1.bio.position) : null
          }
          side="right"
        />
      </div>

      {/* Stat Face-Off */}
      {player1 && player2 && (
        <>
          {/* Sticky player name context strip */}
          <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between rounded-lg border bg-card/90 px-5 py-2.5 backdrop-blur-sm">
            <span
              className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-tight"
              style={{
                color: getTeamColors(player1.bio.teamAbbreviation).primary,
              }}
            >
              {player1.bio.displayName}
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Career Stats
            </span>
            <span
              className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-tight"
              style={{
                color: getTeamColors(player2.bio.teamAbbreviation).primary,
              }}
            >
              {player2.bio.displayName}
            </span>
          </div>

          <StatFaceOff
            player1={player1}
            player2={player2}
            color1={getTeamColors(player1.bio.teamAbbreviation).primary}
            color2={getTeamColors(player2.bio.teamAbbreviation).primary}
          />
          <SeasonTrajectories
            player1={player1}
            player2={player2}
            color1={getTeamColors(player1.bio.teamAbbreviation).primary}
            color2={getTeamColors(player2.bio.teamAbbreviation).primary}
          />
          <BioStrip player1={player1.bio} player2={player2.bio} />
        </>
      )}

      {/* Empty state when no players selected */}
      {!player1 && !player2 && (
        <div className="py-16 text-center">
          <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="mt-4 text-lg font-medium text-muted-foreground">
            Player Comparison
          </h2>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Search for two players above to compare their career stats side by
            side.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Player Slot (Hero Card or Search) ----

function PlayerSlot({
  player,
  onSelect,
  onClear,
  posGroupFilter,
  side,
}: {
  player: PlayerData | null;
  onSelect: (espnId: string) => void;
  onClear: () => void;
  posGroupFilter: string | null;
  side: 'left' | 'right';
}) {
  if (player) {
    return <PlayerHeroCard bio={player.bio} onClear={onClear} side={side} />;
  }
  return (
    <PlayerSearchSlot onSelect={onSelect} posGroupFilter={posGroupFilter} />
  );
}

function PlayerHeroCard({
  bio,
  onClear,
  side,
}: {
  bio: EspnPlayerBio;
  onClear: () => void;
  side: 'left' | 'right';
}) {
  const colors = getTeamColors(bio.teamAbbreviation);
  const details = [
    bio.age ? `${bio.age} yrs` : null,
    bio.displayHeight,
    bio.displayWeight,
    bio.displayExperience,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="relative overflow-hidden rounded-xl text-white"
      style={{
        background: `
          linear-gradient(${side === 'left' ? '135deg' : '225deg'}, ${colors.primary} 0%, ${colors.secondary} 100%),
          radial-gradient(ellipse at 20% 50%, ${colors.primary}cc 0%, transparent 70%)
        `,
      }}
    >
      {/* Noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />
      {/* Radial light wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 30% 0%, white 0%, transparent 60%)`,
        }}
      />

      <div className="relative px-6 pb-5 pt-6">
        {/* Clear button */}
        <button
          onClick={onClear}
          className="absolute right-3 top-3 rounded-full bg-black/20 p-1.5 text-white/70 transition-colors hover:bg-black/40 hover:text-white"
          aria-label="Remove player"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Jersey number watermark */}
        <div className="pointer-events-none absolute right-4 top-2 font-mono text-7xl font-bold text-white/20">
          {bio.jersey}
        </div>

        {/* Player info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-tight tracking-tight sm:text-3xl">
              {bio.displayName}
            </h2>
            <Badge
              variant="outline"
              className="border-white/30 px-2 py-0.5 text-xs text-white"
            >
              {bio.position}
            </Badge>
          </div>

          <Link
            href={Routes.team(bio.teamAbbreviation)}
            className="text-sm text-white/80 underline-offset-2 hover:underline"
          >
            {bio.teamDisplayName}
          </Link>

          <p className="text-xs text-white/60">{details}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
            {bio.college && <span>{bio.college}</span>}
            {bio.displayDraft ? (
              <span>{bio.displayDraft}</span>
            ) : (
              <span>Undrafted</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerSearchSlot({
  onSelect,
  posGroupFilter,
}: {
  onSelect: (espnId: string) => void;
  posGroupFilter: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (posGroupFilter) params.set('posGroup', posGroupFilter);
        const res = await fetch(`/api/search?${params}`);
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results.filter((r) => r.type === 'nfl-player'));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, posGroupFilter]);

  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-8">
      <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="mb-3 text-sm text-muted-foreground">
        {posGroupFilter
          ? `Search ${posGroupFilter} players...`
          : 'Search any player...'}
      </p>
      <div className="relative w-full max-w-xs">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-2 w-full max-w-xs overflow-hidden rounded-md border bg-card shadow-md">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {r.description}
              </span>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && !isSearching && results.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">No players found</p>
      )}
    </div>
  );
}

// ---- Stat Face-Off ----

function StatFaceOff({
  player1,
  player2,
  color1,
  color2,
}: {
  player1: PlayerData;
  player2: PlayerData;
  color1: string;
  color2: string;
}) {
  // Scoring category is redundant (rushing/receiving TDs already shown in their own sections)
  const SKIP_CATEGORIES = new Set(['scoring']);
  const sharedCategories = player1.statCategories.filter(
    (c1) =>
      !SKIP_CATEGORIES.has(c1.name) &&
      player2.statCategories.some((c2) => c2.name === c1.name),
  );

  if (sharedCategories.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No shared stat categories to compare.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {sharedCategories.map((cat1) => {
        const cat2 = player2.statCategories.find((c) => c.name === cat1.name)!;
        const keyStats = getKeyStatIndices(cat1);

        return (
          <div key={cat1.name} className="space-y-4">
            <h3 className="text-center font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {cat1.displayName}
            </h3>

            <div className="space-y-3">
              {keyStats.map((stat) => {
                const raw1 = cat1.totals[stat.index] ?? '--';
                const raw2 = cat2.totals[stat.index] ?? '--';
                const val1 = parseStatValue(raw1);
                const val2 = parseStatValue(raw2);

                return (
                  <CompareStatBar
                    key={stat.name}
                    label={stat.displayName}
                    value1={val1}
                    value2={val2}
                    displayValue1={raw1}
                    displayValue2={raw2}
                    color1={color1}
                    color2={color2}
                    lowerIsBetter={stat.name === 'interceptions'}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Season Trajectories ----

function SeasonTrajectories({
  player1,
  player2,
  color1,
  color2,
}: {
  player1: PlayerData;
  player2: PlayerData;
  color1: string;
  color2: string;
}) {
  const sharedCat = player1.statCategories.find((c1) =>
    player2.statCategories.some((c2) => c2.name === c1.name),
  );
  if (!sharedCat) return null;

  const matchingCat2 = player2.statCategories.find(
    (c) => c.name === sharedCat.name,
  )!;
  const keyStats = getKeyStatIndices(sharedCat).slice(0, 4);

  if (sharedCat.seasons.length < 2 && matchingCat2.seasons.length < 2) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-center font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Season Trajectories
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {keyStats.map((stat) => {
          const values1 = sharedCat.seasons.map((s) =>
            parseStatValue(s.stats[stat.index] ?? '0'),
          );
          const values2 = matchingCat2.seasons.map((s) =>
            parseStatValue(s.stats[stat.index] ?? '0'),
          );

          return (
            <div
              key={stat.name}
              className="space-y-3 rounded-lg border bg-card p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.displayName}
              </p>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Sparkline
                    values={values1}
                    width={120}
                    height={32}
                    className={values1.length > 0 ? '' : 'opacity-30'}
                    style={{ color: color1 }}
                  />
                </div>
                <div className="flex-1">
                  <Sparkline
                    values={values2}
                    width={120}
                    height={32}
                    className={values2.length > 0 ? '' : 'opacity-30'}
                    style={{ color: color2 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Bio Comparison Strip ----

function BioStrip({
  player1,
  player2,
}: {
  player1: EspnPlayerBio;
  player2: EspnPlayerBio;
}) {
  const items = [
    {
      label: 'Age',
      v1: player1.age ? `${player1.age}` : '--',
      v2: player2.age ? `${player2.age}` : '--',
    },
    {
      label: 'Height',
      v1: player1.displayHeight || '--',
      v2: player2.displayHeight || '--',
    },
    {
      label: 'Weight',
      v1: player1.displayWeight || '--',
      v2: player2.displayWeight || '--',
    },
    {
      label: 'Experience',
      v1: player1.displayExperience || '--',
      v2: player2.displayExperience || '--',
    },
    {
      label: 'College',
      v1: player1.college || '--',
      v2: player2.college || '--',
    },
    {
      label: 'Draft',
      v1: player1.displayDraft || 'Undrafted',
      v2: player2.displayDraft || 'Undrafted',
    },
  ];

  const colors1 = getTeamColors(player1.teamAbbreviation);
  const colors2 = getTeamColors(player2.teamAbbreviation);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="grid min-w-[560px] grid-cols-[auto_repeat(6,1fr)]">
        {/* Player name column */}
        <div className="flex flex-col justify-center border-r px-3 py-3">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            &nbsp;
          </p>
          <p
            className="mt-1 text-center text-xs font-bold uppercase tracking-tight"
            style={{ color: colors1.primary }}
          >
            {player1.displayName.split(' ').pop()}
          </p>
          <div className="my-1 h-px bg-border" />
          <p
            className="text-center text-xs font-bold uppercase tracking-tight"
            style={{ color: colors2.primary }}
          >
            {player2.displayName.split(' ').pop()}
          </p>
        </div>
        {items.map((item) => (
          <div key={item.label} className="border-r px-3 py-3 last:border-r-0">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-center font-mono text-sm font-semibold">
              {item.v1}
            </p>
            <div className="my-1 h-px bg-border" />
            <p className="text-center font-mono text-sm font-semibold">
              {item.v2}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
