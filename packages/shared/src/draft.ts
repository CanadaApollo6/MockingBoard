import type {
  Draft,
  DraftSlot,
  FutureDraftPick,
  FuturePickSeed,
  TeamAbbreviation,
} from './types';

/**
 * Get the user ID that controls a pick, considering trades.
 * Returns null if the pick is controlled by CPU.
 *
 * Priority:
 * 1. Check slot.ownerOverride (set by trades)
 * 2. Fall back to teamAssignments[slot.team]
 */
export function getPickController(
  draft: Draft,
  slot: DraftSlot,
): string | null {
  if (slot.ownerOverride !== undefined) {
    return slot.ownerOverride || null;
  }
  return draft.teamAssignments[slot.team] ?? null;
}

/**
 * Filter slots to the requested number of rounds and sort by overall pick.
 * Pure extraction from buildPickOrder (Firestore fetch stays in bot).
 */
export function filterAndSortPickOrder(
  slots: DraftSlot[],
  rounds: number,
): DraftSlot[] {
  return slots
    .filter((s) => s.round <= rounds)
    .sort((a, b) => a.overall - b.overall);
}

/**
 * Build future draft picks from seeded ownership data.
 * Year+1: uses seeded overrides, fills defaults for rounds 1-3.
 * Year+2: defaults all teams to owning their own rounds 1-3.
 *
 * Pure extraction from buildFuturePicks (Firestore fetch stays in bot).
 */
export function buildFuturePicksFromSeeds(
  draftYear: number,
  teamIds: TeamAbbreviation[],
  seededPicksByTeam: Record<string, FuturePickSeed[] | undefined>,
): FutureDraftPick[] {
  const futurePicks: FutureDraftPick[] = [];
  const year1 = draftYear + 1;
  const year2 = draftYear + 2;

  // Year+1: use seeded data if available
  const covered = new Set<string>();

  for (const [teamId, seedPicks] of Object.entries(seededPicksByTeam)) {
    if (!seedPicks) continue;
    for (const pick of seedPicks) {
      if (pick.year !== year1) continue;
      futurePicks.push({
        year: pick.year,
        round: pick.round,
        originalTeam: pick.originalTeam,
        ownerTeam: teamId as TeamAbbreviation,
      });
      covered.add(`${pick.originalTeam}:${pick.round}`);
    }
  }

  // Fill in defaults for year+1 (rounds 1-3)
  for (const teamId of teamIds) {
    for (let round = 1; round <= 3; round++) {
      if (!covered.has(`${teamId}:${round}`)) {
        futurePicks.push({
          year: year1,
          round,
          originalTeam: teamId,
          ownerTeam: teamId,
        });
      }
    }
  }

  // Year+2: default rounds 1-3 for all teams
  for (const teamId of teamIds) {
    for (let round = 1; round <= 3; round++) {
      futurePicks.push({
        year: year2,
        round,
        originalTeam: teamId,
        ownerTeam: teamId,
      });
    }
  }

  return futurePicks;
}

/**
 * Calculate the next draft state after a pick is made.
 * Pure extraction from recordPickAndAdvance (Firestore transaction stays in bot).
 */
export function calculatePickAdvancement(draft: Draft): {
  nextPick: number;
  nextRound: number;
  isComplete: boolean;
} {
  const nextPick = draft.currentPick + 1;
  const isComplete = nextPick > draft.pickOrder.length;
  const nextSlot = isComplete ? null : draft.pickOrder[nextPick - 1];
  const nextRound = nextSlot?.round ?? draft.currentRound;

  return { nextPick, nextRound, isComplete };
}
