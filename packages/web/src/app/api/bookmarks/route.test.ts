/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockCollection,
  mockDocGet,
  mockDocSet,
  mockDocDelete,
} = vi.hoisted(() => {
  const mockDocGet = vi.fn();
  const mockDocSet = vi.fn().mockResolvedValue(undefined);
  const mockDocDelete = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({
    get: mockDocGet,
    set: mockDocSet,
    delete: mockDocDelete,
  }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));

  return {
    mockGetSessionUser: vi.fn(),
    mockCollection,
    mockDoc,
    mockDocGet,
    mockDocSet,
    mockDocDelete,
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

function makeGetRequest(targetId: string, targetType: string) {
  return new Request(
    `http://localhost/api/bookmarks?targetId=${targetId}&targetType=${targetType}`,
  );
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(targetId: string, targetType: string) {
  return new Request(
    `http://localhost/api/bookmarks?targetId=${targetId}&targetType=${targetType}`,
    { method: 'DELETE' },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/bookmarks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(makeGetRequest('board-1', 'board'));
    expect(res.status).toBe(401);
  });

  it('returns isBookmarked true when bookmarked', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: true });

    const res = await GET(makeGetRequest('board-1', 'board'));
    const data = await res.json();
    expect(data.isBookmarked).toBe(true);
  });

  it('returns isBookmarked false when not bookmarked', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await GET(makeGetRequest('board-1', 'board'));
    const data = await res.json();
    expect(data.isBookmarked).toBe(false);
  });

  it('returns 400 for invalid targetType', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await GET(makeGetRequest('id', 'invalid'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/bookmarks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await POST(
      makePostRequest({ targetId: 'b1', targetType: 'board' }),
    );
    expect(res.status).toBe(401);
  });

  it('creates bookmark and returns ok', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: false });

    const res = await POST(
      makePostRequest({ targetId: 'b1', targetType: 'board' }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDocSet).toHaveBeenCalled();
  });

  it('returns ok if already bookmarked (idempotent)', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockDocGet.mockResolvedValue({ exists: true });

    const res = await POST(
      makePostRequest({ targetId: 'b1', targetType: 'board' }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDocSet).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/bookmarks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest('b1', 'board'));
    expect(res.status).toBe(401);
  });

  it('deletes bookmark and returns ok', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });

    const res = await DELETE(makeDeleteRequest('b1', 'board'));
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDocDelete).toHaveBeenCalled();
  });
});
