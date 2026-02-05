import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { TeamAbbreviation, FuturePickSeed } from '@mockingboard/shared';
import { teams, getPickValue } from '@mockingboard/shared';
import {
  getCachedDraftOrderSlots,
  getCachedTeamDocs,
  getCachedRoster,
} from '@/lib/cache';
import {
  TeamBreakdown,
  type OwnedPick,
  type TradedAwayPick,
  type TeamCapitalRank,
} from '@/components/team-breakdown';

const CURRENT_YEAR = 2026;

export const revalidate = 3600;

const teamMap = new Map(teams.map((t) => [t.id, t]));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbreviation: string }>;
}): Promise<Metadata> {
  const { abbreviation } = await params;
  const team = teamMap.get(abbreviation.toUpperCase() as TeamAbbreviation);
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
  const abbr = abbreviation.toUpperCase() as TeamAbbreviation;
  const team = teamMap.get(abbr);
  if (!team) notFound();

  const [slots, teamDocs, roster] = await Promise.all([
    getCachedDraftOrderSlots(CURRENT_YEAR),
    getCachedTeamDocs(),
    getCachedRoster(abbr),
  ]);

  // Picks this team currently owns
  const ownedPicks: OwnedPick[] = slots
    .filter((s) => ((s.teamOverride ?? s.team) as TeamAbbreviation) === abbr)
    .map((s) => ({
      overall: s.overall,
      round: s.round,
      pick: s.pick,
      value: getPickValue(s.overall),
      originalTeam: s.team as TeamAbbreviation,
      isAcquired: s.team !== abbr,
    }));

  // Picks originally theirs but traded away
  const tradedAway: TradedAwayPick[] = slots
    .filter(
      (s) =>
        (s.team as TeamAbbreviation) === abbr &&
        s.teamOverride &&
        s.teamOverride !== abbr,
    )
    .map((s) => ({
      overall: s.overall,
      round: s.round,
      pick: s.pick,
      value: getPickValue(s.overall),
      tradedTo: s.teamOverride as TeamAbbreviation,
    }));

  // Capital ranking across all 32 teams
  const capitalByTeam = new Map<TeamAbbreviation, number>();
  for (const t of teams) capitalByTeam.set(t.id, 0);
  for (const s of slots) {
    const owner = (s.teamOverride ?? s.team) as TeamAbbreviation;
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
        year={CURRENT_YEAR}
        roster={roster}
      />
    </main>
  );
}
