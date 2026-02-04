import type {
  Player,
  Pick,
  Draft,
  Trade,
  Position,
  TeamAbbreviation,
  FirestoreTimestamp,
} from './types';
import {
  POSITIONAL_VALUE,
  baseSurplusValue,
  positionAdjustedSurplus,
  classifyPick,
  getGradeTier,
  gradePick,
  gradeTeamDraft,
  generateDraftRecap,
  computeOptimalBaseline,
  analyzeAllTrades,
  suggestPick,
} from './draft-analytics';

const TS: FirestoreTimestamp = { seconds: 0, nanoseconds: 0 };

function makePlayer(
  overrides: Partial<Player> & { consensusRank: number },
): Player {
  return {
    id: `player-${overrides.consensusRank}`,
    name: `Player ${overrides.consensusRank}`,
    position: 'WR',
    school: 'Test U',
    year: 2025,
    updatedAt: TS,
    ...overrides,
  };
}

function makePick(
  overall: number,
  playerId: string,
  team: TeamAbbreviation = 'ARI',
): Pick {
  return {
    id: `pick-${overall}`,
    draftId: 'draft-1',
    overall,
    round: Math.ceil(overall / 32),
    pick: ((overall - 1) % 32) + 1,
    team,
    userId: null,
    playerId,
    createdAt: TS,
  };
}

function makeDraft(overrides?: Partial<Draft>): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    createdAt: TS,
    updatedAt: TS,
    config: {
      rounds: 7,
      secondsPerPick: 0,
      format: 'full',
      year: 2025,
      teamAssignmentMode: 'random',
      cpuSpeed: 'instant',
      tradesEnabled: true,
    },
    status: 'complete',
    currentPick: 1,
    currentRound: 1,
    platform: 'web',
    teamAssignments: {} as Draft['teamAssignments'],
    participants: {},
    pickOrder: [],
    pickedPlayerIds: [],
    ...overrides,
  };
}

// ============================================================
// Positional Value Model
// ============================================================

describe('POSITIONAL_VALUE', () => {
  it('has a value for every Position', () => {
    const positions: Position[] = [
      'QB',
      'RB',
      'WR',
      'TE',
      'OT',
      'OG',
      'C',
      'EDGE',
      'DL',
      'LB',
      'CB',
      'S',
      'K',
      'P',
      'LS',
    ];
    for (const pos of positions) {
      expect(POSITIONAL_VALUE[pos]).toBeGreaterThan(0);
    }
  });

  it('ranks QB highest', () => {
    const max = Math.max(...Object.values(POSITIONAL_VALUE));
    expect(POSITIONAL_VALUE.QB).toBe(max);
  });

  it('ranks premium positions above 1.0', () => {
    expect(POSITIONAL_VALUE.QB).toBeGreaterThan(1.0);
    expect(POSITIONAL_VALUE.EDGE).toBeGreaterThan(1.0);
    expect(POSITIONAL_VALUE.OT).toBeGreaterThan(1.0);
    expect(POSITIONAL_VALUE.WR).toBeGreaterThan(1.0);
    expect(POSITIONAL_VALUE.CB).toBeGreaterThan(1.0);
  });

  it('ranks replaceable positions below 0.8', () => {
    expect(POSITIONAL_VALUE.RB).toBeLessThan(0.8);
    expect(POSITIONAL_VALUE.K).toBeLessThan(0.8);
    expect(POSITIONAL_VALUE.P).toBeLessThan(0.8);
    expect(POSITIONAL_VALUE.LS).toBeLessThan(0.8);
  });
});

// ============================================================
// Surplus Value Curve
// ============================================================

