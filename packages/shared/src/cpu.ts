import type { Player, Position, TeamAbbreviation, DraftSlot } from './types';
import { teamSeeds } from './data/teams';

export const CPU_PICK_WEIGHTS = { TOP: 0.7, MID: 0.9 } as const;

/** Need-priority multipliers: lower = bigger boost. Index 0 = #1 need. */
export const NEED_MULTIPLIERS = [0.85, 0.9, 0.93, 0.96, 0.98] as const;

export interface CpuPickOptions {
  /** 0.0 = fully deterministic, 1.0 = maximum randomness. Default: 0.5 */
  randomness?: number;
  /** 0.0 = pure BPA, 1.0 = heavily needs-based. Default: 0.5 */
  needsWeight?: number;
  /** Player IDs ordered by user's big board. When provided, board index is used
   *  as the ranking instead of consensusRank. Players not on the board fall back
   *  to consensusRank. */
  boardRankings?: string[];
  /** Positional value multipliers from analytics engine. When provided, premium
   *  positions (QB, EDGE, etc.) get a subtle scoring boost. Pass POSITIONAL_VALUE
   *  from draft-analytics. */
  positionalWeights?: Partial<Record<Position, number>>;
}

/** Max need multipliers at needsWeight=1. Calibrated so 0.5 reproduces NEED_MULTIPLIERS. */
const MAX_NEED_MULTS = [0.7, 0.8, 0.86, 0.92, 0.96] as const;

/** Cumulative probability thresholds for top-5 selection at randomness=1. */
const WILD_THRESHOLDS = [0.4, 0.65, 0.83, 0.93, 1.0] as const;

function needMultiplier(needIndex: number, needsWeight: number): number {
  if (needIndex === -1) return 1.0;
  const i = Math.min(needIndex, MAX_NEED_MULTS.length - 1);
  return 1.0 - needsWeight * (1.0 - MAX_NEED_MULTS[i]);
}

export function selectCpuPick(
  availablePlayers: Player[],
  teamNeeds: Position[],
  options?: CpuPickOptions,
): Player {
  if (availablePlayers.length === 0) {
    throw new Error('No available players');
  }

  const r = options?.randomness ?? 0.5;
  const nw = options?.needsWeight ?? 0.5;

  const boardRankings = options?.boardRankings;
  const positionalWeights = options?.positionalWeights;

  const scored = availablePlayers.map((player) => {
    const ni = teamNeeds.indexOf(player.position);
    const mult = needMultiplier(ni, nw);
    // Use board ranking if provided; fall back to consensusRank for unlisted players
    const rank = boardRankings
      ? boardRankings.indexOf(player.id) + 1 || player.consensusRank
      : player.consensusRank;
    // Positional value: fourth-root scaling so premium positions get a subtle boost
    const posWeight = positionalWeights?.[player.position] ?? 1.0;
    const posFactor = posWeight > 0 ? 1 / Math.pow(posWeight, 0.25) : 1.0;
    const base = rank * mult * posFactor;
    const jitter = r > 0 ? (Math.random() - 0.5) * rank * r * 0.2 : 0;
    return { player, score: base + jitter };
  });

  scored.sort((a, b) => a.score - b.score);

  // Interpolated pick selection: wider candidate pool at higher randomness,
  // but damped when the top pick has a dominant score gap over alternatives.
  // Gap ratio: how much worse #2 is relative to #1 (0 = identical, 1+ = dominant).
  const gapDamp =
    scored.length >= 2 && scored[0].score > 0
      ? Math.min((scored[1].score - scored[0].score) / scored[0].score, 2) / 2
      : 1;
  // effectiveR shrinks toward 0 when the gap is large (dominant #1)
  const effectiveR = r * (1 - gapDamp);

  const roll = Math.random();
  for (let i = 0; i < WILD_THRESHOLDS.length && i < scored.length; i++) {
    const threshold = 1.0 - effectiveR * (1.0 - WILD_THRESHOLDS[i]);
    if (roll < threshold || i === scored.length - 1) {
      return scored[i].player;
    }
  }

  return scored[0].player;
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

/**
 * Full CPU pick pipeline: resolve team needs, compute effective needs,
 * and select a player. Consolidates the 10-line pattern repeated across
 * bot, web, and guest draft code paths.
 */
export interface CpuPickContext {
  team: TeamAbbreviation;
  pickOrder: DraftSlot[];
  pickedPlayerIds: string[];
  playerMap: Map<string, Player>;
  available: Player[];
  options?: CpuPickOptions;
}

export function prepareCpuPick(ctx: CpuPickContext): Player {
  const teamSeed = teamSeeds.get(ctx.team);
  const draftedPositions = getTeamDraftedPositions(
    ctx.pickOrder,
    ctx.pickedPlayerIds,
    ctx.team,
    ctx.playerMap,
  );
  const effectiveNeeds = getEffectiveNeeds(
    teamSeed?.needs ?? [],
    draftedPositions,
  );
  return selectCpuPick(ctx.available, effectiveNeeds, ctx.options);
}
