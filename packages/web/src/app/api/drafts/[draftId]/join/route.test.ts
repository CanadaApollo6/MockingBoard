/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockResolveUser, mockJoinLobby } = vi.hoisted(
  () => ({
    mockGetSessionUser: vi.fn(),
    mockResolveUser: vi.fn(),
    mockJoinLobby: vi.fn(),
  }),
);

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/user-resolve', () => ({
  resolveUser: (...args: unknown[]) => mockResolveUser(...args),
}));
vi.mock('@/lib/lobby-actions', () => ({
  joinLobby: (...args: unknown[]) => mockJoinLobby(...args),
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

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/drafts/draft-1/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ draftId: 'draft-1' });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
  mockResolveUser.mockResolvedValue({
    displayName: 'Player 1',
    discordId: 'discord-1',
  });
  mockJoinLobby.mockResolvedValue({ team: 'NE', displayName: 'Player 1' });
});

describe('POST /api/drafts/[draftId]/join', () => {
  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ team: 'NE' }), { params });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'not-json',
    });

    const res = await POST(req, { params });

    expect(res.status).toBe(400);
  });

  it('calls joinLobby with correct params and returns result', async () => {
    const res = await POST(makeRequest({ team: 'NE' }), { params });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ team: 'NE', displayName: 'Player 1' });
    expect(mockJoinLobby).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: 'draft-1',
        userId: 'user-1',
        displayName: 'Player 1',
        team: 'NE',
      }),
    );
  });

  it('passes inviteCode when provided', async () => {
    await POST(makeRequest({ team: 'NE', inviteCode: 'abc' }), { params });

    expect(mockJoinLobby).toHaveBeenCalledWith(
      expect.objectContaining({ inviteCode: 'abc' }),
    );
  });

  it('returns error when joinLobby throws', async () => {
    mockJoinLobby.mockRejectedValue(new Error('Draft not found'));

    const res = await POST(makeRequest({ team: 'NE' }), { params });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Draft not found' });
  });
});
