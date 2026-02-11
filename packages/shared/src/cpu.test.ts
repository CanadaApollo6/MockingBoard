import type { Player, Position, DraftSlot, TeamAbbreviation } from './types';
import {
  selectCpuPick,
  getEffectiveNeeds,
  getTeamDraftedPositions,
} from './cpu';

function makePlayer(
  overrides: Partial<Player> & { consensusRank: number },
): Player {
  return {
    id: `player-${overrides.consensusRank}`,
    name: `Player ${overrides.consensusRank}`,
    position: 'WR',
    school: 'Test U',
    year: 2025,
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

function makeSlot(team: TeamAbbreviation, overall: number): DraftSlot {
  return { overall, round: 1, pick: overall, team };
}

describe('selectCpuPick', () => {
  beforeEach(() => {
    // Always pick the top-scored player for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks BPA when need player is ranked far below', () => {
    // QB rank 1 (no need): score = 1.0
    // CB rank 10 (#1 need): score = 10 * 0.85 = 8.5
    const players = [
      makePlayer({ consensusRank: 1, position: 'QB' }),
      makePlayer({ consensusRank: 10, position: 'CB' }),
    ];
    const needs: Position[] = ['CB', 'S'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('QB');
  });

  it('picks need player when close in rank to BPA', () => {
    // WR rank 5 (no need): score = 5.0
    // CB rank 4 (#1 need): score = 4 * 0.85 = 3.4
    const players = [
      makePlayer({ consensusRank: 4, position: 'CB' }),
      makePlayer({ consensusRank: 5, position: 'WR' }),
    ];
    const needs: Position[] = ['CB', 'S'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('CB');
  });

  it('applies weaker boost for lower-priority needs', () => {
    // QB rank 9 (no need): 9.0
    // CB rank 10 (#1 need): 10 * 0.85 = 8.5  → beats QB
    // OG rank 10 (#5 need): 10 * 0.98 = 9.8  → loses to QB
    const players = [
      makePlayer({ consensusRank: 9, position: 'QB' }),
      makePlayer({ consensusRank: 10, position: 'CB' }),
      makePlayer({ consensusRank: 10, position: 'OG', id: 'og-10' }),
    ];
    const needs: Position[] = ['CB', 'S', 'EDGE', 'DL', 'OG'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('CB');
  });

  it('returns BPA when needs array is empty', () => {
    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
      makePlayer({ consensusRank: 3 }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBe(1);
  });

  it('handles a single available player', () => {
    const players = [makePlayer({ consensusRank: 10 })];

    const pick = selectCpuPick(players, ['QB']);
    expect(pick.consensusRank).toBe(10);
  });

  it('picks second-best when random falls between TOP and MID', () => {
    // Use ranks with a small relative gap so gap-damping stays mild
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    const players = [
      makePlayer({ consensusRank: 10, id: 'p10' }),
      makePlayer({ consensusRank: 11, id: 'p11' }),
      makePlayer({ consensusRank: 12, id: 'p12' }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBe(11);
  });

  it('picks third-best when random exceeds MID', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);

    const players = [
      makePlayer({ consensusRank: 10, id: 'p10' }),
      makePlayer({ consensusRank: 11, id: 'p11' }),
      makePlayer({ consensusRank: 12, id: 'p12' }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBe(12);
  });

  it('throws when no players are available', () => {
    expect(() => selectCpuPick([], ['QB'])).toThrow('No available players');
  });

  it('boosts higher-priority need over lower-priority need at similar ranks', () => {
    // EDGE rank 2 (#2 need): 2 * 0.90 = 1.8
    // CB rank 3 (#1 need): 3 * 0.85 = 2.55
    // EDGE wins despite CB having a bigger multiplier — rank difference matters
    const players = [
      makePlayer({ consensusRank: 2, position: 'EDGE' }),
      makePlayer({ consensusRank: 3, position: 'CB' }),
    ];
    const needs: Position[] = ['CB', 'EDGE'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('EDGE');
  });

  it('handles two available players', () => {
    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBeLessThanOrEqual(2);
  });
});

describe('selectCpuPick with CpuPickOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always picks top-scored player when randomness is 0', () => {
    // Roll of 0.95 normally picks 3rd+, but randomness=0 forces deterministic #1
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
      makePlayer({ consensusRank: 3 }),
    ];
    const pick = selectCpuPick(players, [], { randomness: 0 });
    expect(pick.consensusRank).toBe(1);
  });

  it('can select from wider pool at high randomness', () => {
    // Use ranks with small relative gap so gap-damping stays mild.
    // At randomness=1 with small gap, effective thresholds stay wide.
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    const players = [10, 11, 12, 13, 14].map((r) =>
      makePlayer({ consensusRank: r, id: `p${r}` }),
    );
    const pick = selectCpuPick(players, [], { randomness: 1.0 });
    expect(pick.consensusRank).toBe(14);
  });

  it('ignores team needs when needsWeight is 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const players = [
      makePlayer({ consensusRank: 10, position: 'WR' }),
      makePlayer({ consensusRank: 11, position: 'CB' }),
    ];
    // CB would win at default needsWeight (11*0.85=9.35 < 10), but not at 0
    const pick = selectCpuPick(players, ['CB'], {
      randomness: 0,
      needsWeight: 0,
    });
    expect(pick.position).toBe('WR');
  });

  it('heavily boosts needs when needsWeight is 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const players = [
      makePlayer({ consensusRank: 10, position: 'WR' }),
      makePlayer({ consensusRank: 11, position: 'CB' }),
    ];
    // CB at needsWeight=1: 11*0.70=7.70, WR: 10.0 → CB wins
    const pick = selectCpuPick(players, ['CB'], {
      randomness: 0,
      needsWeight: 1,
    });
    expect(pick.position).toBe('CB');
  });

  it('default options match original behavior', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // Same scenario as "picks need player when close in rank to BPA"
    const players = [
      makePlayer({ consensusRank: 4, position: 'CB' }),
      makePlayer({ consensusRank: 5, position: 'WR' }),
    ];
    const pick = selectCpuPick(players, ['CB', 'S']);
    expect(pick.position).toBe('CB');
  });
});

describe('selectCpuPick with boardRankings', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses board ranking instead of consensusRank when provided', () => {
    // Consensus: p1=rank1, p2=rank2. Board: p2 first, p1 second.
    const p1 = makePlayer({ consensusRank: 1, id: 'p1' });
    const p2 = makePlayer({ consensusRank: 2, id: 'p2' });

    const pick = selectCpuPick([p1, p2], [], {
      randomness: 0,
      boardRankings: ['p2', 'p1'],
    });
    // p2 is board rank 1, p1 is board rank 2 → p2 wins
    expect(pick.id).toBe('p2');
  });

  it('falls back to consensusRank for players not on the board', () => {
    const p1 = makePlayer({ consensusRank: 5, id: 'p1' });
    const p2 = makePlayer({ consensusRank: 3, id: 'p2' });

    // Board only has p1 at index 0 (rank 1). p2 is not on board → uses consensus 3.
    const pick = selectCpuPick([p1, p2], [], {
      randomness: 0,
      boardRankings: ['p1'],
    });
    // p1 board rank 1, p2 consensus rank 3 → p1 wins
    expect(pick.id).toBe('p1');
  });

  it('board rankings interact correctly with needs', () => {
    const qb = makePlayer({ consensusRank: 10, position: 'QB', id: 'qb' });
    const cb = makePlayer({ consensusRank: 20, position: 'CB', id: 'cb' });

    // Board puts CB first. With needs boost, CB should clearly win.
    const pick = selectCpuPick([qb, cb], ['CB'], {
      randomness: 0,
      needsWeight: 0.5,
      boardRankings: ['cb', 'qb'],
    });
    // CB board rank 1 * need multiplier 0.85 = 0.85
    // QB board rank 2 * no need 1.0 = 2.0
    expect(pick.id).toBe('cb');
  });

  it('empty board rankings array falls back to consensus for all', () => {
    const p1 = makePlayer({ consensusRank: 1, id: 'p1' });
    const p2 = makePlayer({ consensusRank: 2, id: 'p2' });

    const pick = selectCpuPick([p1, p2], [], {
      randomness: 0,
      boardRankings: [],
    });
    // Both fall back to consensus → p1 wins
    expect(pick.id).toBe('p1');
  });
});

