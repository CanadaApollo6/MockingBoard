/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockIsAdmin,
  mockCollection,
  mockGetCachedPlayers,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockBatch = vi.fn(() => ({
    set: mockSet,
    commit: vi.fn().mockResolvedValue(undefined),
  }));
  const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }));
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockOrderBy = vi.fn(() => ({ get: mockGet }));
  const mockWhere = vi.fn(() => ({
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
    get: mockGet,
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
    mockSet,
    mockUpdate,
    mockBatch,
    mockWhere,
    mockLimit,
    mockOrderBy,
    mockGetCachedPlayers: vi.fn().mockResolvedValue([]),
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
  adminDb: {
    collection: mockCollection,
    batch: () => ({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));
vi.mock('@/lib/cache', () => ({
  getCachedPlayers: (...args: unknown[]) => mockGetCachedPlayers(...args),
}));

import { GET, POST } from './route.js';

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/scoring');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url);
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/scoring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/scoring', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(makeGetRequest({ year: '2025' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(makeGetRequest({ year: '2025' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when year is missing', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/scoring', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(makePostRequest({ year: 2025 }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makePostRequest({ year: 2025 }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when year is missing', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when no actual results exist', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'admin-1' });
    mockIsAdmin.mockResolvedValue(true);

    // draftResults doc does not exist
    const mockResultsGet = vi.fn().mockResolvedValue({ exists: false });
    const mockResultsDoc = vi.fn(() => ({ get: mockResultsGet }));
    mockCollection.mockReturnValueOnce({ doc: mockResultsDoc });

    const res = await POST(makePostRequest({ year: 2025 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No actual results');
  });
});
