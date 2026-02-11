'use client';

import Link from 'next/link';
import type {
  TeamAbbreviation,
  FuturePickSeed,
  Coach,
  FrontOfficeStaff,
  SeasonOverview,
} from '@mockingboard/shared';
import type { TeamSeed } from '@mockingboard/shared';
import type { TeamRoster, TeamSchedule } from '@/lib/cache';
import { TEAM_COLORS } from '@/lib/team-colors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type KeyPlayerCardProps } from '@/components/team-breakdown/key-player-card';
import { CoachingStaff } from '@/components/team-breakdown/coaching-staff';
import { FrontOffice } from '@/components/team-breakdown/front-office';
import { SeasonOverviewCard } from './season-overview-card';
import { DraftTab } from './draft-tab/draft-tab';

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
  capitalRanking: TeamCapitalRank[];
  year: number;
  roster: TeamRoster | null;
  schedule: TeamSchedule | null;
  keyPlayers: KeyPlayerCardProps[];
  coachingStaff: Coach[];
  frontOffice?: FrontOfficeStaff[];
  seasonOverview?: SeasonOverview;
}

export function TeamBreakdown({
  team,
  ownedPicks,
  tradedAway,
  futurePicks,
  totalValue,
  capitalRanking,
  year,
  schedule,
  coachingStaff,
  frontOffice,
  seasonOverview,
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
          <p className="text-sm text-muted-foreground">{team.city}</p>
        </div>
      </div>

      <Separator />

      {/* Tabbed content */}
      <Tabs defaultValue="draft">
        <TabsList>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="season">Season</TabsTrigger>
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
          <TabsTrigger value="front-office">Front Office</TabsTrigger>
        </TabsList>

        {/* ---- Draft Tab ---- */}
        <TabsContent value="draft" className="space-y-6">
          <DraftTab
            team={team}
            year={year}
            ownedPicks={ownedPicks}
            tradedAway={tradedAway}
            futurePicks={futurePicks}
            totalValue={totalValue}
            maxValue={maxValue}
            capitalRanking={capitalRanking}
            colors={colors}
          />
        </TabsContent>

        {/* ---- Season Tab ---- */}
        <TabsContent value="season" className="space-y-6">
          {/* Season Overview — editorial card */}
          {(() => {
            const lastGame = schedule?.games[schedule.games.length - 1];
            const record = lastGame?.record;
            const hasOverview =
              record ||
              seasonOverview?.finalResult ||
              seasonOverview?.divisionResult ||
              (seasonOverview?.accolades &&
                seasonOverview.accolades.length > 0);

            if (!hasOverview) return null;

            return (
              <SeasonOverviewCard
                team={{ ...team, seasonOverview, colors, record }}
              />
            );
          })()}

          {schedule && schedule.games.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Game Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Wk</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-20">Score</TableHead>
                        <TableHead className="w-16">Record</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.games.map((g) => (
                        <TableRow key={`${g.weekLabel}-${g.opponent}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {g.weekLabel}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/teams/${g.opponent}`}
                              className="text-sm hover:underline"
                            >
                              {g.isHome ? 'vs' : '@'} {g.opponent}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-block w-5 text-center text-xs font-bold ${
                                g.isTie
                                  ? 'text-yellow-500'
                                  : g.isWin
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {g.isTie ? 'T' : g.isWin ? 'W' : 'L'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums">
                            {g.teamScore}-{g.opponentScore}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {g.record}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Schedule data not available.
            </p>
          )}
        </TabsContent>

        {/* ---- Coaches Tab ---- */}
        <TabsContent value="coaches" className="space-y-6">
          <CoachingStaff coaches={coachingStaff} teamColors={colors} />
        </TabsContent>

        {/* ---- Front Office Tab ---- */}
        <TabsContent value="front-office" className="space-y-6">
          {frontOffice && frontOffice.length > 0 ? (
            <FrontOffice staff={frontOffice} teamColors={colors} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Front office data not available.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
