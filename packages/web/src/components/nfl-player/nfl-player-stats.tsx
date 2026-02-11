'use client';

import { useState } from 'react';
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
  // Filter to categories that have actual data
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

      <TabsContent value="career" className="mt-4 space-y-6">
        {activeCats.map((cat) => (
          <CareerStatsTable key={cat.name} category={cat} />
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

// ---- Career Stats Table ----

function CareerStatsTable({ category }: { category: EspnStatCategory }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">
          {category.displayName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">Season</TableHead>
                {category.labels.map((label, i) => (
                  <TableHead key={i} className="text-right">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.seasons.map((season) => (
                <TableRow key={season.displayName}>
                  <TableCell className="sticky left-0 bg-card font-medium">
                    {season.displayName}
                  </TableCell>
                  {season.stats.map((val, i) => (
                    <TableCell key={i} className="text-right font-mono text-sm">
                      {val}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Career totals row */}
              {category.totals.length > 0 && (
                <TableRow className="border-t-2 font-bold">
                  <TableCell className="sticky left-0 bg-card">
                    Career
                  </TableCell>
                  {category.totals.map((val, i) => (
                    <TableCell key={i} className="text-right font-mono text-sm">
                      {val}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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

  // Build rows: merge event metadata with stat values
  const rows = group.events
    .map((ev) => {
      const meta = gameLog.events.get(ev.eventId);
      return meta ? { ...meta, stats: ev.stats } : null;
    })
    .filter(Boolean) as (EspnGameLogEntry & { stats: string[] })[];

  // Sort by week ascending
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
