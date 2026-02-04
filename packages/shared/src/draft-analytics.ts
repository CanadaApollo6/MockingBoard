/**
 * Draft Analytics Engine
 *
 * Research-backed draft grading calibrated against:
 * - Massey & Thaler "The Loser's Curse" (Wharton)
 * - Baldwin (Open Source Football) surplus value curves
 * - Over The Cap positional value indices
 * - PFF Pro-Adjusted WAA (PAWAA)
 * - Unexpected Points positional surplus tiers
 */

import type {
  Position,
  TeamAbbreviation,
  Pick,
  Player,
  Draft,
  Trade,
  PickGrade,
  PickLabel,
  TeamDraftGrade,
  DraftRecap,
  TradeAnalysis,
  OptimalPick,
  SuggestedPick,
} from './types';
import { getPickValue, getFuturePickValue } from './tradeValues';
import { getEffectiveNeeds } from './cpu';

// --- Positional Value Model ---
// Scale: 1.0 = league-average positional value.
// Synthesized from OTC veteran/elite indices, PFF PAWAA, Unexpected Points
// surplus tiers, and Massey/Thaler performance ordering.

export const POSITIONAL_VALUE: Record<Position, number> = {
  QB: 2.5,
  EDGE: 1.3,
  OT: 1.25,
  WR: 1.2,
  CB: 1.15,
  DL: 1.05,
  S: 0.85,
  LB: 0.85,
  TE: 0.75,
  OG: 0.75,
  C: 0.7,
  RB: 0.55,
  K: 0.2,
  P: 0.2,
  LS: 0.1,
};

// --- Surplus Value Curve ---
// Calibrated against Baldwin's empirical data (opensourcefootball.com).
// Surplus peaks at pick ~12, NOT pick 1, because rookie compensation drops
// faster than on-field value in the early picks.

export function baseSurplusValue(pick: number): number {
  if (pick <= 0) return 0;
  // Phase 1 (picks 1–12): surplus rises as compensation drops faster than value
  if (pick <= 12) {
    return 63 + 37 * (1 - Math.pow((12 - pick) / 11, 1.5));
  }
  // Phase 2 (picks 13+): power-law decay
  return 100 * Math.pow(12 / pick, 0.6);
}

export function positionAdjustedSurplus(
  pick: number,
  position: Position,
): number {
  return baseSurplusValue(pick) * (POSITIONAL_VALUE[position] ?? 1.0);
}

// --- Pick Classification ---
// Thresholds adapt to draft position. "Fair" is the widest band because
// Massey/Thaler showed 52% accuracy is the baseline.

export function classifyPick(valueDelta: number, overall: number): PickLabel {
  const threshold = Math.max(3, overall * 0.08);
  if (valueDelta >= threshold * 2) return 'great-value';
  if (valueDelta >= threshold) return 'good-value';
  if (valueDelta >= -threshold) return 'fair';
  if (valueDelta >= -threshold * 2) return 'slight-reach';
  if (valueDelta >= -threshold * 3) return 'reach';
  return 'big-reach';
}

// --- Grade Tiers ---

const GRADE_TIERS: readonly { min: number; label: string }[] = [
  { min: 90, label: 'Elite' },
  { min: 80, label: 'Pro Bowl' },
  { min: 70, label: 'Starter' },
  { min: 60, label: 'Solid' },
  { min: 50, label: 'Average' },
  { min: 40, label: 'Below Average' },
  { min: 30, label: 'Practice Squad' },
  { min: 0, label: 'Undrafted' },
];

export function getGradeTier(grade: number): string {
  for (const tier of GRADE_TIERS) {
    if (grade >= tier.min) return tier.label;
  }
  return 'Undrafted';
}

// --- Helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// --- Individual Pick Grading ---
// Composite score from four dimensions:
//   Base: 50 pts (neutral)
//   Value: ±20 pts (consensus rank vs pick slot)
//   Positional value: ±15 pts (premium position at premium slot)
//   Need: 0 to +15 pts (fills team need)

function scoreValueDimension(valueDelta: number, overall: number): number {
  const threshold = Math.max(3, overall * 0.08);
  return clamp((valueDelta / (threshold * 3)) * 20, -20, 20);
}

function scorePositionalDimension(position: Position, overall: number): number {
  const multiplier = POSITIONAL_VALUE[position] ?? 1.0;
  // Full weight through pick 128, then decays — positional premium
  // matters most when draft capital is expensive
  const slotWeight = Math.max(0, 1 - (overall - 1) / 127);
  return clamp((multiplier - 1.0) * slotWeight * 15, -15, 15);
}

const NEED_REWARDS = [15, 12, 9, 6, 3] as const;