describe('baseSurplusValue', () => {
  it('returns 0 for invalid pick numbers', () => {
    expect(baseSurplusValue(0)).toBe(0);
    expect(baseSurplusValue(-1)).toBe(0);
  });

  it('pick 1 surplus is ~63 (below peak)', () => {
    expect(baseSurplusValue(1)).toBeCloseTo(63, 0);
  });

  it('surplus peaks at pick 12 = 100', () => {
    expect(baseSurplusValue(12)).toBeCloseTo(100, 0);
  });

  it('surplus rises from pick 1 to pick 12', () => {
    const v1 = baseSurplusValue(1);
    const v6 = baseSurplusValue(6);
    const v12 = baseSurplusValue(12);
    expect(v6).toBeGreaterThan(v1);
    expect(v12).toBeGreaterThan(v6);
  });

  it('surplus decays after pick 12', () => {
    const v12 = baseSurplusValue(12);
    const v32 = baseSurplusValue(32);
    const v64 = baseSurplusValue(64);
    const v128 = baseSurplusValue(128);
    expect(v32).toBeLessThan(v12);
    expect(v64).toBeLessThan(v32);
    expect(v128).toBeLessThan(v64);
  });

  it('matches Baldwin anchor points within tolerance', () => {
    expect(baseSurplusValue(32)).toBeCloseTo(54, -1); // ~50-58
    expect(baseSurplusValue(64)).toBeCloseTo(34, -1); // ~30-38
  });

  it('late picks still have positive surplus', () => {
    expect(baseSurplusValue(256)).toBeGreaterThan(0);
  });
});

describe('positionAdjustedSurplus', () => {
  it('QB at pick 12 is highest possible surplus', () => {
    const qbSurplus = positionAdjustedSurplus(12, 'QB');
    const wrSurplus = positionAdjustedSurplus(12, 'WR');
    expect(qbSurplus).toBeGreaterThan(wrSurplus);
  });

  it('scales by positional multiplier', () => {
    const base = baseSurplusValue(1);
    expect(positionAdjustedSurplus(1, 'QB')).toBeCloseTo(
      base * POSITIONAL_VALUE.QB,
      1,
    );
  });
});

// ============================================================
// Pick Classification
// ============================================================

describe('classifyPick', () => {
  it('positive valueDelta = value pick', () => {
    // At pick 10, threshold = max(3, 0.8) = 3
    // valueDelta 7 >= 6 (threshold*2) → great-value
    expect(classifyPick(7, 10)).toBe('great-value');
  });

  it('small positive delta = good value', () => {
    // threshold at pick 10 = 3, delta 4 >= 3 but < 6
    expect(classifyPick(4, 10)).toBe('good-value');
  });

  it('near-zero delta = fair', () => {
    expect(classifyPick(0, 10)).toBe('fair');
    expect(classifyPick(-2, 10)).toBe('fair');
  });

  it('moderate negative delta = slight reach', () => {
    // threshold at pick 10 = 3, delta -4 >= -6 but < -3
    expect(classifyPick(-4, 10)).toBe('slight-reach');
  });

  it('large negative delta = reach', () => {
    // threshold at pick 10 = 3, delta -8 >= -9 but < -6
    expect(classifyPick(-8, 10)).toBe('reach');
  });

  it('extreme negative delta = big reach', () => {
    // threshold at pick 10 = 3, delta -10 < -9
    expect(classifyPick(-10, 10)).toBe('big-reach');
  });

  it('threshold scales with draft position', () => {
    // At pick 100, threshold = max(3, 8) = 8
    // delta -5 is within threshold → fair (wouldn't be at pick 10)
    expect(classifyPick(-5, 100)).toBe('fair');
    // Same delta at pick 10 would be slight-reach
    expect(classifyPick(-5, 10)).toBe('slight-reach');
  });
});

// ============================================================
// Grade Tiers
// ============================================================

