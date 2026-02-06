import type { Metadata } from 'next';
import type { TeamAbbreviation, DraftSlot } from '@mockingboard/shared';
import { teams, getPickValue } from '@mockingboard/shared';
import { getCachedDraftOrderSlots, getCachedSeasonConfig } from '@/lib/cache';
import { TeamDirectory } from '@/components/team-directory';

export const revalidate = 3600; // 1-hour ISR

export const metadata: Metadata = {
  title: 'NFL Teams — Draft Capital & Needs',
  description:
    'All 32 NFL teams with positional needs, draft pick inventory, and trade value rankings for the 2026 NFL Draft.',
};

/** Compute total draft capital value per team from their owned slots. */
function computeTeamCapital(
  slots: DraftSlot[],
): Map<TeamAbbreviation, { pickCount: number; totalValue: number }> {
  const map = new Map<
    TeamAbbreviation,
    { pickCount: number; totalValue: number }
  >();
  for (const t of teams) {
    map.set(t.id, { pickCount: 0, totalValue: 0 });
  }
  for (const slot of slots) {
    const owner = (slot.teamOverride ?? slot.team) as TeamAbbreviation;
    const entry = map.get(owner);
    if (entry) {
      entry.pickCount += 1;
      entry.totalValue += getPickValue(slot.overall);
    }
  }
  return map;
}

export default async function TeamsPage() {
  const { draftYear } = await getCachedSeasonConfig();
  const slots = await getCachedDraftOrderSlots(draftYear);
  const capitalMap = computeTeamCapital(slots);

  // Serialize to plain object for client component
  const capital: Record<string, { pickCount: number; totalValue: number }> =
    Object.fromEntries(capitalMap);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          NFL Teams
        </h1>
        <p className="mt-2 text-muted-foreground">
          Draft capital, positional needs, and trade value for all 32 teams.
        </p>
      </div>
      <TeamDirectory capital={capital} />
    </main>
  );
}