function scoreNeedDimension(needIndex: number): number {
  if (needIndex < 0) return 0;
  return NEED_REWARDS[Math.min(needIndex, NEED_REWARDS.length - 1)] ?? 0;
}

export function gradePick(
  pick: Pick,
  player: Player,
  teamNeeds: Position[],
  availablePlayers: Player[],
  boardRankings?: string[],
): PickGrade {
  const valueDelta = pick.overall - player.consensusRank;
  const needIndex = teamNeeds.indexOf(player.position);
  const multiplier = POSITIONAL_VALUE[player.position] ?? 1.0;

  const pickScore = clamp(
    Math.round(
      50 +
        scoreValueDimension(valueDelta, pick.overall) +
        scorePositionalDimension(player.position, pick.overall) +
        scoreNeedDimension(needIndex),
    ),
    0,
    100,
  );

  const label = classifyPick(valueDelta, pick.overall);

  const hadBetterAlternative =
    availablePlayers.length > 0 &&
    availablePlayers.some(
      (p) => p.id !== player.id && p.consensusRank < player.consensusRank,
    );

  let boardDelta: number | undefined;
  if (boardRankings) {
    const boardIndex = boardRankings.indexOf(player.id);
    if (boardIndex !== -1) {
      boardDelta = boardIndex + 1 - pick.overall;
    }
  }

  return {
    overall: pick.overall,
    playerId: player.id,
    position: player.position,
    consensusRank: player.consensusRank,
    valueDelta,
    pickScore,
    label,
    needIndex,
    hadBetterAlternative,
    surplusValue: positionAdjustedSurplus(pick.overall, player.position),
    positionalMultiplier: multiplier,
    boardDelta,
  };
}

// --- Team Draft Grading ---
// Five weighted dimensions → overall 0-100 grade.

export function gradeTeamDraft(
  team: TeamAbbreviation,
  teamPicks: PickGrade[],
  teamNeeds: Position[],
  allTeamSurpluses: number[],
  tradeNetValue: number,
): TeamDraftGrade {
  if (teamPicks.length === 0) {
    return {
      team,
      overallGrade: 50,
      tier: 'Average',
      picks: [],
      scores: {
        value: 50,
        positionalValue: 50,
        surplusValue: 50,
        needs: 50,
        bpaAdherence: 50,
      },
      tradeNetValue,
      needsFilled: 0,
      totalNeeds: teamNeeds.length,
      highlights: [],
    };
  }

  // Value: average pick score (already 0-100)
  const valueScore =
    teamPicks.reduce((sum, p) => sum + p.pickScore, 0) / teamPicks.length;

  // Positional value: how well premium capital was used on premium positions
  const avgPosContrib =
    teamPicks.reduce((sum, p) => {
      const slotWeight = Math.max(0, 1 - (p.overall - 1) / 127);
      return sum + (p.positionalMultiplier - 1.0) * slotWeight;
    }, 0) / teamPicks.length;
  const positionalScore = clamp(50 + avgPosContrib * 50, 0, 100);

  // Surplus value: team total vs class average (Baldwin curve)
  const teamSurplus = teamPicks.reduce((sum, p) => sum + p.surplusValue, 0);
  const classMean =
    allTeamSurpluses.length > 0
      ? allTeamSurpluses.reduce((a, b) => a + b, 0) / allTeamSurpluses.length
      : teamSurplus;
  const surplusScore =
    classMean > 0 ? clamp((teamSurplus / classMean) * 50, 0, 100) : 50;

  // Needs: fraction of team needs addressed
  const filledPositions = new Set(teamPicks.map((p) => p.position));
  const needsFilled = teamNeeds.filter((n) => filledPositions.has(n)).length;
  const needsScore =
    teamNeeds.length > 0 ? (needsFilled / teamNeeds.length) * 100 : 50;

  // BPA adherence: penalize reaches relative to draft slot
  const bpaScore =
    teamPicks.reduce((sum, p) => {
      const reachPenalty =
        p.valueDelta < 0
          ? Math.min(1, Math.abs(p.valueDelta) / Math.max(3, p.overall * 0.24))
          : 0;
      return sum + (1 - reachPenalty) * 100;
    }, 0) / teamPicks.length;

  const scores = {
    value: Math.round(valueScore),
    positionalValue: Math.round(positionalScore),
    surplusValue: Math.round(surplusScore),
    needs: Math.round(needsScore),
    bpaAdherence: Math.round(bpaScore),
  };

  const overallGrade = Math.round(
    scores.value * 0.3 +
      scores.positionalValue * 0.2 +
      scores.surplusValue * 0.15 +
      scores.needs * 0.2 +
      scores.bpaAdherence * 0.15,
  );

  const tier = getGradeTier(overallGrade);
  const highlights = generateHighlights(
    teamPicks,
    needsFilled,
    teamNeeds.length,
  );

  return {
    team,
    overallGrade,
    tier,
    picks: teamPicks,
    scores,
    tradeNetValue,
    needsFilled,
    totalNeeds: teamNeeds.length,
    highlights,
  };
}