describe('getGradeTier', () => {
  it('maps grade ranges to tier labels', () => {
    expect(getGradeTier(95)).toBe('Elite');
    expect(getGradeTier(90)).toBe('Elite');
    expect(getGradeTier(85)).toBe('Pro Bowl');
    expect(getGradeTier(75)).toBe('Starter');
    expect(getGradeTier(65)).toBe('Solid');
    expect(getGradeTier(55)).toBe('Average');
    expect(getGradeTier(45)).toBe('Below Average');
    expect(getGradeTier(35)).toBe('Practice Squad');
    expect(getGradeTier(15)).toBe('Undrafted');
  });
});

// ============================================================
// Individual Pick Grading
// ============================================================

describe('gradePick', () => {
  const qb1 = makePlayer({ consensusRank: 1, position: 'QB', id: 'qb-1' });
  const wr5 = makePlayer({ consensusRank: 5, position: 'WR', id: 'wr-5' });
  const rb30 = makePlayer({ consensusRank: 30, position: 'RB', id: 'rb-30' });
  const cb3 = makePlayer({ consensusRank: 3, position: 'CB', id: 'cb-3' });
  const allPlayers = [qb1, cb3, wr5, rb30];

  it('steal pick scores above 50', () => {
    // Pick #5, player ranked #1 → valueDelta = 5 - 1 = +4 (steal)
    const pick = makePick(5, 'qb-1');
    const grade = gradePick(pick, qb1, ['QB'], allPlayers);
    expect(grade.pickScore).toBeGreaterThan(50);
    expect(grade.valueDelta).toBeGreaterThan(0);
  });

  it('reach pick scores below 50', () => {
    // Pick #5, player ranked #30 → valueDelta = 5 - 30 = -25 (reach)
    const pick = makePick(5, 'rb-30');
    const grade = gradePick(pick, rb30, ['RB'], allPlayers);
    expect(grade.pickScore).toBeLessThan(50);
    expect(grade.valueDelta).toBeLessThan(0);
  });

  it('neutral pick scores near 50', () => {
    // Pick #5, player ranked #5 → valueDelta = 0
    const player5 = makePlayer({ consensusRank: 5, id: 'p5' });
    const pick = makePick(5, 'p5');
    const grade = gradePick(pick, player5, [], [player5]);
    expect(grade.pickScore).toBeGreaterThanOrEqual(40);
    expect(grade.pickScore).toBeLessThanOrEqual(60);
  });

  it('fills team need → higher score', () => {
    const pick = makePick(5, 'wr-5');
    const withNeed = gradePick(pick, wr5, ['WR', 'CB'], allPlayers);
    const withoutNeed = gradePick(pick, wr5, ['CB', 'S'], allPlayers);
    expect(withNeed.pickScore).toBeGreaterThan(withoutNeed.pickScore);
  });

  it('premium position at early pick → higher score', () => {
    // QB at pick 1 vs RB at pick 1 (same consensus rank)
    const qbPick = makePlayer({ consensusRank: 1, position: 'QB', id: 'qb' });
    const rbPick = makePlayer({ consensusRank: 1, position: 'RB', id: 'rb' });
    const p1 = makePick(1, 'qb');
    const p2 = makePick(1, 'rb');
    const g1 = gradePick(p1, qbPick, [], [qbPick, rbPick]);
    const g2 = gradePick(p2, rbPick, [], [qbPick, rbPick]);
    expect(g1.pickScore).toBeGreaterThan(g2.pickScore);
  });

  it('detects better alternative available', () => {
    // Pick rb30 at #5 when qb1 is available
    const pick = makePick(5, 'rb-30');
    const grade = gradePick(pick, rb30, [], allPlayers);
    expect(grade.hadBetterAlternative).toBe(true);
  });

  it('no better alternative when picking BPA', () => {
    const pick = makePick(1, 'qb-1');
    const grade = gradePick(pick, qb1, [], allPlayers);
    expect(grade.hadBetterAlternative).toBe(false);
  });

  it('computes board delta when rankings provided', () => {
    // Board has qb1 at index 0 (rank 1), picked at overall 5
    const pick = makePick(5, 'qb-1');
    const grade = gradePick(pick, qb1, [], allPlayers, [
      'qb-1',
      'cb-3',
      'wr-5',
    ]);
    expect(grade.boardDelta).toBe(1 - 5); // board rank 1 - pick 5 = -4
  });

  it('boardDelta undefined when player not on board', () => {
    const pick = makePick(5, 'rb-30');
    const grade = gradePick(pick, rb30, [], allPlayers, ['qb-1', 'cb-3']);
    expect(grade.boardDelta).toBeUndefined();
  });

  it('sets correct label for each classification', () => {
    // Great value: pick 100, consensus 1 → delta = 99
    const greatPlayer = makePlayer({ consensusRank: 1, id: 'great' });
    const great = gradePick(
      makePick(100, 'great'),
      greatPlayer,
      [],
      [greatPlayer],
    );
    expect(great.label).toBe('great-value');

    // Big reach: pick 1, consensus 50 → delta = -49
    const reachPlayer = makePlayer({ consensusRank: 50, id: 'reach' });
    const reach = gradePick(
      makePick(1, 'reach'),
      reachPlayer,
      [],
      [reachPlayer],
    );
    expect(reach.label).toBe('big-reach');
  });

  it('includes surplus value based on pick position and position', () => {
    const pick = makePick(12, 'qb-1');
    const grade = gradePick(pick, qb1, [], allPlayers);
    // Pick 12 is peak surplus (100), QB multiplier is 2.5 → 250
    expect(grade.surplusValue).toBeCloseTo(100 * 2.5, 0);
  });

  it('scores are clamped 0-100', () => {
    // Extreme steal: consensus 1 at pick 256
    const p = makePlayer({ consensusRank: 1, id: 'extreme' });
    const grade = gradePick(makePick(256, 'extreme'), p, ['WR'], [p]);
    expect(grade.pickScore).toBeLessThanOrEqual(100);
    expect(grade.pickScore).toBeGreaterThanOrEqual(0);

    // Extreme reach: consensus 500 at pick 1
    const q = makePlayer({
      consensusRank: 500,
      id: 'terrible',
      position: 'LS',
    });
    const grade2 = gradePick(makePick(1, 'terrible'), q, [], [q]);
    expect(grade2.pickScore).toBeGreaterThanOrEqual(0);
    expect(grade2.pickScore).toBeLessThanOrEqual(100);
  });
});

