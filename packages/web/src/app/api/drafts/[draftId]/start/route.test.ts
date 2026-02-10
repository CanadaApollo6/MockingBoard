/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockStartDraft } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockStartDraft: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/lobby-actions', () => ({
  startDraft: (...args: unknown[]) => mockStartDraft(...args),
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

const params = Promise.resolve({ draftId: 'draft-1' });
const dummyRequest = new Request('http://localhost/api/drafts/draft-1/start', {
  method: 'POST',
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
  mockStartDraft.mockResolvedValue({ started: true });
});

describe('POST /api/drafts/[draftId]/start', () => {
  it('returns 401 when no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(dummyRequest, { params });

    expect(res.status).toBe(401);
  });

  it('calls startDraft with draftId and userId', async () => {
    const res = await POST(dummyRequest, { params });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ started: true });
    expect(mockStartDraft).toHaveBeenCalledWith('draft-1', 'user-1');
  });

  it('returns error when startDraft throws', async () => {
    mockStartDraft.mockRejectedValue(
      new Error('Only the creator can start the draft'),
    );

    const res = await POST(dummyRequest, { params });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Only the creator can start the draft',
    });
  });
});
