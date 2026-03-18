/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockIsAdmin,
  mockCollection,
  mockNotifyContentRemoved,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }));
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
  }));
  const mockCollection = vi.fn(() => ({
    where: mockWhere,
    doc: mockDoc,
  }));

  return {
    mockGetSessionUser: vi.fn(),
    mockIsAdmin: vi.fn(),
    mockCollection,
    mockDoc,
    mockGet,
    mockUpdate,
    mockWhere,
    mockOrderBy,
    mockLimit,
    mockNotifyContentRemoved: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/admin', () => ({
  isAdmin: (uid: string) => mockIsAdmin(uid),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('@/lib/notifications', () => ({
  notifyContentRemoved: (...args: unknown[]) =>
    mockNotifyContentRemoved(...args),
}));

import { GET, POST } from './route.js';

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/moderation');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url);
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/moderation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/moderation', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it('returns moderation items', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);

    const snapshot = {
      docs: [
        {
          id: 'mod-1',
          data: () => ({
            contentType: 'board',
            contentId: 'b-1',
            contentPreview: 'Bad board',
            authorId: 'u-2',
            authorName: 'Bob',
            status: 'pending',
            reportCount: 2,
          }),
        },
      ],
    };

    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
    mockCollection.mockReturnValueOnce({ where: whereFn });

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].contentType).toBe('board');
  });
});

describe('POST /api/admin/moderation', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(makePostRequest({ id: 'x', action: 'approve' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makePostRequest({ id: 'x', action: 'approve' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing id or action', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makePostRequest({ id: 'x' }));
    expect(res.status).toBe(400);
  });

  it('approves content without sending notification', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockModDoc = vi.fn(() => ({ update: mockUpdate, get: vi.fn() }));
    mockCollection.mockReturnValueOnce({ doc: mockModDoc });

    const res = await POST(makePostRequest({ id: 'mod-1', action: 'approve' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockNotifyContentRemoved).not.toHaveBeenCalled();
  });

  it('removes content and notifies author', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockGet = vi.fn().mockResolvedValue({
      data: () => ({
        authorId: 'u-2',
        contentType: 'board',
      }),
    });
    const mockModDoc = vi.fn(() => ({ update: mockUpdate, get: mockGet }));
    mockCollection.mockReturnValueOnce({ doc: mockModDoc });

    const res = await POST(makePostRequest({ id: 'mod-1', action: 'remove' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockNotifyContentRemoved).toHaveBeenCalledWith('u-2', 'board');
  });
});
