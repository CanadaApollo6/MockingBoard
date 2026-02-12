/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockCreateWebTrade, mockGetDraftOrFail } =
  vi.hoisted(() => ({
    mockGetSessionUser: vi.fn(),
    mockCreateWebTrade: vi.fn(),
    mockGetDraftOrFail: vi.fn(),
  }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/draft-actions', () => ({
  createWebTrade: (...args: unknown[]) => mockCreateWebTrade(...args),
}));
vi.mock('@/lib/firebase/data', () => ({
  getDraftOrFail: (...args: unknown[]) => mockGetDraftOrFail(...args),
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
  return new Request('http://localhost/api/drafts/draft-1/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ draftId: 'draft-1' });

const validBody = {
  proposerTeam: 'NE',
  recipientTeam: 'DAL',
  proposerGives: [{ type: 'futurePick', year: 2027, round: 1, team: 'NE' }],
  proposerReceives: [{ type: 'futurePick', year: 2027, round: 1, team: 'DAL' }],
};

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    teamAssignments: {
      NE: 'user-1',
      DAL: 'user-2',
      NYG: null,
    } as Draft['teamAssignments'],
    ...overrides,
  } as Draft;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
  mockGetDraftOrFail.mockResolvedValue(makeDraft());
  mockCreateWebTrade.mockResolvedValue({
    trade: { id: 'trade-1' },
    evaluation: null,
  });
});

describe('POST /api/drafts/[draftId]/trade', () => {
  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/drafts/draft-1/trade', {
      method: 'POST',
      body: 'not-json',
    });

    const res = await POST(req, { params });

    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not control proposerTeam', async () => {
    mockGetDraftOrFail.mockResolvedValue(
      makeDraft({
        teamAssignments: {
          NE: 'other-user',
          DAL: 'user-1',
        } as Draft['teamAssignments'],
      }),
    );

    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'You do not control that team' });
  });

  it('creates trade and returns result', async () => {
    const res = await POST(makeRequest(validBody), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.trade.id).toBe('trade-1');
    expect(json.evaluation).toBeNull();
  });

  it('derives null recipientId for CPU teams', async () => {
    await POST(makeRequest({ ...validBody, recipientTeam: 'NYG' }), { params });

    expect(mockCreateWebTrade).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: null }),
    );
  });

  it('derives userId for human-controlled teams', async () => {
    await POST(makeRequest(validBody), { params });

    expect(mockCreateWebTrade).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'user-2' }),
    );
  });
});
