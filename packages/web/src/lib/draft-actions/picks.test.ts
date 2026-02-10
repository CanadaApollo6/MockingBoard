/// <reference types="vitest/globals" />
import { vi } from 'vitest';

// ---- hoisted mocks ----

const {
  mockGet,
  mockBatchSet,
  mockBatchUpdate,
  mockBatchCommit,
  mockCollection,
  mockRunTransaction,
  mockGetCachedPlayers,
  mockGetBigBoard,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockBatchSet = vi.fn();
  const mockBatchUpdate = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

  const pickDocFn = vi.fn(() => ({
    get: mockGet,
    update: mockUpdate,
    collection: vi.fn(() => ({ doc: vi.fn(() => ({ id: 'pick-1' })) })),
  }));
  const mockCollection = vi.fn(() => ({ doc: pickDocFn }));

  const mockRunTransaction = vi.fn();

  return {
    mockGet,
    mockUpdate,
    mockSet,
    mockBatchSet,
    mockBatchUpdate,
    mockBatchCommit,
    mockCollection,
    mockRunTransaction,
    mockGetCachedPlayers: vi.fn(),
    mockGetBigBoard: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    arrayUnion: (...args: unknown[]) => ({ _arrayUnion: args }),
  },
}));
vi.mock('../firebase-admin', () => ({
  adminDb: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
    batch: () => ({
      set: mockBatchSet,
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    }),
  },
}));
vi.mock('../cache', () => ({
  getCachedPlayers: (...args: unknown[]) => mockGetCachedPlayers(...args),
}));
vi.mock('../data', () => ({
  getBigBoard: (...args: unknown[]) => mockGetBigBoard(...args),
}));
vi.mock('../sanitize', () => ({
  hydrateDoc: (doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    ...doc.data(),
  }),
}));

import {
  getAvailablePlayers,
  runCpuCascade,
  advanceSingleCpuPick,
} from './picks.js';
import type {
  Draft,
  Player,
  TeamAbbreviation,
  DraftSlot,
} from '@mockingboard/shared';

// ---- helpers ----

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Test Player',
    position: 'QB',
    team: 'NE',
    school: 'MIT',
    consensusRank: 1,
    ...overrides,
  } as Player;
}

function makeSlot(overrides: Partial<DraftSlot> = {}): DraftSlot {
  return {
    overall: 1,
    round: 1,
    pick: 1,
    team: 'NE' as TeamAbbreviation,
    ...overrides,
  };
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    config: {
      rounds: 1,
      format: 'full',
      year: 2026,
      cpuSpeed: 'instant',
      secondsPerPick: 0,
      tradesEnabled: false,
    },
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    platform: 'web',
    teamAssignments: { NE: null, DAL: 'user-1' } as Draft['teamAssignments'],
    participants: { 'user-1': 'user-1' },
    participantNames: { 'user-1': 'Player 1' },
    participantIds: ['user-1'],
    pickOrder: [
      makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
      makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
    ],
    pickedPlayerIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Draft;
}