// ============================================================
// Team Draft Grading
// ============================================================

describe('gradeTeamDraft', () => {
  it('returns default grade for team with no picks', () => {
    const grade = gradeTeamDraft('ARI', [], ['QB', 'WR'], [], 0);
    expect(grade.overallGrade).toBe(50);
    expect(grade.tier).toBe('Average');
    expect(grade.needsFilled).toBe(0);
  });

  it('team that fills all needs scores high on needs dimension', () => {
    const qb1 = makePlayer({ consensusRank: 1, position: 'QB', id: 'qb-1' });
    const wr2 = makePlayer({ consensusRank: 2, position: 'WR', id: 'wr-2' });

    const picks = [
      gradePick(makePick(1, 'qb-1', 'ARI'), qb1, ['QB', 'WR'], [qb1, wr2]),
      gradePick(makePick(2, 'wr-2', 'ARI'), wr2, ['WR'], [wr2]),
    ];

    const grade = gradeTeamDraft(
      'ARI',
      picks,
      ['QB', 'WR'],
      [200, 200, 200],
      0,
    );
    expect(grade.scores.needs).toBe(100);
    expect(grade.needsFilled).toBe(2);
  });

  it('team with all reaches scores low on value dimension', () => {
    // Players ranked far below their pick slots
    const bad1 = makePlayer({
      consensusRank: 100,
      position: 'WR',
      id: 'bad-1',
    });
    const bad2 = makePlayer({
      consensusRank: 150,
      position: 'RB',
      id: 'bad-2',
    });

    const picks = [
      gradePick(makePick(1, 'bad-1', 'ARI'), bad1, [], [bad1, bad2]),
      gradePick(makePick(2, 'bad-2', 'ARI'), bad2, [], [bad2]),
    ];

    const grade = gradeTeamDraft('ARI', picks, [], [200, 200], 0);
    expect(grade.scores.value).toBeLessThan(40);
  });

  it('team drafting premium positions early scores high on positional value', () => {
    const qb = makePlayer({ consensusRank: 1, position: 'QB', id: 'qb' });
    const edge = makePlayer({ consensusRank: 2, position: 'EDGE', id: 'edge' });

    const picks = [
      gradePick(makePick(1, 'qb', 'ARI'), qb, [], [qb, edge]),
      gradePick(makePick(2, 'edge', 'ARI'), edge, [], [edge]),
    ];

    const rbTeamP1 = makePlayer({
      consensusRank: 1,
      position: 'RB',
      id: 'rb1',
    });
    const rbTeamP2 = makePlayer({ consensusRank: 2, position: 'K', id: 'k1' });

    const rbPicks = [
      gradePick(makePick(1, 'rb1', 'ATL'), rbTeamP1, [], [rbTeamP1, rbTeamP2]),
      gradePick(makePick(2, 'k1', 'ATL'), rbTeamP2, [], [rbTeamP2]),
    ];

    const premiumGrade = gradeTeamDraft('ARI', picks, [], [200, 200], 0);
    const replaceableGrade = gradeTeamDraft('ATL', rbPicks, [], [200, 200], 0);
    expect(premiumGrade.scores.positionalValue).toBeGreaterThan(
      replaceableGrade.scores.positionalValue,
    );
  });

  it('generates steal highlights', () => {
    const steal = makePlayer({ consensusRank: 1, position: 'QB', id: 'steal' });
    const pick = gradePick(makePick(30, 'steal', 'ARI'), steal, [], [steal]);
    const grade = gradeTeamDraft('ARI', [pick], [], [200], 0);
    expect(grade.highlights.some((h) => h.includes('Steal'))).toBe(true);
  });

  it('generates reach highlights', () => {
    const reach = makePlayer({
      consensusRank: 200,
      position: 'K',
      id: 'reach',
    });
    const pick = gradePick(makePick(1, 'reach', 'ARI'), reach, [], [reach]);
    const grade = gradeTeamDraft('ARI', [pick], [], [20], 0);
    expect(grade.highlights.some((h) => h.includes('Reach'))).toBe(true);
  });

  it('tier label matches overall grade', () => {
    const qb = makePlayer({ consensusRank: 1, position: 'QB', id: 'qb' });
    const pick = gradePick(makePick(12, 'qb', 'ARI'), qb, ['QB'], [qb]);
    const grade = gradeTeamDraft('ARI', [pick], ['QB'], [250], 0);
    expect(getGradeTier(grade.overallGrade)).toBe(grade.tier);
  });
});