function generateHighlights(
  picks: PickGrade[],
  needsFilled: number,
  totalNeeds: number,
): string[] {
  const highlights: string[] = [];

  const steals = picks.filter(
    (p) => p.label === 'great-value' || p.label === 'good-value',
  );
  for (const s of steals.slice(0, 2)) {
    highlights.push(`Steal: pick #${s.overall} (ranked #${s.consensusRank})`);
  }

  const reaches = picks.filter(
    (p) => p.label === 'big-reach' || p.label === 'reach',
  );
  for (const r of reaches.slice(0, 2)) {
    highlights.push(`Reach: pick #${r.overall} (ranked #${r.consensusRank})`);
  }

  if (totalNeeds > 0) {
    highlights.push(`Filled ${needsFilled}/${totalNeeds} needs`);
  }

  return highlights;
}

// --- Trade Analysis ---

function sumTradePieceValues(
  pieces: Trade['proposerGives'],
  draftYear: number,
): number {
  return pieces.reduce((sum, piece) => {
    if (piece.type === 'current-pick' && piece.overall) {
      return sum + getPickValue(piece.overall);
    }
    if (piece.type === 'future-pick' && piece.round && piece.year) {
      return (
        sum +
        getFuturePickValue(piece.round, Math.max(1, piece.year - draftYear))
      );
    }
    return sum;
  }, 0);
}

function analyzeTradesForTeam(
  team: TeamAbbreviation,
  trades: Trade[],
  draftYear: number,
): number {
  let netValue = 0;
  for (const trade of trades) {
    if (trade.status !== 'accepted') continue;
    if (trade.proposerTeam !== team && trade.recipientTeam !== team) continue;

    const isProposer = trade.proposerTeam === team;
    const gives = isProposer ? trade.proposerGives : trade.proposerReceives;
    const receives = isProposer ? trade.proposerReceives : trade.proposerGives;

    netValue +=
      sumTradePieceValues(receives, draftYear) -
      sumTradePieceValues(gives, draftYear);
  }
  return netValue;
}

export function analyzeAllTrades(
  trades: Trade[],
  draftYear: number,
): TradeAnalysis[] {
  return trades
    .filter((t) => t.status === 'accepted')
    .map((trade) => {
      const proposerGiveValue = sumTradePieceValues(
        trade.proposerGives,
        draftYear,
      );
      const proposerReceiveValue = sumTradePieceValues(
        trade.proposerReceives,
        draftYear,
      );

      const proposerNet = proposerReceiveValue - proposerGiveValue;
      const recipientNet = -proposerNet;

      const threshold =
        Math.max(proposerGiveValue, proposerReceiveValue) * 0.05;
      let winner: TeamAbbreviation | 'even';
      if (Math.abs(proposerNet) <= threshold) {
        winner = 'even';
      } else {
        winner = proposerNet > 0 ? trade.proposerTeam : trade.recipientTeam;
      }

      return {
        tradeId: trade.id,
        proposerTeam: trade.proposerTeam,
        recipientTeam: trade.recipientTeam,
        proposerNetValue: Math.round(proposerNet * 10) / 10,
        recipientNetValue: Math.round(recipientNet * 10) / 10,
        winner,
      };
    });
}

// --- Optimal BPA Baseline ---
// At each actual pick slot, records who the BPA was (given the actual
// prior picks). Shows divergences from strict best-player-available.

export function computeOptimalBaseline(
  picks: Pick[],
  players: Record<string, Player>,
): OptimalPick[] {
  const sorted = [...picks].sort((a, b) => a.overall - b.overall);
  const pickedIds = new Set<string>();
  const allPlayersSorted = Object.values(players).sort(
    (a, b) => a.consensusRank - b.consensusRank,
  );

  return sorted.map((pick) => {
    const actualPlayer = players[pick.playerId];
    const optimalPlayer = allPlayersSorted.find((p) => !pickedIds.has(p.id));
    pickedIds.add(pick.playerId);

    return {
      overall: pick.overall,
      actualPlayerId: pick.playerId,
      optimalPlayerId: optimalPlayer?.id ?? pick.playerId,
      actualRank: actualPlayer?.consensusRank ?? pick.overall,
      optimalRank: optimalPlayer?.consensusRank ?? pick.overall,
    };
  });
}

