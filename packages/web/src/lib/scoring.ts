import type { DraftResultPick } from '@mockingboard/shared';

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