// ============================================================
// Trade Analysis
// ============================================================

describe('analyzeAllTrades', () => {
  it('returns empty array for no trades', () => {
    expect(analyzeAllTrades([], 2025)).toEqual([]);
  });

  it('ignores non-accepted trades', () => {
    const trade: Trade = {
      id: 't1',
      draftId: 'draft-1',
      status: 'pending',
      proposerId: 'u1',
      proposerTeam: 'ARI',
      recipientId: 'u2',
      recipientTeam: 'ATL',
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 32 }],
      proposedAt: TS,
      isForceTrade: false,
    };
    expect(analyzeAllTrades([trade], 2025)).toEqual([]);
  });

  it('identifies winner in lopsided trade', () => {
    const trade: Trade = {
      id: 't1',
      draftId: 'draft-1',
      status: 'accepted',
      proposerId: 'u1',
      proposerTeam: 'ARI',
      recipientId: 'u2',
      recipientTeam: 'ATL',
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [
        { type: 'current-pick', overall: 10 },
        { type: 'current-pick', overall: 40 },
        { type: 'current-pick', overall: 70 },
      ],
      proposedAt: TS,
      isForceTrade: false,
    };

    const [analysis] = analyzeAllTrades([trade], 2025);
    // Proposer gives pick 1 (1000), receives picks 10+40+70 (~369+150+67 = ~586)
    // Recipient wins (got pick 1 for picks 10+40+70)
    expect(analysis.winner).toBe('ATL');
    expect(analysis.proposerNetValue).toBeLessThan(0);
    expect(analysis.recipientNetValue).toBeGreaterThan(0);
  });

  it('marks roughly even trades as even', () => {
    const trade: Trade = {
      id: 't1',
      draftId: 'draft-1',
      status: 'accepted',
      proposerId: 'u1',
      proposerTeam: 'ARI',
      recipientId: 'u2',
      recipientTeam: 'ATL',
      proposerGives: [{ type: 'current-pick', overall: 15 }],
      proposerReceives: [{ type: 'current-pick', overall: 16 }],
      proposedAt: TS,
      isForceTrade: false,
    };

    const [analysis] = analyzeAllTrades([trade], 2025);
    expect(analysis.winner).toBe('even');
  });

  it('handles future picks', () => {
    const trade: Trade = {
      id: 't1',
      draftId: 'draft-1',
      status: 'accepted',
      proposerId: 'u1',
      proposerTeam: 'ARI',
      recipientId: 'u2',
      recipientTeam: 'ATL',
      proposerGives: [{ type: 'current-pick', overall: 32 }],
      proposerReceives: [
        { type: 'future-pick', year: 2026, round: 1, originalTeam: 'ATL' },
      ],
      proposedAt: TS,
      isForceTrade: false,
    };

    const [analysis] = analyzeAllTrades([trade], 2025);
    expect(analysis.proposerNetValue).toBeDefined();
    expect(analysis.recipientNetValue).toBeDefined();
  });
});

