/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockCollection,
  mockDocGet,
  mockDocSet,
  mockDocDelete,
  mockQueryGet,
} = vi.hoisted(() => {
  const mockDocGet = vi.fn();
  const mockDocSet = vi.fn().mockResolvedValue(undefined);
  const mockDocDelete = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({
    get: mockDocGet,
    set: mockDocSet,
    delete: mockDocDelete,
  }));
  const mockQueryGet = vi.fn();
  const mockLimit = vi.fn(() => ({ get: mockQueryGet }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    where: mockWhere,
  }));

  return {
    mockGetSessionUser: vi.fn(),
    mockCollection,
    mockDoc,
    mockDocGet,
    mockDocSet,
    mockDocDelete,
    mockWhere,
    mockOrderBy,
    mockLimit,
    mockQueryGet,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));

import { GET, POST, DELETE } from './route.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/watchlist', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(
      new Request('http://localhost/api/watchlist?year=2026'),
    );
    expect(res.status).toBe(401);
  });

  it('returns isWatching when playerId is provided', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: true });

    const res = await GET(
      new Request('http://localhost/api/watchlist?playerId=p1'),
    );
    const data = await res.json();
    expect(data.isWatching).toBe(true);
  });

  it('returns isWatching false when not watching', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await GET(
      new Request('http://localhost/api/watchlist?playerId=p1'),
    );
    const data = await res.json();
    expect(data.isWatching).toBe(false);
  });

  it('returns 400 when no year or playerId', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await GET(new Request('http://localhost/api/watchlist'));
    expect(res.status).toBe(400);
  });

  it('returns items for year query', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockQueryGet.mockResolvedValue({
      docs: [
        {
          id: 'u1_p1',
          data: () => ({ userId: 'u1', playerId: 'p1', year: 2026 }),
        },
      ],
    });

    const res = await GET(
      new Request('http://localhost/api/watchlist?year=2026'),
    );
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].playerId).toBe('p1');
  });
});

describe('POST /api/watchlist', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(
      new Request('http://localhost/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'p1', year: 2026 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates watchlist item', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await POST(
      new Request('http://localhost/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'p1', year: 2026 }),
      }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDocSet).toHaveBeenCalled();
  });

  it('is idempotent when already watching', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: true });

    const res = await POST(
      new Request('http://localhost/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'p1', year: 2026 }),
      }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it('returns 400 when missing fields', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await POST(
      new Request('http://localhost/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'p1' }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/watchlist', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await DELETE(
      new Request('http://localhost/api/watchlist?playerId=p1', {
        method: 'DELETE',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('deletes watchlist item', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await DELETE(
      new Request('http://localhost/api/watchlist?playerId=p1', {
        method: 'DELETE',
      }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDocDelete).toHaveBeenCalled();
  });

  it('returns 400 when missing playerId', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await DELETE(
      new Request('http://localhost/api/watchlist', { method: 'DELETE' }),
    );
    expect(res.status).toBe(400);
  });
});
