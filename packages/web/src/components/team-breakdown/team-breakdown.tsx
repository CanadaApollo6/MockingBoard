'use client';

import Link from 'next/link';
import type {
  TeamAbbreviation,
  FuturePickSeed,
  Coach,
  FrontOfficeStaff,
  SeasonOverview,
  TeamContractData,
} from '@mockingboard/shared';
import type { TeamSeed } from '@mockingboard/shared';
import type { TeamRoster, TeamSchedule } from '@/lib/cache';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { normalizePlayerName } from '@/lib/firebase/format';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { type KeyPlayerCardProps } from '@/components/team-breakdown/roster-tab/key-player-card';
import { CoachingStaff } from '@/components/team-breakdown/coaching-staff';
import { FrontOffice } from '@/components/team-breakdown/front-office';
import { DraftTab } from './draft-tab/draft-tab';
import { SeasonTab } from './season-tab/season-tab';
import { RosterTab } from './roster-tab/roster-tab';
import { CapTab } from './cap-tab/cap-tab';
import { FreeAgentsTab } from './free-agents-tab/free-agents-tab';

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
  contracts: TeamContractData | null;
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
  roster,
  keyPlayers,
  contracts,
}: TeamBreakdownProps) {
  const colors = TEAM_COLORS[team.id];
  const maxValue = capitalRanking[0]?.totalValue ?? 1;

  const allPlayers = roster
    ? [...roster.offense, ...roster.defense, ...roster.specialTeams]
    : [];
  const nameToPosition = new Map(
    allPlayers.map((p) => [normalizePlayerName(p.name), p.position]),
  );

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
          <TabsTrigger value="cap">Cap</TabsTrigger>
          <TabsTrigger value="free-agents">Free Agents</TabsTrigger>
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

        <TabsContent value="roster" className="space-y-6">
          <RosterTab roster={roster} keyPlayers={keyPlayers} />
        </TabsContent>

        {/* ---- Cap Tab ---- */}
        <TabsContent value="cap" className="space-y-6">
          {contracts ? (
            <CapTab
              contracts={contracts}
              colors={colors}
              nameToPosition={nameToPosition}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cap data not available.
            </p>
          )}
        </TabsContent>

        {/* ---- Free Agents Tab ---- */}
        <TabsContent value="free-agents" className="space-y-6">
          {contracts ? (
            <FreeAgentsTab
              freeAgents={contracts.freeAgents}
              colors={colors}
              nameToPosition={nameToPosition}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Free agent data not available.
            </p>
          )}
        </TabsContent>

        {/* ---- Season Tab ---- */}
        <TabsContent value="season" className="space-y-6">
          <SeasonTab
            schedule={schedule}
            seasonOverview={seasonOverview}
            team={team}
            colors={colors}
          />
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
