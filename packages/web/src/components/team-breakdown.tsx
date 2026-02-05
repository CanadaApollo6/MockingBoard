'use client';

import Link from 'next/link';
import type {
  TeamAbbreviation,
  Position,
  FuturePickSeed,
} from '@mockingboard/shared';
import type { TeamSeed } from '@mockingboard/shared';
import type { TeamRoster, RosterPlayer } from '@/lib/cache';
import { TEAM_COLORS } from '@/lib/team-colors';
import { getTeamName } from '@/lib/teams';
import { getPositionColor } from '@/lib/position-colors';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface OwnedPick {
  overall: number;
  round: number;
  pick: number;
  value: number;
  originalTeam: TeamAbbreviation;
  isAcquired: boolean;
}

export interface TradedAwayPick {
  overall: number;
  round: number;
  pick: number;
  value: number;
  tradedTo: TeamAbbreviation;
}

export interface TeamCapitalRank {
  team: TeamAbbreviation;
  totalValue: number;
}

interface TeamBreakdownProps {
  team: TeamSeed;
  ownedPicks: OwnedPick[];
  tradedAway: TradedAwayPick[];
  futurePicks: FuturePickSeed[];
  totalValue: number;
  rank: number;
  capitalRanking: TeamCapitalRank[];
  year: number;
  roster: TeamRoster | null;
}

export function TeamBreakdown({
  team,
  ownedPicks,
  tradedAway,
  futurePicks,
  totalValue,
  rank,
  capitalRanking,
  year,
  roster,
}: TeamBreakdownProps) {
  const colors = TEAM_COLORS[team.id];
  const maxValue = capitalRanking[0]?.totalValue ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/teams"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
          All Teams
        </Link>
        <div
          className="h-1.5 rounded-full"
          style={{
            background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
          }}
        />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              {team.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {team.conference} {team.division}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold">#{rank}</p>
            <p className="text-xs text-muted-foreground">Capital Rank</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Needs + Summary row */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Positional Needs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Positional Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {team.needs.map((pos: Position) => (
                <Badge
                  key={pos}
                  style={{
                    backgroundColor: getPositionColor(pos),
                    color: '#0A0A0B',
                  }}
                  className="px-2 py-0.5 text-xs"
                >
                  {pos}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Draft Capital Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {year} Draft Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="font-mono text-2xl font-bold">
                  {ownedPicks.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pick{ownedPicks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold">
                  {totalValue.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
              {tradedAway.length > 0 && (
                <div>
                  <p className="font-mono text-2xl font-bold text-destructive">
                    {tradedAway.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Traded Away</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Roster */}
      {roster &&
        (roster.offense.length > 0 ||
          roster.defense.length > 0 ||
          roster.specialTeams.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Current Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pb-4">
              {(
                [
                  ['Offense', roster.offense],
                  ['Defense', roster.defense],
                  ['Special Teams', roster.specialTeams],
                ] as const
              ).map(([groupLabel, players]) =>
                players.length > 0 ? (
                  <div key={groupLabel}>
                    <h3 className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {groupLabel}
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-16">Pos</TableHead>
                            <TableHead className="w-16">Ht</TableHead>
                            <TableHead className="w-16">Wt</TableHead>
                            <TableHead className="w-12">Age</TableHead>
                            <TableHead className="w-12">Exp</TableHead>
                            <TableHead>College</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {players.map((p: RosterPlayer) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-muted-foreground">
                                {p.jersey}
                              </TableCell>
                              <TableCell className="font-medium">
                                {p.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  style={{
                                    backgroundColor: getPositionColor(
                                      p.position,
                                    ),
                                    color: '#0A0A0B',
                                  }}
                                  className="px-1.5 py-0 text-xs"
                                >
                                  {p.position}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.height}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.weight}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {p.age}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {p.experience === 0 ? 'R' : p.experience}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.college}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null,
              )}
            </CardContent>
          </Card>
        )}

      {/* Owned Picks table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Picks Owned ({ownedPicks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Pick</TableHead>
                  <TableHead className="w-1/4">Overall</TableHead>
                  <TableHead className="w-1/4">Value</TableHead>
                  <TableHead className="w-1/4">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ownedPicks.map((p) => (
                  <TableRow key={p.overall}>
                    <TableCell className="font-mono text-muted-foreground">
                      {p.round}.{String(p.pick).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="font-mono">{p.overall}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {p.value.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      {p.isAcquired ? (
                        <span className="text-sm text-muted-foreground">
                          via{' '}
                          <Link
                            href={`/teams/${p.originalTeam}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {getTeamName(p.originalTeam)}
                          </Link>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Own pick
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Subtotal */}
                <TableRow className="border-t-2 font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {totalValue.toFixed(1)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Traded Away picks */}
      {tradedAway.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Picks Traded Away ({tradedAway.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Pick</TableHead>
                    <TableHead className="w-1/4">Overall</TableHead>
                    <TableHead className="w-1/4">Value</TableHead>
                    <TableHead className="w-1/4">Traded To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradedAway.map((p) => (
                    <TableRow
                      key={p.overall}
                      className="text-muted-foreground line-through"
                    >
                      <TableCell className="font-mono">
                        {p.round}.{String(p.pick).padStart(2, '0')}
                      </TableCell>
                      <TableCell className="font-mono">{p.overall}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {p.value.toFixed(1)}
                      </TableCell>
                      <TableCell className="no-underline">
                        <Link
                          href={`/teams/${p.tradedTo}`}
                          className="text-sm text-foreground no-underline hover:underline"
                        >
                          {getTeamName(p.tradedTo)}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capital Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Draft Capital Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {capitalRanking.map((entry, i) => {
              const isCurrentTeam = entry.team === team.id;
              const entryColors = TEAM_COLORS[entry.team];
              const barWidth = (entry.totalValue / maxValue) * 100;

              return (
                <Link
                  key={entry.team}
                  href={`/teams/${entry.team}`}
                  className="group flex items-center gap-2 text-sm"
                >
                  <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className={`w-24 shrink-0 truncate text-xs ${isCurrentTeam ? 'font-bold text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                  >
                    {entry.team}
                  </span>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: entryColors.primary,
                        opacity: isCurrentTeam ? 1 : 0.5,
                      }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {entry.totalValue.toFixed(0)}
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Future Picks */}
      {futurePicks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Future Picks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Year</TableHead>
                    <TableHead className="w-1/3">Round</TableHead>
                    <TableHead className="w-1/3 pl-6">Original Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {futurePicks
                    .sort((a, b) => a.year - b.year || a.round - b.round)
                    .map((fp, i) => (
                      <TableRow
                        key={`${fp.year}-${fp.round}-${fp.originalTeam}-${i}`}
                      >
                        <TableCell className="font-mono">{fp.year}</TableCell>
                        <TableCell className="font-mono">
                          Rd {fp.round}
                        </TableCell>
                        <TableCell className="pl-6 text-sm text-muted-foreground">
                          {fp.originalTeam === team.id
                            ? 'Own pick'
                            : `via ${getTeamName(fp.originalTeam)}`}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