// --- Main Entry Point ---

export function generateDraftRecap(
  draft: Draft,
  picks: Pick[],
  players: Record<string, Player>,
  teamNeeds: Map<TeamAbbreviation, Position[]>,
  trades: Trade[],
  boardRankings?: string[],
): DraftRecap {
  const sorted = [...picks].sort((a, b) => a.overall - b.overall);
  const pickedIds = new Set<string>();
  const allPlayers = Object.values(players);

  // Grade each pick, tracking per-team for effective needs computation
  const pickGradesByTeam = new Map<TeamAbbreviation, PickGrade[]>();

  for (const pick of sorted) {
    const player = players[pick.playerId];
    if (!player) continue;

    const available = allPlayers.filter((p) => !pickedIds.has(p.id));
    const staticNeeds = teamNeeds.get(pick.team) ?? [];

    // Effective needs: static needs minus already-drafted positions
    const priorGrades = pickGradesByTeam.get(pick.team) ?? [];
    const draftedPositions = priorGrades.map((pg) => pg.position);
    const effectiveNeeds = getEffectiveNeeds(staticNeeds, draftedPositions);

    const grade = gradePick(
      pick,
      player,
      effectiveNeeds,
      available,
      boardRankings,
    );

    const grades = pickGradesByTeam.get(pick.team) ?? [];
    grades.push(grade);
    pickGradesByTeam.set(pick.team, grades);

    pickedIds.add(pick.playerId);
  }

  // Surplus totals per team (for cross-team normalization)
  const allTeamSurpluses: number[] = [];
  for (const grades of pickGradesByTeam.values()) {
    allTeamSurpluses.push(grades.reduce((sum, p) => sum + p.surplusValue, 0));
  }

  // Grade each team
  const draftYear = draft.config.year;
  const teamGrades: TeamDraftGrade[] = [];

  for (const [team, teamPickGrades] of pickGradesByTeam) {
    const needs = teamNeeds.get(team) ?? [];
    const tradeNet = analyzeTradesForTeam(team, trades, draftYear);
    teamGrades.push(
      gradeTeamDraft(team, teamPickGrades, needs, allTeamSurpluses, tradeNet),
    );
  }

  teamGrades.sort((a, b) => b.overallGrade - a.overallGrade);

  const overallClassGrade =
    teamGrades.length > 0
      ? Math.round(
          teamGrades.reduce((sum, t) => sum + t.overallGrade, 0) /
            teamGrades.length,
        )
      : 50;

  return {
    draftId: draft.id,
    teamGrades,
    overallClassGrade,
    tradeAnalysis: analyzeAllTrades(trades, draftYear),
    optimalComparison: computeOptimalBaseline(picks, players),
  };
}

// --- Pick Suggestion ---

/**
 * Compute the best analytics-scored pick suggestion for the current slot.
 * Reuses the same scoring dimensions as gradePick but weighted for
 * pre-pick advisory (stronger value emphasis, surplus-aware positional scoring).
 */
export function suggestPick(
  availablePlayers: Player[],
  teamNeeds: Position[],
  pickOverall: number,
  boardRankings?: string[],
): SuggestedPick | null {
  if (availablePlayers.length === 0) return null;

  const threshold = Math.max(3, pickOverall * 0.08);
  const slotWeight = Math.max(0, 1 - (pickOverall - 1) / 127);

  let best: SuggestedPick | null = null;

  for (const player of availablePlayers) {
    const rank = boardRankings
      ? boardRankings.indexOf(player.id) + 1 || player.consensusRank
      : player.consensusRank;

    const valueDelta = pickOverall - rank;
    const valueScore = clamp((valueDelta / (threshold * 3)) * 35, -35, 35);

    const posMultiplier = POSITIONAL_VALUE[player.position] ?? 1.0;
    const posScore = (posMultiplier - 1.0) * slotWeight * 15;

    const needIndex = teamNeeds.indexOf(player.position);
    const needScore =
      needIndex >= 0
        ? (NEED_REWARDS[Math.min(needIndex, NEED_REWARDS.length - 1)] ?? 0)
        : 0;

    const total = Math.round(50 + valueScore + posScore + needScore);

    if (!best || total > best.score) {
      let reason: string;
      if (needScore >= valueScore && needScore >= posScore && needIndex >= 0) {
        reason = `Fills #${needIndex + 1} need at ${player.position}`;
      } else if (posScore >= valueScore && posScore > 0) {
        reason = `Premium ${player.position} at a value slot`;
      } else {
        reason = `BPA \u2014 ranked #${rank}`;
      }
      best = { playerId: player.id, score: total, reason };
    }
  }

  return best;
}
