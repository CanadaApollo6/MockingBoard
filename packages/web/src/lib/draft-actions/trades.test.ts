/// <reference types="vitest/globals" />
import { vi } from 'vitest';

// ---- hoisted mocks ----

const {
  mockGet,
  mockUpdate,
  mockAdd,
  mockCollection,
  mockRunTransaction,
  mockExtractTimestampMs,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockAdd = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc, add: mockAdd }));
  const mockRunTransaction = vi.fn();
  const mockExtractTimestampMs = vi.fn();
  return {
    mockGet,
    mockUpdate,
    mockAdd,
    mockDoc,
    mockCollection,
    mockRunTransaction,
    mockExtractTimestampMs,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}));
vi.mock('../firebase-admin', () => ({
  adminDb: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  },
}));
vi.mock('../sanitize', () => ({
  hydrateDoc: (doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    ...doc.data(),
  }),
}));
vi.mock('../format', () => ({
  extractTimestampMs: (...args: unknown[]) => mockExtractTimestampMs(...args),
}));

import {
  createWebTrade,
  executeWebTrade,
  rejectWebTrade,
  cancelWebTrade,
  isTradeExpired,
} from './trades.js';
import type {
  Draft,
  Trade,
  TeamAbbreviation,
  TradePiece,
  FirestoreTimestamp,
} from '@mockingboard/shared';

// ---- helpers ----

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    createdBy: 'user-1',
    config: {
      rounds: 1,
      format: 'full',
      year: 2026,
      cpuSpeed: 'normal',
      secondsPerPick: 0,
      tradesEnabled: true,
    },
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    platform: 'web',
    teamAssignments: {
      NE: 'user-1',
      DAL: 'user-2',
      NYG: null,
    } as Draft['teamAssignments'],
    participants: { 'user-1': 'user-1', 'user-2': 'user-2' },
    participantNames: { 'user-1': 'P1', 'user-2': 'P2' },
    participantIds: ['user-1', 'user-2'],
    pickOrder: [
      { overall: 1, round: 1, pick: 1, team: 'NE' as TeamAbbreviation },
    ],
    futurePicks: [
      { year: 2027, round: 1, originalTeam: 'NE', ownerTeam: 'NE' },
    ],
    pickedPlayerIds: [],
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Draft;
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    draftId: 'draft-1',
    status: 'pending',
    proposerId: 'user-1',
    proposerTeam: 'NE' as TeamAbbreviation,
    recipientId: 'user-2',
    recipientTeam: 'DAL' as TeamAbbreviation,
    proposerGives: [
      { type: 'futurePick', year: 2027, round: 1, team: 'NE' },
    ] as TradePiece[],
    proposerReceives: [
      { type: 'futurePick', year: 2027, round: 1, team: 'DAL' },
    ] as TradePiece[],
    proposedAt: { seconds: 1000, nanoseconds: 0 } as FirestoreTimestamp,
    isForceTrade: false,
    ...overrides,
  } as Trade;
}

function mockDraftDoc(draft: Draft | null) {
  if (!draft) {
    mockGet.mockResolvedValue({ exists: false });
    return;
  }
  const { id, ...data } = draft;
  mockGet.mockResolvedValue({ exists: true, id, data: () => data });
}

function mockTradeDoc(trade: Trade | null) {
  if (!trade) {
    mockGet.mockResolvedValue({ exists: false });
    return;
  }
  const { id, ...data } = trade;
  mockGet.mockResolvedValue({ exists: true, id, data: () => data });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
});

// ============ createWebTrade ============

describe('createWebTrade', () => {
  const baseInput = {
    draftId: 'draft-1',
    proposerId: 'user-1',
    proposerTeam: 'NE' as TeamAbbreviation,
    recipientId: 'user-2',
    recipientTeam: 'DAL' as TeamAbbreviation,
    proposerGives: [
      { type: 'futurePick', year: 2027, round: 1, team: 'NE' },
    ] as TradePiece[],
    proposerReceives: [
      { type: 'futurePick', year: 2027, round: 1, team: 'DAL' },
    ] as TradePiece[],
  };

  it('throws when draft not found', async () => {
    mockDraftDoc(null);

    await expect(createWebTrade(baseInput)).rejects.toThrow('Draft not found');
  });

  it('creates a user-to-user trade with expiresAt', async () => {
    mockDraftDoc(makeDraft());
    const createdTrade = makeTrade();
    const { id, ...data } = createdTrade;
    const tradeDocRef = {
      get: vi.fn().mockResolvedValue({ id, data: () => data }),
    };
    mockAdd.mockResolvedValue(tradeDocRef);

    const { trade, evaluation } = await createWebTrade(baseInput);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        proposerId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        expiresAt: expect.any(Date),
      }),
    );
    expect(trade.id).toBe('trade-1');
    expect(evaluation).toBeNull(); // user-to-user → no CPU evaluation
  });

  it('creates a CPU trade without expiresAt and returns evaluation', async () => {
    mockDraftDoc(makeDraft());
    const cpuTrade = makeTrade({ recipientId: null });
    const { id, ...data } = cpuTrade;
    const tradeDocRef = {
      get: vi.fn().mockResolvedValue({ id, data: () => data }),
    };
    mockAdd.mockResolvedValue(tradeDocRef);

    const { trade, evaluation } = await createWebTrade({
      ...baseInput,
      recipientId: null,
    });

    const addArg = mockAdd.mock.calls[0][0];
    expect(addArg.expiresAt).toBeUndefined();
    expect(trade.recipientId).toBeNull();
    // evaluation should be the result of evaluateCpuTrade (real function)
    expect(evaluation).not.toBeNull();
  });
});

