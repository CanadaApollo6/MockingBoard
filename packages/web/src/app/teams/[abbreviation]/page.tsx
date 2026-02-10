import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { TeamAbbreviation, FuturePickSeed } from '@mockingboard/shared';
import {
  teams,
  getPickValue,
  coachingStaffs,
  isTeamAbbreviation,
} from '@mockingboard/shared';
import type {
  PlayerStatsRecord,
  RosterRecord,
  DepthChartRecord,
} from '@nflverse/nflreadts';
import {
  getCachedDraftOrderSlots,
  getCachedTeamDocs,
  getCachedRoster,
  getCachedSeasonStats,
  getCachedNflRoster,
  getCachedDepthCharts,
  getCachedSeasonConfig,
} from '@/lib/cache';
import { TEAM_COLORS } from '@/lib/team-colors';
import {
  TeamBreakdown,
  type OwnedPick,
  type TradedAwayPick,
  type TeamCapitalRank,
} from '@/components/team-breakdown';
import type {
  KeyPlayerCardProps,
  KeyPlayerStat,
} from '@/components/key-player-card';

export const revalidate = 3600;

const teamMap = new Map(teams.map((t) => [t.id, t]));

// Positions to feature: display label → depth chart abbreviations that match
const KEY_POSITION_MAP: [string, string[]][] = [
  ['QB', ['QB']],
  ['WR', ['WR']],
  ['RB', ['RB']],
  ['EDGE', ['DE', 'OLB', 'EDGE', 'LOLB', 'ROLB', 'LDE', 'RDE']],
  ['CB', ['CB', 'LCB', 'RCB']],
];
const MAX_KEY_PLAYERS = 4;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}): Promise<Metadata> {
  const { abbreviation } = await params;
  const upper = abbreviation.toUpperCase();
  if (!isTeamAbbreviation(upper)) return { title: 'Team Not Found' };
  const team = teamMap.get(upper);
  if (!team) return { title: 'Team Not Found' };
  return {
    title: `${team.name} — 2026 Draft Capital & Needs`,
    description: `${team.name} draft pick inventory, positional needs, and trade value analysis for the 2026 NFL Draft.`,
  };
}

export function generateStaticParams() {
  return teams.map((t) => ({ abbreviation: t.id }));
}

function buildStatPills(
  position: string,
  stats: Partial<PlayerStatsRecord> | undefined,
): KeyPlayerStat[] {
  if (!stats) return [];
  const pills: KeyPlayerStat[] = [];

  const fmt = (v: unknown) =>
    typeof v === 'number' ? v.toLocaleString() : String(v ?? 0);

  if (position === 'QB') {
    if (stats.passing_yards != null)
      pills.push({ label: 'YDS', value: fmt(stats.passing_yards) });
    if (stats.passing_tds != null)
      pills.push({ label: 'TD', value: fmt(stats.passing_tds) });
    if (stats.passing_interceptions != null)
      pills.push({ label: 'INT', value: fmt(stats.passing_interceptions) });
    if (
      stats.completions != null &&
      stats.attempts != null &&
      stats.attempts > 0
    )
      pills.push({
        label: 'CMP%',
        value: ((stats.completions / stats.attempts) * 100).toFixed(1),
      });
  } else if (position === 'RB') {
    if (stats.rushing_yards != null)
      pills.push({ label: 'YDS', value: fmt(stats.rushing_yards) });
    if (stats.rushing_tds != null)
      pills.push({ label: 'TD', value: fmt(stats.rushing_tds) });
    if (stats.carries != null)
      pills.push({ label: 'CAR', value: fmt(stats.carries) });
  } else if (position === 'WR' || position === 'TE') {
    if (stats.receptions != null)
      pills.push({ label: 'REC', value: fmt(stats.receptions) });
    if (stats.receiving_yards != null)
      pills.push({ label: 'YDS', value: fmt(stats.receiving_yards) });
    if (stats.receiving_tds != null)
      pills.push({ label: 'TD', value: fmt(stats.receiving_tds) });
  } else {
    // Defensive players — show what's available
    if (stats.def_tackles_combined != null)
      pills.push({ label: 'TKL', value: fmt(stats.def_tackles_combined) });
    if (stats.def_sacks != null)
      pills.push({ label: 'SCK', value: fmt(stats.def_sacks) });
    if (stats.def_interceptions != null)
      pills.push({ label: 'INT', value: fmt(stats.def_interceptions) });
    if (stats.def_pass_defended != null)
      pills.push({ label: 'PD', value: fmt(stats.def_pass_defended) });
  }

  return pills.slice(0, 4);
}

