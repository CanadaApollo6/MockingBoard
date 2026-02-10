/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockGetDraftOrFail, mockBatchCommit } = vi.hoisted(
  () => ({
    mockGetSessionUser: vi.fn(),
    mockGetDraftOrFail: vi.fn(),
    mockBatchCommit: vi.fn(),
  }),
);

const mockBatchSet = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatch = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
};

const mockPicksDoc = vi.fn(() => ({ id: 'auto-id' }));
const mockDraftDoc = vi.fn(() => ({
  collection: () => ({ doc: mockPicksDoc }),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/data', () => ({
  getDraftOrFail: (...args: unknown[]) => mockGetDraftOrFail(...args),
}));
vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({ doc: mockDraftDoc }),
    batch: () => mockBatch,
  },
}));
vi.mock('@/lib/validate', () => ({
  AppError: class AppError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
  safeError: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { POST } from './route.js';
import type { Draft } from '@mockingboard/shared';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/drafts/draft-1/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ draftId: 'draft-1' });

const validBody = {
  status: 'active',
  currentPick: 5,
  currentRound: 1,
  pickedPlayerIds: ['p1', 'p2', 'p3', 'p4'],
  pickOrder: [],
  picks: [
    {
      draftId: 'draft-1',
      overall: 4,
      round: 1,
      pick: 4,
      team: 'DAL',
      userId: null,
      playerId: 'p4',
    },
  ],
  reason: 'round-boundary',
};

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    participants: { 'user-1': 'user-1' },
    teamAssignments: {
      NE: 'user-1',
      DAL: null,
    } as Draft['teamAssignments'],
    ...overrides,
  } as Draft;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
  mockGetDraftOrFail.mockResolvedValue(makeDraft());
  mockBatchCommit.mockResolvedValue(undefined);
});

describe('POST /api/drafts/[draftId]/sync', () => {
  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/drafts/draft-1/sync', {
      method: 'POST',
      body: 'not-json',
    });

    const res = await POST(req, { params });

    expect(res.status).toBe(400);
  });

  it('returns 403 when draft has multiple participants', async () => {
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        participants: { 'user-1': 'user-1', 'user-2': 'user-2' },
      }),
    );

    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(403);
  });

  it('returns 403 when sole participant is not the session user', async () => {
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        participants: { 'other-user': 'other-user' },
      }),
    );

    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(403);
  });

  it('commits batch with draft update and pick docs', async () => {
    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Draft update
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'active',
        currentPick: 5,
        currentRound: 1,
        pickedPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      }),
    );

    // Pick doc
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        draftId: 'draft-1',
        overall: 4,
        playerId: 'p4',
        userId: null,
      }),
    );

    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('handles empty picks array (status-only update)', async () => {
    const pauseBody = { ...validBody, status: 'paused', picks: [] };

    const res = await POST(makeRequest(pauseBody), { params });

    expect(res.status).toBe(200);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('includes futurePicks in draft update when provided', async () => {
    const bodyWithFuturePicks = {
      ...validBody,
      futurePicks: [{ year: 2027, round: 1, team: 'NE', ownerTeam: 'DAL' }],
    };

    const res = await POST(makeRequest(bodyWithFuturePicks), { params });

    expect(res.status).toBe(200);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        futurePicks: [{ year: 2027, round: 1, team: 'NE', ownerTeam: 'DAL' }],
      }),
    );
  });
});
