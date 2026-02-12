'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sparkline } from '@/components/ui/sparkline';
import {
  getKeyStatIndices,
  parseStatValue,
  type KeyStatIndex,
} from './stat-keys';
import type {
  EspnStatCategory,
  EspnGameLog,
  EspnGameLogEntry,
} from '@/lib/cache';

interface NflPlayerStatsProps {
  statCategories: EspnStatCategory[];
  gameLog: EspnGameLog | null;
}

export function NflPlayerStats({
  statCategories,
  gameLog,
}: NflPlayerStatsProps) {
  const activeCats = statCategories.filter(
    (c) => c.seasons.length > 0 || c.totals.length > 0,
  );

  if (activeCats.length === 0 && !gameLog) {
    return (
      <p className="text-sm text-muted-foreground">
        No stats available for this player.
      </p>
    );
  }

  return (
    <Tabs defaultValue="career">
      <TabsList>
        <TabsTrigger value="career">Career</TabsTrigger>
        {gameLog && <TabsTrigger value="gamelog">Game Log</TabsTrigger>}
      </TabsList>

      <TabsContent value="career" className="mt-4 space-y-8">
        {activeCats.map((cat) => (
          <div key={cat.name} className="space-y-4">
            <h2 className="text-lg font-medium">{cat.displayName}</h2>
            <CareerHeadlineCards category={cat} />
            <SeasonTimeline category={cat} />
          </div>
        ))}
      </TabsContent>

      {gameLog && (
        <TabsContent value="gamelog" className="mt-4 space-y-6">
          <GameLogTable gameLog={gameLog} />
        </TabsContent>
      )}
    </Tabs>
  );
}

// ---- Career Headline Cards ----

function CareerHeadlineCards({ category }: { category: EspnStatCategory }) {
  const keyStats = getKeyStatIndices(category);
  if (keyStats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {keyStats.map((stat) => (
        <StatCard key={stat.name} category={category} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({
  category,
  stat,
}: {
  category: EspnStatCategory;
  stat: KeyStatIndex;
}) {
  const total = category.totals[stat.index] ?? '--';
  const seasonValues = category.seasons.map((s) =>
    parseStatValue(s.stats[stat.index] ?? '0'),
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {stat.displayName}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold">{total}</p>
      {seasonValues.length > 1 && (
        <Sparkline
          values={seasonValues}
          width={80}
          height={24}
          className="mt-2 text-muted-foreground"
        />
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {category.seasons.length} season{category.seasons.length !== 1 && 's'}
      </p>
    </div>
  );
}

// ---- Season Timeline ----

function SeasonTimeline({ category }: { category: EspnStatCategory }) {
  if (category.seasons.length === 0) return null;

  const keyStats = getKeyStatIndices(category);
  const reversedSeasons = [...category.seasons].reverse();

  return (
    <div className="relative ml-4 border-l-2 border-border pl-6">
      {reversedSeasons.map((season, i) => (
        <SeasonNode
          key={season.displayName}
          seasonName={season.displayName}
          stats={season.stats}
          labels={category.labels}
          displayNames={category.displayNames}
          keyStats={keyStats}
          defaultExpanded={i === 0}
        />
      ))}

      {/* Career totals node */}
      {category.totals.length > 0 && (
        <SeasonNode
          seasonName="Career"
          stats={category.totals}
          labels={category.labels}
          displayNames={category.displayNames}
          keyStats={keyStats}
          defaultExpanded={false}
          isCareer
        />
      )}
    </div>
  );
}

function SeasonNode({
  seasonName,
  stats,
  labels,
  displayNames,
  keyStats,
  defaultExpanded,
  isCareer,
}: {
  seasonName: string;
  stats: string[];
  labels: string[];
  displayNames: string[];
  keyStats: KeyStatIndex[];
  defaultExpanded: boolean;
  isCareer?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Key stat pills: e.g. "4,739 YDS · 34 TD · 9 INT"
  const pills = keyStats
    .map((ks) => {
      const val = stats[ks.index];
      if (!val || val === '--') return null;
      return `${val} ${ks.label}`;
    })
    .filter(Boolean);

  return (
    <div className="relative pb-6 last:pb-0">
      {/* Dot on the timeline */}
      <div
        className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
          isCareer ? 'bg-primary' : 'bg-muted-foreground'
        }`}
      />

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-2 text-left"
      >
        <span
          className={`shrink-0 font-mono text-sm font-medium ${isCareer ? 'text-primary' : ''}`}
        >
          {seasonName}
        </span>
        <span className="mt-0.5 text-sm text-muted-foreground">
          {pills.join(' · ')}
        </span>
        <span className="ml-auto mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 overflow-x-auto rounded-md border bg-muted/30 p-3">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-4 gap-y-1">
            {labels.map((label, i) => (
              <div key={i} className="min-w-0">
                <p
                  className="text-xs text-muted-foreground"
                  title={displayNames[i]}
                >
                  {label}
                </p>
                <p className="font-mono text-sm">{stats[i] ?? '--'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Game Log Table ----

function GameLogTable({ gameLog }: { gameLog: EspnGameLog }) {
  const [selectedGroup, setSelectedGroup] = useState(0);

  const group = gameLog.statGroups[selectedGroup];
  if (!group) {
    return (
      <p className="text-sm text-muted-foreground">
        No game log data available.
      </p>
    );
  }

  const rows = group.events
    .map((ev) => {
      const meta = gameLog.events.get(ev.eventId);
      return meta ? { ...meta, stats: ev.stats } : null;
    })
    .filter(Boolean) as (EspnGameLogEntry & { stats: string[] })[];

  rows.sort((a, b) => a.week - b.week);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            {gameLog.seasonLabel || 'Game Log'}
          </CardTitle>
          {gameLog.statGroups.length > 1 && (
            <div className="flex gap-1">
              {gameLog.statGroups.map((sg, i) => (
                <button
                  key={sg.displayName}
                  onClick={() => setSelectedGroup(i)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    i === selectedGroup
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {sg.displayName}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">Wk</TableHead>
                <TableHead>Opp</TableHead>
                <TableHead>Result</TableHead>
                {group.labels.map((label, i) => (
                  <TableHead key={i} className="text-right">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.eventId}>
                  <TableCell className="sticky left-0 bg-card font-mono text-sm">
                    {row.week}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.atVs} {row.opponentAbbreviation}
                  </TableCell>
                  <TableCell
                    className={`text-sm font-medium ${
                      row.gameResult === 'W'
                        ? 'text-emerald-500'
                        : row.gameResult === 'L'
                          ? 'text-red-400'
                          : ''
                    }`}
                  >
                    {row.gameResult} {row.score}
                  </TableCell>
                  {row.stats.map((val, i) => (
                    <TableCell key={i} className="text-right font-mono text-sm">
                      {val}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
