/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetSessionUser, mockRunTransaction, mockGet, mockCollection } =
  vi.hoisted(() => {
    const mockGet = vi.fn();
    const mockDoc = vi.fn(() => ({ get: mockGet }));
    const mockCollection = vi.fn(() => ({ doc: mockDoc }));

    return {
      mockGetSessionUser: vi.fn(),
      mockRunTransaction: vi.fn(),
      mockGet,
      mockCollection,
    };
  });

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/auth-session', () => ({
  getSessionUser: () => mockGetSessionUser(),
}));
vi.mock('@/lib/firebase/firebase-admin', () => ({
  adminDb: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  },
}));

import { GET, POST, DELETE } from './route.js';

function makeRequest(method: string) {
  return new Request('http://localhost/api/lists/list-1/like', { method });
}

const params = Promise.resolve({ listId: 'list-1' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/lists/[listId]/like', () => {
  it('returns isLiked false for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    mockCollection.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 3 }) }),
        }),
      }),
    });

    const res = await GET(makeRequest('GET'), { params });
    const json = await res.json();

    expect(json.isLiked).toBe(false);
    expect(json.likeCount).toBe(3);
  });

  it('returns isLiked true when user has liked', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });

    const likeDoc = { exists: true };
    const listDoc = { data: () => ({ likeCount: 5 }) };

    mockGet.mockResolvedValueOnce(likeDoc).mockResolvedValueOnce(listDoc);

    const res = await GET(makeRequest('GET'), { params });
    const json = await res.json();

    expect(json.isLiked).toBe(true);
    expect(json.likeCount).toBe(5);
  });
});

describe('POST /api/lists/[listId]/like', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(makeRequest('POST'), { params });

    expect(res.status).toBe(401);
  });

  it('creates a like via transaction', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockResolvedValue(undefined);

    const res = await POST(makeRequest('POST'), { params });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when list not found', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockRejectedValue(new Error('List not found'));

    const res = await POST(makeRequest('POST'), { params });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/lists/[listId]/like', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await DELETE(makeRequest('DELETE'), { params });

    expect(res.status).toBe(401);
  });

  it('removes a like via transaction', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest('DELETE'), { params });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });
});
