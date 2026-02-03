import type {
  Player,
  Position,
  DraftSlot,
  TeamAbbreviation,
} from '@mockingboard/shared';
import {
  getEffectiveNeeds,
  getTeamDraftedPositions,
} from '@mockingboard/shared';
import { selectCpuPick } from './cpu.service.js';

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
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks BPA when need player is ranked far below', () => {
    const players = [
      makePlayer({ consensusRank: 1, position: 'QB' }),
      makePlayer({ consensusRank: 10, position: 'CB' }),
    ];
    const needs: Position[] = ['CB', 'S'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('QB');
  });

  it('picks need player when close in rank to BPA', () => {
    const players = [
      makePlayer({ consensusRank: 4, position: 'CB' }),
      makePlayer({ consensusRank: 5, position: 'WR' }),
    ];
    const needs: Position[] = ['CB', 'S'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('CB');
  });

  it('applies weaker boost for lower-priority needs', () => {
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
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
      makePlayer({ consensusRank: 3 }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBe(2);
  });

  it('picks third-best when random exceeds MID', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);

    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
      makePlayer({ consensusRank: 3 }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBe(3);
  });

  it('throws when no players are available', () => {
    expect(() => selectCpuPick([], ['QB'])).toThrow('No available players');
  });

  it('boosts higher-priority need over lower-priority need at similar ranks', () => {
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