// ============================================================
// Optimal BPA Baseline
// ============================================================

describe('computeOptimalBaseline', () => {
  it('BPA matches actual when draft follows consensus order', () => {
    const players: Record<string, Player> = {
      p1: makePlayer({ id: 'p1', consensusRank: 1 }),
      p2: makePlayer({ id: 'p2', consensusRank: 2 }),
      p3: makePlayer({ id: 'p3', consensusRank: 3 }),
    };
    const picks = [makePick(1, 'p1'), makePick(2, 'p2'), makePick(3, 'p3')];

    const optimal = computeOptimalBaseline(picks, players);
    expect(optimal[0].actualPlayerId).toBe(optimal[0].optimalPlayerId);
    expect(optimal[1].actualPlayerId).toBe(optimal[1].optimalPlayerId);
    expect(optimal[2].actualPlayerId).toBe(optimal[2].optimalPlayerId);
  });

  it('detects divergence from BPA', () => {
    const players: Record<string, Player> = {
      p1: makePlayer({ id: 'p1', consensusRank: 1 }),
      p2: makePlayer({ id: 'p2', consensusRank: 2 }),
      p3: makePlayer({ id: 'p3', consensusRank: 3 }),
    };
    // Pick p3 first instead of p1
    const picks = [makePick(1, 'p3'), makePick(2, 'p1'), makePick(3, 'p2')];

    const optimal = computeOptimalBaseline(picks, players);
    expect(optimal[0].optimalPlayerId).toBe('p1'); // BPA was p1
    expect(optimal[0].actualPlayerId).toBe('p3'); // but p3 was picked
  });
});

// ============================================================
// Full Draft Recap (Integration)
// ============================================================