describe('selectCpuPick with positionalWeights', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('favors premium position when ranks are equal', () => {
    const qb = makePlayer({ consensusRank: 5, position: 'QB', id: 'qb' });
    const rb = makePlayer({ consensusRank: 5, position: 'RB', id: 'rb' });

    const pick = selectCpuPick([qb, rb], [], {
      randomness: 0,
      positionalWeights: { QB: 2.5, RB: 0.55 },
    });
    expect(pick.id).toBe('qb');
  });

  it('does not override large rank difference', () => {
    const qb = makePlayer({ consensusRank: 20, position: 'QB', id: 'qb' });
    const rb = makePlayer({ consensusRank: 1, position: 'RB', id: 'rb' });

    const pick = selectCpuPick([qb, rb], [], {
      randomness: 0,
      positionalWeights: { QB: 2.5, RB: 0.55 },
    });
    expect(pick.id).toBe('rb');
  });

  it('has no effect when positionalWeights is undefined', () => {
    const p1 = makePlayer({ consensusRank: 1, id: 'p1' });
    const p2 = makePlayer({ consensusRank: 2, id: 'p2' });

    const pick = selectCpuPick([p1, p2], [], { randomness: 0 });
    expect(pick.id).toBe('p1');
  });

  it('interacts correctly with needs', () => {
    // WR and OG at same rank; OG is #1 need. Positional difference is small
    // enough that needs boost wins.
    const wr = makePlayer({ consensusRank: 5, position: 'WR', id: 'wr' });
    const og = makePlayer({ consensusRank: 5, position: 'OG', id: 'og' });

    const pick = selectCpuPick([wr, og], ['OG'], {
      randomness: 0,
      needsWeight: 0.5,
      positionalWeights: { WR: 1.2, OG: 0.75 },
    });
    // OG gets needs boost (mult ~0.85) which offsets WR's positional advantage
    expect(pick.id).toBe('og');
  });

  it('treats missing positions as weight 1.0', () => {
    const ls = makePlayer({ consensusRank: 1, position: 'LS', id: 'ls' });
    const qb = makePlayer({ consensusRank: 2, position: 'QB', id: 'qb' });

    const pick = selectCpuPick([ls, qb], [], {
      randomness: 0,
      positionalWeights: { QB: 2.5 }, // LS not specified → 1.0
    });
    // LS rank 1 * 1.0 = 1.0; QB rank 2 * ~0.80 = ~1.59 → LS wins on rank
    expect(pick.id).toBe('ls');
  });
});

