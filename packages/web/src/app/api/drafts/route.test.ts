/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockRateLimit,
  mockBuildPickOrder,
  mockBuildFuturePicks,
  mockCreateWebDraft,
  mockResolveUser,
  mockSendDraftStarted,
  mockCollection,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockRateLimit: vi.fn().mockReturnValue(true),
  mockBuildPickOrder: vi.fn(),
  mockBuildFuturePicks: vi.fn(),
  mockCreateWebDraft: vi.fn(),
  mockResolveUser: vi.fn(),
  mockSendDraftStarted: vi.fn(),
  mockCollection: vi.fn(() => ({
    doc: vi.fn(() => ({ update: vi.fn() })),
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
  buildPickOrder: (...args: unknown[]) => mockBuildPickOrder(...args),
  buildFuturePicks: (...args: unknown[]) => mockBuildFuturePicks(...args),
  createWebDraft: (...args: unknown[]) => mockCreateWebDraft(...args),
}));
vi.mock('@/lib/user-resolve', () => ({
  resolveUser: (...args: unknown[]) => mockResolveUser(...args),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('@/lib/discord-webhook', () => ({
  sendDraftStarted: (...args: unknown[]) => mockSendDraftStarted(...args),
}));

import { POST } from './route.js';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  year: 2026,
  rounds: 3,
  format: 'full',
  selectedTeam: 'NE',
  cpuSpeed: 'normal',
  tradesEnabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
  mockRateLimit.mockReturnValue(true);
  mockBuildPickOrder.mockResolvedValue([]);
  mockBuildFuturePicks.mockResolvedValue([]);
  mockResolveUser.mockResolvedValue({
    discordId: 'discord-1',
    displayName: 'Player 1',
  });
  mockCreateWebDraft.mockResolvedValue({ id: 'draft-1' });
});

describe('POST /api/drafts', () => {
  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue(false);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(429);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/drafts', {
      method: 'POST',
      body: 'not-json',
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid request body' });
  });

  it('returns 400 when missing required fields', async () => {
    const res = await POST(makeRequest({ year: 2026 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing required fields' });
  });

  it('returns 400 when multiplayer without selectedTeam', async () => {
    const res = await POST(
      makeRequest({ ...validBody, multiplayer: true, selectedTeam: null }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Team selection required for multiplayer drafts',
    });
  });

  it('returns 400 when single-team without selectedTeam', async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        format: 'single-team',
        selectedTeam: null,
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Team selection required for single-team format',
    });
  });

  it('returns 400 when multi-team with fewer than 2 teams', async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        format: 'multi-team',
        selectedTeams: ['NE'],
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'At least 2 teams required for multi-team format',
    });
  });

  it('creates draft and returns draftId on success', async () => {
    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ draftId: 'draft-1' });
    expect(mockBuildPickOrder).toHaveBeenCalledWith(3, 2026);
    expect(mockCreateWebDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        config: expect.objectContaining({ rounds: 3, year: 2026 }),
      }),
    );
  });

  it('builds future picks when trades enabled', async () => {
    await POST(makeRequest({ ...validBody, tradesEnabled: true }));

    expect(mockBuildFuturePicks).toHaveBeenCalledWith(2026, 3);
  });

  it('skips future picks when trades disabled', async () => {
    await POST(makeRequest({ ...validBody, tradesEnabled: false }));

    expect(mockBuildFuturePicks).not.toHaveBeenCalled();
  });
});