// ============ executeWebTrade ============

describe('executeWebTrade', () => {
  it('runs transaction and updates trade + draft', async () => {
    const trade = makeTrade();
    const draft = makeDraft();

    mockRunTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txGet = vi
          .fn()
          .mockResolvedValueOnce({
            exists: true,
            id: trade.id,
            data: () => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id: _id, ...data } = trade;
              return data;
            },
          })
          .mockResolvedValueOnce({
            exists: true,
            id: draft.id,
            data: () => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id: _id, ...data } = draft;
              return data;
            },
          });
        const txUpdate = vi.fn();
        const tx = { get: txGet, update: txUpdate };
        return fn(tx);
      },
    );

    const result = await executeWebTrade('trade-1', 'draft-1');

    expect(result.id).toBe('draft-1');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it('throws when trade not found', async () => {
    mockRunTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txGet = vi.fn().mockResolvedValue({ exists: false });
        return fn({ get: txGet, update: vi.fn() });
      },
    );

    await expect(executeWebTrade('trade-1', 'draft-1')).rejects.toThrow(
      'Trade not found',
    );
  });

  it('throws when trade is not pending', async () => {
    const trade = makeTrade({ status: 'accepted' });
    mockRunTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txGet = vi
          .fn()
          .mockResolvedValueOnce({
            exists: true,
            id: trade.id,
            data: () => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id: _id, ...data } = trade;
              return data;
            },
          })
          .mockResolvedValueOnce({
            exists: true,
            id: 'draft-1',
            data: () => ({ ...makeDraft() }),
          });
        return fn({ get: txGet, update: vi.fn() });
      },
    );

    await expect(executeWebTrade('trade-1', 'draft-1')).rejects.toThrow(
      'Trade is not pending',
    );
  });
});

// ============ rejectWebTrade ============

describe('rejectWebTrade', () => {
  it('rejects trade when user is the recipient', async () => {
    mockTradeDoc(makeTrade({ recipientId: 'user-2' }));

    await rejectWebTrade('trade-1', 'user-2');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
    );
  });

  it('throws when user is not the recipient', async () => {
    mockTradeDoc(makeTrade({ recipientId: 'user-2' }));

    await expect(rejectWebTrade('trade-1', 'user-1')).rejects.toThrow(
      'Not authorized',
    );
  });

  it('throws when trade not found', async () => {
    mockTradeDoc(null);

    await expect(rejectWebTrade('trade-1', 'user-2')).rejects.toThrow(
      'Trade not found',
    );
  });

  it('throws when trade is not pending', async () => {
    mockTradeDoc(makeTrade({ status: 'accepted', recipientId: 'user-2' }));

    await expect(rejectWebTrade('trade-1', 'user-2')).rejects.toThrow(
      'Trade is not pending',
    );
  });
});

// ============ cancelWebTrade ============

describe('cancelWebTrade', () => {
  it('cancels trade when user is the proposer', async () => {
    mockTradeDoc(makeTrade({ proposerId: 'user-1' }));

    await cancelWebTrade('trade-1', 'user-1');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  it('throws when user is not the proposer', async () => {
    mockTradeDoc(makeTrade({ proposerId: 'user-1' }));

    await expect(cancelWebTrade('trade-1', 'user-2')).rejects.toThrow(
      'Not authorized',
    );
  });

  it('throws when trade not found', async () => {
    mockTradeDoc(null);

    await expect(cancelWebTrade('trade-1', 'user-1')).rejects.toThrow(
      'Trade not found',
    );
  });

  it('throws when trade is not pending', async () => {
    mockTradeDoc(makeTrade({ status: 'rejected', proposerId: 'user-1' }));

    await expect(cancelWebTrade('trade-1', 'user-1')).rejects.toThrow(
      'Trade is not pending',
    );
  });
});

// ============ isTradeExpired ============

describe('isTradeExpired', () => {
  it('returns false when trade has no expiresAt', () => {
    const trade = makeTrade({ expiresAt: undefined });

    expect(isTradeExpired(trade)).toBe(false);
  });

  it('returns true when current time is past expiresAt', () => {
    const ts = { seconds: 1000, nanoseconds: 0 } as FirestoreTimestamp;
    const trade = makeTrade({ expiresAt: ts });
    mockExtractTimestampMs.mockReturnValue(1000);
    vi.spyOn(Date, 'now').mockReturnValue(2000);

    expect(isTradeExpired(trade)).toBe(true);

    vi.restoreAllMocks();
  });

  it('returns false when current time is before expiresAt', () => {
    const ts = { seconds: 1000, nanoseconds: 0 } as FirestoreTimestamp;
    const trade = makeTrade({ expiresAt: ts });
    mockExtractTimestampMs.mockReturnValue(5000);
    vi.spyOn(Date, 'now').mockReturnValue(2000);

    expect(isTradeExpired(trade)).toBe(false);

    vi.restoreAllMocks();
  });
});
