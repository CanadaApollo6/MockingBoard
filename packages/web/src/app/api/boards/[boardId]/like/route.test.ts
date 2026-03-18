/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockRunTransaction,
  mockGet,
  mockCollection,
  mockNotifyBoardLiked,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockDoc = vi.fn(() => ({ get: mockGet }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));

  return {
    mockGetSessionUser: vi.fn(),
    mockRunTransaction: vi.fn(),
    mockGet,
    mockCollection,
    mockNotifyBoardLiked: vi.fn().mockResolvedValue(undefined),
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
vi.mock('@/lib/notifications', () => ({
  notifyBoardLiked: mockNotifyBoardLiked,
}));
vi.mock('@/lib/activity', () => ({
  fanOutActivity: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST, DELETE } from './route.js';

function makeRequest(method: string) {
  return new Request('http://localhost/api/boards/board-1/like', { method });
}

const params = Promise.resolve({ boardId: 'board-1' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/boards/[boardId]/like', () => {
  it('returns isLiked false for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    mockCollection.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 5 }) }),
        }),
      }),
    });

    const res = await GET(makeRequest('GET'), { params });
    const json = await res.json();

    expect(json.isLiked).toBe(false);
    expect(json.likeCount).toBe(5);
  });

  it('returns isLiked true when user has liked', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });

    const likeDoc = { exists: true };
    const boardDoc = { data: () => ({ likeCount: 3 }) };

    mockGet.mockResolvedValueOnce(likeDoc).mockResolvedValueOnce(boardDoc);

    const res = await GET(makeRequest('GET'), { params });
    const json = await res.json();

    expect(json.isLiked).toBe(true);
    expect(json.likeCount).toBe(3);
  });
});

describe('POST /api/boards/[boardId]/like', () => {
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

  it('notifies board author on new like', async () => {
    mockGetSessionUser.mockResolvedValue({
      uid: 'user-1',
      name: 'Bob',
    });
    mockRunTransaction.mockResolvedValue({
      userId: 'author-2',
      name: 'Top 50 Board',
      slug: 'top-50-board',
    });

    await POST(makeRequest('POST'), { params });

    expect(mockNotifyBoardLiked).toHaveBeenCalledWith(
      'author-2',
      'Bob',
      'Top 50 Board',
      'top-50-board',
    );
  });

  it('does not notify when liking own board', async () => {
    mockGetSessionUser.mockResolvedValue({
      uid: 'author-2',
      name: 'Bob',
    });
    mockRunTransaction.mockResolvedValue({
      userId: 'author-2',
      name: 'My Board',
      slug: 'my-board',
    });

    await POST(makeRequest('POST'), { params });

    expect(mockNotifyBoardLiked).not.toHaveBeenCalled();
  });

  it('does not notify when already liked (null result)', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1', name: 'Bob' });
    mockRunTransaction.mockResolvedValue(null);

    await POST(makeRequest('POST'), { params });

    expect(mockNotifyBoardLiked).not.toHaveBeenCalled();
  });

  it('returns 404 when board not found', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockRejectedValue(new Error('Board not found'));

    const res = await POST(makeRequest('POST'), { params });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/boards/[boardId]/like', () => {
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