describe('generateDraftRecap', () => {
  it('produces recap for a simple draft', () => {
    const players: Record<string, Player> = {
      qb1: makePlayer({ id: 'qb1', consensusRank: 1, position: 'QB' }),
      wr2: makePlayer({ id: 'wr2', consensusRank: 2, position: 'WR' }),
      cb3: makePlayer({ id: 'cb3', consensusRank: 3, position: 'CB' }),
      edge4: makePlayer({ id: 'edge4', consensusRank: 4, position: 'EDGE' }),
    };

    const picks = [
      makePick(1, 'qb1', 'ARI'),
      makePick(2, 'wr2', 'ATL'),
      makePick(3, 'cb3', 'ARI'),
      makePick(4, 'edge4', 'ATL'),
    ];

    const teamNeeds = new Map<TeamAbbreviation, Position[]>([
      ['ARI', ['QB', 'CB']],
      ['ATL', ['WR', 'EDGE']],
    ]);

    const draft = makeDraft();
    const recap = generateDraftRecap(draft, picks, players, teamNeeds, []);

    expect(recap.draftId).toBe('draft-1');
    expect(recap.teamGrades.length).toBe(2);
    expect(recap.optimalComparison.length).toBe(4);
    expect(recap.tradeAnalysis).toEqual([]);

    // Both teams filled all needs and drafted in consensus order → high grades
    for (const tg of recap.teamGrades) {
      expect(tg.overallGrade).toBeGreaterThanOrEqual(50);
      expect(tg.needsFilled).toBe(2);
      expect(tg.picks.length).toBe(2);
    }
  });

  it('handles empty draft', () => {
    const recap = generateDraftRecap(makeDraft(), [], {}, new Map(), []);
    expect(recap.teamGrades).toEqual([]);
    expect(recap.overallClassGrade).toBe(50);
  });

  it('effective needs decrease as team drafts positions', () => {
    const qb1 = makePlayer({ id: 'qb1', consensusRank: 1, position: 'QB' });
    const qb10 = makePlayer({ id: 'qb10', consensusRank: 10, position: 'QB' });
    const wr3 = makePlayer({ id: 'wr3', consensusRank: 3, position: 'WR' });
    const players: Record<string, Player> = { qb1, qb10, wr3 };

    const picks = [
      makePick(1, 'qb1', 'ARI'),
      makePick(2, 'wr3', 'ATL'),
      makePick(3, 'qb10', 'ARI'), // QB again — need already filled
    ];

    const teamNeeds = new Map<TeamAbbreviation, Position[]>([
      ['ARI', ['QB', 'WR']], // QB is first need
      ['ATL', ['WR']],
    ]);

    const recap = generateDraftRecap(
      makeDraft(),
      picks,
      players,
      teamNeeds,
      [],
    );
    const ariGrade = recap.teamGrades.find((g) => g.team === 'ARI')!;

    // Second QB pick should have needIndex -1 (need already filled)
    const secondQbGrade = ariGrade.picks.find((p) => p.playerId === 'qb10')!;
    expect(secondQbGrade.needIndex).toBe(-1);
  });

  it('includes trade analysis when trades present', () => {
    const p1 = makePlayer({ id: 'p1', consensusRank: 1 });
    const p2 = makePlayer({ id: 'p2', consensusRank: 2 });

    const trade: Trade = {
      id: 't1',
      draftId: 'draft-1',
      status: 'accepted',
      proposerId: 'u1',
      proposerTeam: 'ARI',
      recipientId: 'u2',
      recipientTeam: 'ATL',
      proposerGives: [{ type: 'current-pick', overall: 1 }],
      proposerReceives: [{ type: 'current-pick', overall: 2 }],
      proposedAt: TS,
      isForceTrade: false,
    };

    const recap = generateDraftRecap(
      makeDraft(),
      [makePick(1, 'p1', 'ATL'), makePick(2, 'p2', 'ARI')],
      { p1, p2 },
      new Map(),
      [trade],
    );

    expect(recap.tradeAnalysis.length).toBe(1);
    expect(recap.tradeAnalysis[0].proposerTeam).toBe('ARI');
  });

  it('sorts team grades by overall grade descending', () => {
    const p1 = makePlayer({ id: 'p1', consensusRank: 1, position: 'QB' });
    const p100 = makePlayer({ id: 'p100', consensusRank: 100, position: 'K' });

    const recap = generateDraftRecap(
      makeDraft(),
      [
        makePick(1, 'p100', 'ARI'), // terrible pick
        makePick(2, 'p1', 'ATL'), // great value steal
      ],
      { p1, p100 },
      new Map<TeamAbbreviation, Position[]>([
        ['ARI', []],
        ['ATL', ['QB']],
      ]),
      [],
    );

    expect(recap.teamGrades[0].team).toBe('ATL');
    expect(recap.teamGrades[0].overallGrade).toBeGreaterThan(
      recap.teamGrades[1].overallGrade,
    );
  });

  it('passes board rankings through to pick grades', () => {
    const p1 = makePlayer({ id: 'p1', consensusRank: 1, position: 'QB' });
    const boardRankings = ['p1'];

    const recap = generateDraftRecap(
      makeDraft(),
      [makePick(5, 'p1', 'ARI')],
      { p1 },
      new Map(),
      [],
      boardRankings,
    );

    const ariGrade = recap.teamGrades.find((g) => g.team === 'ARI')!;
    expect(ariGrade.picks[0].boardDelta).toBe(1 - 5);
  });
});

