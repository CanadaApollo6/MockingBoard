import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { TeamAbbreviation, FuturePickSeed } from '@mockingboard/shared';
import {
  teams,
  getPickValue,
  coachingStaffs,
  isTeamAbbreviation,
} from '@mockingboard/shared';
import {
  getCachedDraftOrderSlots,
  getCachedTeamDocs,
  getCachedRoster,
  getCachedSchedule,
  getCachedSeasonConfig,
} from '@/lib/cache';
import { TEAM_COLORS } from '@/lib/team-colors';
import {
  TeamBreakdown,
  type OwnedPick,
  type TradedAwayPick,
  type TeamCapitalRank,
} from '@/components/team-breakdown/team-breakdown';
import type { KeyPlayerCardProps } from '@/components/team-breakdown/key-player-card';

export const revalidate = 3600;

const teamMap = new Map(teams.map((t) => [t.id, t]));

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

  const { draftYear } = await getCachedSeasonConfig();
  const [slots, teamDocs, roster, schedule] = await Promise.all([
    getCachedDraftOrderSlots(draftYear),
    getCachedTeamDocs(),
    getCachedRoster(abbr),
    getCachedSchedule(abbr),
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

  // Key players from admin curation
  const colors = TEAM_COLORS[abbr];
  const adminKeyPlayers = teamDoc?.keyPlayers ?? [];
  const keyPlayers: KeyPlayerCardProps[] = adminKeyPlayers.map((kp) => ({
    name: kp.name,
    position: kp.position,
    jersey: kp.jersey,
    experience: kp.experience ?? 0,
    college: kp.college,
    teamColors: { primary: colors.primary, secondary: colors.secondary },
    stats: kp.stats ?? [],
  }));

  // Coaching staff: Firestore > hardcoded fallback
  const coachingStaff = teamDoc?.coachingStaff ?? coachingStaffs[abbr] ?? [];

  // Front office
  const frontOffice = teamDoc?.frontOffice ?? [];

  // Season overview (admin-curated)
  const seasonOverview = teamDoc?.seasonOverview;

  // Merge admin-curated overrides over seed data
  const resolvedTeam = {
    ...team,
    ...(teamDoc?.needs && { needs: teamDoc.needs }),
    ...(teamDoc?.city && { city: teamDoc.city }),
  };

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <TeamBreakdown
        team={resolvedTeam}
        ownedPicks={ownedPicks}
        tradedAway={tradedAway}
        futurePicks={futurePicks}
        totalValue={totalValue}
        capitalRanking={capitalRanking}
        year={draftYear}
        roster={roster}
        keyPlayers={keyPlayers}
        schedule={schedule}
        coachingStaff={coachingStaff}
        frontOffice={frontOffice}
        seasonOverview={seasonOverview}
      />
    </main>
  );
}
