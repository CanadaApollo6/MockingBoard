import type { Player, Position, TeamAbbreviation, DraftSlot } from './types';

export const CPU_PICK_WEIGHTS = { TOP: 0.7, MID: 0.9 } as const;

/** Need-priority multipliers: lower = bigger boost. Index 0 = #1 need. */
export const NEED_MULTIPLIERS = [0.85, 0.9, 0.93, 0.96, 0.98] as const;

export function selectCpuPick(
  availablePlayers: Player[],
  teamNeeds: Position[],
): Player {
  if (availablePlayers.length === 0) {
    throw new Error('No available players');
  }

  const scored = availablePlayers.map((player) => {
    const needIndex = teamNeeds.indexOf(player.position);
    const multiplier =
      needIndex === -1
        ? 1.0
        : NEED_MULTIPLIERS[Math.min(needIndex, NEED_MULTIPLIERS.length - 1)];
    return { player, score: player.consensusRank * multiplier };
  });

  scored.sort((a, b) => a.score - b.score);

  const roll = Math.random();
  if (roll < CPU_PICK_WEIGHTS.TOP || scored.length === 1)
    return scored[0].player;
  if (roll < CPU_PICK_WEIGHTS.MID || scored.length === 2)
    return scored[1].player;
  return scored[2].player;
}

/**
 * Remove positions already drafted by a team from their static needs list.
 * Each drafted position removes one occurrence (in case of duplicates).
 */
export function getEffectiveNeeds(
  staticNeeds: Position[],
  draftedPositions: Position[],
): Position[] {
  const remaining = [...staticNeeds];
  for (const pos of draftedPositions) {
    const idx = remaining.indexOf(pos);
    if (idx !== -1) remaining.splice(idx, 1);
  }
  return remaining;
}

/**
 * Determine which positions a team has already drafted in this draft.
 */
export function getTeamDraftedPositions(
  pickOrder: DraftSlot[],
  pickedPlayerIds: string[],
  team: TeamAbbreviation,
  playerMap: Map<string, Player>,
): Position[] {
  const positions: Position[] = [];
  for (let i = 0; i < pickedPlayerIds.length; i++) {
    const slot = pickOrder[i];
    if (!slot || slot.team !== team) continue;
    const player = playerMap.get(pickedPlayerIds[i]);
    if (player) positions.push(player.position);
  }
  return positions;
}