// --- suggestPick ---

describe('suggestPick', () => {
  it('returns null for empty player list', () => {
    expect(suggestPick([], ['QB'], 1)).toBeNull();
  });

  it('returns the BPA when no needs match', () => {
    const p1 = makePlayer({ consensusRank: 1, position: 'WR', id: 'wr1' });
    const p2 = makePlayer({ consensusRank: 10, position: 'CB', id: 'cb10' });

    const result = suggestPick([p1, p2], ['EDGE'], 5);
    expect(result).not.toBeNull();
    expect(result!.playerId).toBe('wr1');
    expect(result!.reason).toContain('BPA');
  });

  it('favors a need fill when close in rank to BPA', () => {
    const wr = makePlayer({ consensusRank: 4, position: 'WR', id: 'wr4' });
    const cb = makePlayer({ consensusRank: 5, position: 'CB', id: 'cb5' });

    const result = suggestPick([wr, cb], ['CB'], 5);
    expect(result).not.toBeNull();
    expect(result!.playerId).toBe('cb5');
    expect(result!.reason).toMatch(/need/i);
  });

  it('returns a reason string', () => {
    const p = makePlayer({ consensusRank: 1, id: 'p1' });
    const result = suggestPick([p], [], 1);
    expect(result!.reason).toBeTruthy();
    expect(typeof result!.reason).toBe('string');
  });

  it('respects board rankings when provided', () => {
    const p1 = makePlayer({ consensusRank: 10, id: 'p1' });
    const p2 = makePlayer({ consensusRank: 1, id: 'p2' });

    // Board says p1 is rank 1, p2 is rank 2
    const result = suggestPick([p1, p2], [], 5, ['p1', 'p2']);
    expect(result!.playerId).toBe('p1');
  });

  it('favors premium positions at early picks', () => {
    const qb = makePlayer({ consensusRank: 5, position: 'QB', id: 'qb' });
    const rb = makePlayer({ consensusRank: 5, position: 'RB', id: 'rb' });

    // At pick 5 (premium slot), QB positional value should push it above RB
    const result = suggestPick([qb, rb], [], 5);
    expect(result!.playerId).toBe('qb');
  });

  it('score is a number between 0 and 100', () => {
    const p1 = makePlayer({ consensusRank: 1, position: 'QB', id: 'qb1' });
    const p2 = makePlayer({ consensusRank: 50, position: 'K', id: 'k50' });

    const result = suggestPick([p1, p2], ['QB'], 1);
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(100);
  });
});
