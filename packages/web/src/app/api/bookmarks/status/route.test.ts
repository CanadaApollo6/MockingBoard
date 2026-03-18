/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockCollection, mockGetAll } = vi.hoisted(() => {
  const mockDoc = vi.fn((id: string) => ({ id, path: `bookmarks/${id}` }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  const mockGetAll = vi.fn();

  return {
    mockGetSessionUser: vi.fn(),
    mockCollection,
    mockGetAll,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: {
    collection: mockCollection,
    getAll: mockGetAll,
  },
}));

import { GET } from './route.js';

function makeRequest(ids: string, targetType: string) {
  return new Request(
    `http://localhost/api/bookmarks/status?ids=${ids}&targetType=${targetType}`,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/bookmarks/status', () => {
  it('returns empty for unauthenticated user', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    const res = await GET(makeRequest('a,b', 'board'));
    const data = await res.json();
    expect(data.bookmarkedIds).toEqual([]);
  });

  it('returns bookmarked IDs', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    mockGetAll.mockResolvedValue([
      { exists: true, data: () => ({ targetId: 'a' }) },
      { exists: false, data: () => null },
      { exists: true, data: () => ({ targetId: 'c' }) },
    ]);

    const res = await GET(makeRequest('a,b,c', 'board'));
    const data = await res.json();
    expect(data.bookmarkedIds).toEqual(['a', 'c']);
  });

  it('returns empty when no ids provided', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u1' });
    const res = await GET(makeRequest('', 'board'));
    const data = await res.json();
    expect(data.bookmarkedIds).toEqual([]);
  });
});