function buildKeyPlayers(
  abbr: TeamAbbreviation,
  depthCharts: DepthChartRecord[],
  nflRoster: RosterRecord[],
  seasonStats: PlayerStatsRecord[],
): KeyPlayerCardProps[] {
  const colors = TEAM_COLORS[abbr];

  // Depth chart starters for this team (pos_rank 1 = starter)
  const teamStarters = depthCharts.filter(
    (d) => d.team === abbr && d.pos_rank === 1,
  );

  // Roster entries for player details (jersey, experience, college)
  const rosterByGsis = new Map<string, RosterRecord>();
  for (const r of nflRoster) {
    if (r.team === abbr && r.gsis_id) rosterByGsis.set(r.gsis_id, r);
  }

  const featured: KeyPlayerCardProps[] = [];

  for (const [displayPos, abbrs] of KEY_POSITION_MAP) {
    if (featured.length >= MAX_KEY_PLAYERS) break;

    const starter = teamStarters.find((d) => abbrs.includes(d.pos_abb));
    if (!starter) continue;

    const gsisId = starter.gsis_id ?? '';
    const rosterEntry = gsisId ? rosterByGsis.get(gsisId) : undefined;
    const playerName = starter.player_name ?? rosterEntry?.full_name ?? '';

    // Find season stats — try gsis_id first, fall back to display name match
    let stats: PlayerStatsRecord | undefined = gsisId
      ? seasonStats.find((s) => s.player_id === gsisId)
      : undefined;
    if (!stats && playerName) {
      const nameLower = playerName.toLowerCase();
      stats = seasonStats.find(
        (s) => (s.player_display_name ?? '').toLowerCase() === nameLower,
      );
    }

    featured.push({
      name: playerName || 'Unknown',
      position: displayPos,
      jersey: String(rosterEntry?.jersey_number ?? ''),
      experience: rosterEntry?.years_exp ?? 0,
      college: rosterEntry?.college ?? '',
      teamColors: { primary: colors.primary, secondary: colors.secondary },
      stats: buildStatPills(displayPos, stats),
    });
  }

  return featured;
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}) {
  const { abbreviation } = await params;
  const upper = abbreviation.toUpperCase();
  if (!isTeamAbbreviation(upper)) notFound();
  const abbr = upper;
  const team = teamMap.get(abbr);
  if (!team) notFound();

  const { draftYear, statsYear } = await getCachedSeasonConfig();
  const [slots, teamDocs, roster, seasonStats, nflRoster, depthCharts] =
    await Promise.all([
      getCachedDraftOrderSlots(draftYear),
      getCachedTeamDocs(),
      getCachedRoster(abbr),
      getCachedSeasonStats(statsYear),
      getCachedNflRoster(statsYear),
      getCachedDepthCharts(statsYear),
    ]);

  // Picks this team currently owns
  const ownedPicks: OwnedPick[] = slots
    .filter((s) => (s.teamOverride ?? s.team) === abbr)
    .map((s) => ({
      overall: s.overall,
      round: s.round,
      pick: s.pick,
      value: getPickValue(s.overall),
      originalTeam: s.team,
      isAcquired: s.team !== abbr,
    }));

  // Picks originally theirs but traded away
  const tradedAway: TradedAwayPick[] = slots
    .filter((s) => s.team === abbr && s.teamOverride && s.teamOverride !== abbr)
    .map((s) => ({
      overall: s.overall,
      round: s.round,
      pick: s.pick,
      value: getPickValue(s.overall),
      tradedTo: s.teamOverride!,
    }));

  // Capital ranking across all 32 teams
  const capitalByTeam = new Map<TeamAbbreviation, number>();
  for (const t of teams) capitalByTeam.set(t.id, 0);
  for (const s of slots) {
    const owner = s.teamOverride ?? s.team;
    capitalByTeam.set(
      owner,
      (capitalByTeam.get(owner) ?? 0) + getPickValue(s.overall),
    );
  }
  const capitalRanking: TeamCapitalRank[] = [...capitalByTeam.entries()]
    .map(([t, totalValue]) => ({ team: t, totalValue }))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Future picks for this team
  const teamDoc = teamDocs.find((d) => d.id === abbr);
  const futurePicks: FuturePickSeed[] = teamDoc?.futurePicks ?? [];

  const totalValue = ownedPicks.reduce((sum, p) => sum + p.value, 0);
  const rank = capitalRanking.findIndex((r) => r.team === abbr) + 1;

  // Key players: prefer admin-curated, fall back to auto-detected
  const colors = TEAM_COLORS[abbr];
  const adminKeyPlayers = teamDoc?.keyPlayers;
  let keyPlayers: KeyPlayerCardProps[];
  if (adminKeyPlayers && adminKeyPlayers.length > 0) {
    keyPlayers = adminKeyPlayers.map((kp) => {
      const stats = seasonStats.find((s) => s.player_id === kp.gsisId);
      const merged = kp.statOverrides
        ? { ...stats, ...kp.statOverrides }
        : stats;
      const rosterEntry = nflRoster.find((r) => r.gsis_id === kp.gsisId);
      return {
        name: kp.name,
        position: kp.position,
        jersey: kp.jersey,
        experience: rosterEntry?.years_exp ?? 0,
        college: kp.college,
        teamColors: { primary: colors.primary, secondary: colors.secondary },
        stats: buildStatPills(kp.position, merged),
      };
    });
  } else {
    keyPlayers = buildKeyPlayers(abbr, depthCharts, nflRoster, seasonStats);
  }

  // Coaching staff: Firestore > hardcoded fallback
  const coachingStaff = teamDoc?.coachingStaff ?? coachingStaffs[abbr] ?? [];

  // Front office
  const frontOffice = teamDoc?.frontOffice ?? [];

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <TeamBreakdown
        team={team}
        ownedPicks={ownedPicks}
        tradedAway={tradedAway}
        futurePicks={futurePicks}
        totalValue={totalValue}
        rank={rank}
        capitalRanking={capitalRanking}
        year={draftYear}
        roster={roster}
        keyPlayers={keyPlayers}
        coachingStaff={coachingStaff}
        frontOffice={frontOffice}
      />
    </main>
  );
}