function mockDraftDoc(draft: Draft | null) {
  if (!draft) {
    mockGet.mockResolvedValue({ exists: false });
    return;
  }
  const { id, ...data } = draft;
  mockGet.mockResolvedValue({
    exists: true,
    id,
    data: () => data,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

// ============ getAvailablePlayers ============

describe('getAvailablePlayers', () => {
  it('filters out already-picked players', async () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Player One' }),
      makePlayer({ id: 'p2', name: 'Player Two' }),
      makePlayer({ id: 'p3', name: 'Player Three' }),
    ];
    mockGetCachedPlayers.mockResolvedValue(players);

    const result = await getAvailablePlayers(2026, ['p1', 'p3']);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p2');
  });

  it('returns empty when all players are picked', async () => {
    mockGetCachedPlayers.mockResolvedValue([makePlayer({ id: 'p1' })]);

    const result = await getAvailablePlayers(2026, ['p1']);

    expect(result).toHaveLength(0);
  });

  it('returns all players when none are picked', async () => {
    const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    mockGetCachedPlayers.mockResolvedValue(players);

    const result = await getAvailablePlayers(2026, []);

    expect(result).toHaveLength(2);
  });
});

// ============ runCpuCascade ============

describe('runCpuCascade', () => {
  it('returns empty when draft not found', async () => {
    mockDraftDoc(null);

    const result = await runCpuCascade('draft-1');

    expect(result).toEqual({ picks: [], isComplete: false });
  });

  it('returns empty when draft is not active', async () => {
    mockDraftDoc(makeDraft({ status: 'paused' }));

    const result = await runCpuCascade('draft-1');

    expect(result).toEqual({ picks: [], isComplete: false });
  });

  it('returns isComplete true when draft is already complete', async () => {
    mockDraftDoc(makeDraft({ status: 'complete' }));

    const result = await runCpuCascade('draft-1');

    expect(result).toEqual({ picks: [], isComplete: true });
  });

  it('stops at human pick and returns CPU picks made', async () => {
    // Pick 1 = NE (CPU: teamAssignments.NE = null)
    // Pick 2 = DAL (human: teamAssignments.DAL = 'user-1')
    const draft = makeDraft({
      currentPick: 1,
      pickOrder: [
        makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
        makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
      ],
    });
    mockDraftDoc(draft);

    const players = [
      makePlayer({ id: 'p1', consensusRank: 1 }),
      makePlayer({ id: 'p2', consensusRank: 2 }),
    ];
    mockGetCachedPlayers.mockResolvedValue(players);
    mockGetBigBoard.mockResolvedValue(null);

    const result = await runCpuCascade('draft-1');

    // Should make 1 CPU pick (NE) then stop at DAL (human)
    expect(result.picks).toHaveLength(1);
    expect(result.isComplete).toBe(false);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('returns isComplete when all picks are CPU', async () => {
    const draft = makeDraft({
      currentPick: 1,
      teamAssignments: { NE: null, DAL: null } as Draft['teamAssignments'],
      pickOrder: [
        makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
        makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
      ],
    });
    mockDraftDoc(draft);

    const players = [
      makePlayer({ id: 'p1', consensusRank: 1 }),
      makePlayer({ id: 'p2', consensusRank: 2 }),
    ];
    mockGetCachedPlayers.mockResolvedValue(players);
    mockGetBigBoard.mockResolvedValue(null);

    // After first pick, status check returns active
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        id: 'draft-1',
        data: () => ({ ...draft, status: 'active' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        id: 'draft-1',
        data: () => ({ status: 'active' }),
      });

    const result = await runCpuCascade('draft-1');

    expect(result.picks).toHaveLength(2);
    expect(result.isComplete).toBe(true);
  });

  it('stops if draft is paused mid-cascade', async () => {
    const draft = makeDraft({
      currentPick: 1,
      teamAssignments: { NE: null, DAL: null } as Draft['teamAssignments'],
      pickOrder: [
        makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
        makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
      ],
    });

    // First get: active draft. Second get (status re-check): paused
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        id: 'draft-1',
        data: () => ({ ...draft }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: 'paused' }),
      });

    const players = [
      makePlayer({ id: 'p1', consensusRank: 1 }),
      makePlayer({ id: 'p2', consensusRank: 2 }),
    ];
    mockGetCachedPlayers.mockResolvedValue(players);
    mockGetBigBoard.mockResolvedValue(null);

    const result = await runCpuCascade('draft-1');

    // Made 1 pick, then re-checked status → paused → stopped
    expect(result.picks).toHaveLength(1);
    expect(result.isComplete).toBe(false);
  });
});

// ============ advanceSingleCpuPick ============

describe('advanceSingleCpuPick', () => {
  it('throws when draft not found', async () => {
    mockGet.mockResolvedValue({ exists: false });

    await expect(advanceSingleCpuPick('draft-1')).rejects.toThrow(
      'Draft not found',
    );
  });

  it('returns null pick when draft is not active', async () => {
    mockDraftDoc(makeDraft({ status: 'paused' }));

    const result = await advanceSingleCpuPick('draft-1');

    expect(result).toEqual({ pick: null, isComplete: false });
  });

  it('returns null pick when current slot is human-controlled', async () => {
    // DAL is assigned to user-1 → human pick
    mockDraftDoc(
      makeDraft({
        currentPick: 2,
        pickOrder: [
          makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
          makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
        ],
      }),
    );

    const result = await advanceSingleCpuPick('draft-1');

    expect(result.pick).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  it('makes one CPU pick and returns it', async () => {
    // NE is CPU (null assignment)
    mockDraftDoc(
      makeDraft({
        currentPick: 1,
        pickOrder: [
          makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation }),
          makeSlot({ overall: 2, team: 'DAL' as TeamAbbreviation }),
        ],
      }),
    );

    mockGetCachedPlayers.mockResolvedValue([
      makePlayer({ id: 'p1', consensusRank: 1 }),
    ]);
    mockGetBigBoard.mockResolvedValue(null);

    const result = await advanceSingleCpuPick('draft-1');

    expect(result.pick).not.toBeNull();
    expect(result.pick!.playerId).toBe('p1');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('returns isComplete when it was the last pick', async () => {
    mockDraftDoc(
      makeDraft({
        currentPick: 1,
        teamAssignments: { NE: null } as Draft['teamAssignments'],
        pickOrder: [makeSlot({ overall: 1, team: 'NE' as TeamAbbreviation })],
      }),
    );

    mockGetCachedPlayers.mockResolvedValue([
      makePlayer({ id: 'p1', consensusRank: 1 }),
    ]);
    mockGetBigBoard.mockResolvedValue(null);

    const result = await advanceSingleCpuPick('draft-1');

    expect(result.isComplete).toBe(true);
  });
});