describe('getEffectiveNeeds', () => {
  it('removes a drafted position from needs', () => {
    const needs: Position[] = ['CB', 'EDGE', 'WR'];
    const drafted: Position[] = ['CB'];
    expect(getEffectiveNeeds(needs, drafted)).toEqual(['EDGE', 'WR']);
  });

  it('removes only one occurrence of a duplicated need', () => {
    const needs: Position[] = ['CB', 'CB', 'WR'];
    const drafted: Position[] = ['CB'];
    expect(getEffectiveNeeds(needs, drafted)).toEqual(['CB', 'WR']);
  });

  it('removes multiple drafted positions', () => {
    const needs: Position[] = ['CB', 'EDGE', 'WR', 'S'];
    const drafted: Position[] = ['CB', 'WR'];
    expect(getEffectiveNeeds(needs, drafted)).toEqual(['EDGE', 'S']);
  });

  it('returns full needs when nothing drafted', () => {
    const needs: Position[] = ['CB', 'EDGE'];
    expect(getEffectiveNeeds(needs, [])).toEqual(['CB', 'EDGE']);
  });

  it('returns empty when all needs filled', () => {
    const needs: Position[] = ['CB', 'EDGE'];
    const drafted: Position[] = ['CB', 'EDGE'];
    expect(getEffectiveNeeds(needs, drafted)).toEqual([]);
  });

  it('ignores drafted positions not in needs', () => {
    const needs: Position[] = ['CB', 'EDGE'];
    const drafted: Position[] = ['QB', 'RB'];
    expect(getEffectiveNeeds(needs, drafted)).toEqual(['CB', 'EDGE']);
  });
});

describe('getTeamDraftedPositions', () => {
  it('returns positions drafted by the target team', () => {
    const pickOrder: DraftSlot[] = [
      makeSlot('NYJ', 1),
      makeSlot('SEA', 2),
      makeSlot('NYJ', 3),
    ];
    const pickedPlayerIds = ['p1', 'p2', 'p3'];
    const playerMap = new Map<string, Player>([
      ['p1', makePlayer({ consensusRank: 1, position: 'QB', id: 'p1' })],
      ['p2', makePlayer({ consensusRank: 2, position: 'CB', id: 'p2' })],
      ['p3', makePlayer({ consensusRank: 3, position: 'WR', id: 'p3' })],
    ]);

    const result = getTeamDraftedPositions(
      pickOrder,
      pickedPlayerIds,
      'NYJ',
      playerMap,
    );
    expect(result).toEqual(['QB', 'WR']);
  });

  it('returns empty when team has no picks yet', () => {
    const pickOrder: DraftSlot[] = [makeSlot('SEA', 1), makeSlot('SEA', 2)];
    const pickedPlayerIds = ['p1', 'p2'];
    const playerMap = new Map<string, Player>([
      ['p1', makePlayer({ consensusRank: 1, id: 'p1' })],
      ['p2', makePlayer({ consensusRank: 2, id: 'p2' })],
    ]);

    const result = getTeamDraftedPositions(
      pickOrder,
      pickedPlayerIds,
      'NYJ',
      playerMap,
    );
    expect(result).toEqual([]);
  });

  it('handles partial draft (fewer picked than slots)', () => {
    const pickOrder: DraftSlot[] = [
      makeSlot('NYJ', 1),
      makeSlot('SEA', 2),
      makeSlot('NYJ', 3),
    ];
    const pickedPlayerIds = ['p1'];
    const playerMap = new Map<string, Player>([
      ['p1', makePlayer({ consensusRank: 1, position: 'EDGE', id: 'p1' })],
    ]);

    const result = getTeamDraftedPositions(
      pickOrder,
      pickedPlayerIds,
      'NYJ',
      playerMap,
    );
    expect(result).toEqual(['EDGE']);
  });
});
