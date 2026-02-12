/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockRateLimit,
  mockRecordPick,
  mockRunCpuCascade,
  mockGetDraftOrFail,
  mockCollection,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockRateLimit: vi.fn().mockReturnValue(true),
  mockRecordPick: vi.fn(),
  mockRunCpuCascade: vi.fn(),
  mockGetDraftOrFail: vi.fn(),
  mockCollection: vi.fn(() => ({
    doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue({}) })),
  })),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));
vi.mock('@/lib/draft-actions', () => ({
  recordPick: (...args: unknown[]) => mockRecordPick(...args),
  runCpuCascade: (...args: unknown[]) => mockRunCpuCascade(...args),
}));
vi.mock('@/lib/firebase/data', () => ({
  getDraftOrFail: (...args: unknown[]) => mockGetDraftOrFail(...args),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('@/lib/cache', () => ({
  getCachedPlayerMap: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('@/lib/discord-webhook', () => ({
  resolveWebhookConfig: vi.fn().mockResolvedValue(null),
  sendPickAnnouncement: vi.fn(),
  sendDraftComplete: vi.fn(),
}));
vi.mock('@/lib/firebase/sanitize', () => ({
  hydrateDoc: (doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    ...doc.data(),
  }),
}));
vi.mock('@/lib/notifications', () => ({
  notifyYourTurn: vi.fn(),
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
// @mockingboard/shared is NOT mocked — real getPickController runs.
// Use draft fixtures with correct teamAssignments to control behavior.

import { POST } from './route.js';
import type { Draft, TeamAbbreviation, Pick } from '@mockingboard/shared';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/drafts/draft-1/pick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ draftId: 'draft-1' });

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    status: 'active',
    currentPick: 1,
    currentRound: 1,
    config: {
      rounds: 1,
      format: 'full',
      year: 2026,
      cpuSpeed: 'normal',
      secondsPerPick: 0,
      tradesEnabled: false,
    },
    pickOrder: [
      { overall: 1, round: 1, pick: 1, team: 'NE' as TeamAbbreviation },
    ],
    teamAssignments: { NE: 'user-1' } as Draft['teamAssignments'],
    ...overrides,
  } as Draft;
}

function makePick(overrides: Partial<Pick> = {}): Pick {
  return {
    id: 'pick-1',
    draftId: 'draft-1',
    overall: 1,
    round: 1,
    pick: 1,
    team: 'NE' as TeamAbbreviation,
    userId: 'user-1',
    playerId: 'player-1',
    createdAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  } as Pick;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
  mockRateLimit.mockReturnValue(true);
  // Default: NE assigned to user-1, so getPickController returns 'user-1'
  mockGetDraftOrFail.mockResolvedValue(makeDraft());
  mockRecordPick.mockResolvedValue({
    pick: makePick(),
    isComplete: false,
  });
});

describe('POST /api/drafts/[draftId]/pick', () => {
  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ playerId: 'p1' }), { params });

    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue(false);

    const res = await POST(makeRequest({ playerId: 'p1' }), { params });

    expect(res.status).toBe(429);
  });

  it('returns 400 when body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/drafts/draft-1/pick', {
      method: 'POST',
      body: 'not-json',
    });

    const res = await POST(req, { params });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid request body' });
  });

  it('returns 400 when playerId is missing', async () => {
    const res = await POST(makeRequest({}), { params });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing playerId' });
  });

  it('returns 400 when draft is not active', async () => {
    mockGetDraftOrFail.mockResolvedValue(makeDraft({ status: 'paused' }));

    const res = await POST(makeRequest({ playerId: 'p1' }), { params });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Draft is not active' });
  });

  it("returns 403 when not the user's turn", async () => {
    // NE is assigned to 'other-user', so getPickController returns 'other-user'
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        teamAssignments: { NE: 'other-user' } as Draft['teamAssignments'],
      }),
    );

    const res = await POST(makeRequest({ playerId: 'p1' }), { params });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Not your turn' });
  });

  it('records pick and returns result', async () => {
    const res = await POST(makeRequest({ playerId: 'player-1' }), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pick.playerId).toBe('player-1');
    expect(json.isComplete).toBe(false);
    expect(mockRecordPick).toHaveBeenCalledWith(
      'draft-1',
      'player-1',
      'user-1',
    );
  });

  it('runs CPU cascade when cpuSpeed is instant and trades disabled', async () => {
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        config: {
          rounds: 1,
          format: 'full',
          year: 2026,
          cpuSpeed: 'instant',
          secondsPerPick: 0,
          tradesEnabled: false,
        },
      }),
    );
    mockRunCpuCascade.mockResolvedValue({
      picks: [makePick({ id: 'cpu-1', userId: null })],
      isComplete: true,
    });

    const res = await POST(makeRequest({ playerId: 'p1' }), { params });
    const json = await res.json();

    expect(mockRunCpuCascade).toHaveBeenCalledWith('draft-1');
    expect(json.isComplete).toBe(true);
  });

  it('does not run CPU cascade when trades are enabled', async () => {
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        config: {
          rounds: 1,
          format: 'full',
          year: 2026,
          cpuSpeed: 'instant',
          secondsPerPick: 0,
          tradesEnabled: true,
        },
      }),
    );

    await POST(makeRequest({ playerId: 'p1' }), { params });

    expect(mockRunCpuCascade).not.toHaveBeenCalled();
  });

  it('does not run CPU cascade for non-instant speed', async () => {
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        config: {
          rounds: 1,
          format: 'full',
          year: 2026,
          cpuSpeed: 'normal',
          secondsPerPick: 0,
          tradesEnabled: false,
        },
      }),
    );

    await POST(makeRequest({ playerId: 'p1' }), { params });

    expect(mockRunCpuCascade).not.toHaveBeenCalled();
  });
});
