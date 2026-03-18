import type { DraftResultPick, Player } from '@mockingboard/shared';

export interface PickScore {
  overall: number;
  playerPicked: string;
  actualPlayer: string;
  teamMatch: boolean;
  playerMatch: boolean;
  positionMatch: boolean;
  roundAccuracy: number;
  score: number;
}

/**
 * Score a single mock draft pick against actual results.
 * Max score per pick: 100
 * - Team match at slot: +30
 * - Exact player match: +40
 * - Position match at slot: +15
 * - Round accuracy: +15 (exact=15, 1 round off=10, 2=5, 3+=0)
 */
export function scoreMockPick(
  mockPlayerName: string,
  mockTeam: string,
  mockPosition: string,
  mockOverall: number,
  actualResults: DraftResultPick[],
): PickScore {
  const actual = actualResults.find((r) => r.overall === mockOverall);
  if (!actual) {
    return {
      overall: mockOverall,
      playerPicked: mockPlayerName,
      actualPlayer: '—',
      teamMatch: false,
      playerMatch: false,
      positionMatch: false,
      roundAccuracy: 0,
      score: 0,
    };
  }

  const teamMatch = mockTeam === actual.team;
  const playerMatch =
    mockPlayerName.toLowerCase().trim() ===
    actual.playerName.toLowerCase().trim();
  const positionMatch = mockPosition === actual.position;

  // Check round accuracy — did the player actually go in a similar round?
  const actualPick = actualResults.find(
    (r) =>
      r.playerName.toLowerCase().trim() === mockPlayerName.toLowerCase().trim(),
  );
  let roundAccuracy = 0;
  if (actualPick) {
    const mockRound = Math.ceil(mockOverall / 32);
    const diff = Math.abs(actualPick.round - mockRound);
    if (diff === 0) roundAccuracy = 15;
    else if (diff === 1) roundAccuracy = 10;
    else if (diff === 2) roundAccuracy = 5;
  }

  const score =
    (teamMatch ? 30 : 0) +
    (playerMatch ? 40 : 0) +
    (positionMatch ? 15 : 0) +
    roundAccuracy;

  return {
    overall: mockOverall,
    playerPicked: mockPlayerName,
    actualPlayer: actual.playerName,
    teamMatch,
    playerMatch,
    positionMatch,
    roundAccuracy,
    score,
  };
}

export interface DraftScoreResult {
  pickScores: PickScore[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

/** Aggregate scores for a complete mock draft. */
export function aggregateDraftScore(pickScores: PickScore[]): DraftScoreResult {
  const totalScore = pickScores.reduce((sum, p) => sum + p.score, 0);
  const maxScore = pickScores.length * 100;
  return {
    pickScores,
    totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
  };
}

// ---- Board Accuracy Scoring ----

const MIN_MATCHED_PLAYERS = 10;
const DELTA_MULTIPLIER = 1.5;

export interface PlayerDelta {
  playerId: string;
  playerName: string;
  boardRank: number;
  actualPick: number;
  delta: number;
}

export interface BoardScoreResult {
  matchedPlayers: number;
  avgDelta: number;
  percentage: number;
  playerDeltas: PlayerDelta[];
}

/**
 * Score a big board's rankings against actual draft results.
 * Compares board rank position vs actual overall pick for each player.
 * Returns null if fewer than 10 players matched (not enough signal).
 */
export function scoreBoardAccuracy(
  rankings: string[],
  actualResults: DraftResultPick[],
  playerMap: Map<string, Player>,
): BoardScoreResult | null {
  const actualByName = new Map<string, DraftResultPick>();
  for (const pick of actualResults) {
    actualByName.set(pick.playerName.toLowerCase().trim(), pick);
  }

  const playerDeltas: PlayerDelta[] = [];

  for (let i = 0; i < rankings.length; i++) {
    const player = playerMap.get(rankings[i]);
    if (!player) continue;

    const actual = actualByName.get(player.name.toLowerCase().trim());
    if (!actual) continue;

    const boardRank = i + 1;
    const delta = Math.abs(boardRank - actual.overall);

    playerDeltas.push({
      playerId: rankings[i],
      playerName: player.name,
      boardRank,
      actualPick: actual.overall,
      delta,
    });
  }

  if (playerDeltas.length < MIN_MATCHED_PLAYERS) return null;

  const avgDelta =
    playerDeltas.reduce((sum, d) => sum + d.delta, 0) / playerDeltas.length;
  const percentage = Math.max(0, Math.round(100 - avgDelta * DELTA_MULTIPLIER));

  return {
    matchedPlayers: playerDeltas.length,
    avgDelta,
    percentage,
    playerDeltas,
  };
}

// ---- Accuracy Badges ----

export type AccuracyBadgeTier = 'diamond' | 'gold' | 'silver' | 'bronze';

export interface AccuracyBadgeInfo {
  tier: AccuracyBadgeTier;
  label: string;
  color: string;
}

const BADGE_TIERS: {
  min: number;
  tier: AccuracyBadgeTier;
  label: string;
  color: string;
}[] = [
  { min: 80, tier: 'diamond', label: 'Diamond', color: 'text-cyan-400' },
  { min: 65, tier: 'gold', label: 'Gold', color: 'text-yellow-500' },
  { min: 50, tier: 'silver', label: 'Silver', color: 'text-gray-400' },
  { min: 35, tier: 'bronze', label: 'Bronze', color: 'text-amber-700' },
];

export function getAccuracyBadge(score: number): AccuracyBadgeInfo | null {
  for (const { min, tier, label, color } of BADGE_TIERS) {
    if (score >= min) return { tier, label, color };
  }
  return null;
}
