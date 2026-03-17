/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const {
  mockGetSessionUser,
  mockRunTransaction,
  mockCollection,
  mockNotifyNewComment,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
  const mockDoc = vi.fn(() => ({ get: mockGet }));
  const mockCollection = vi.fn(() => ({
    where: mockWhere,
    doc: mockDoc,
  }));

  return {
    mockGetSessionUser: vi.fn(),
    mockRunTransaction: vi.fn(),
    mockCollection,
    mockGet,
    mockWhere,
    mockOrderBy,
    mockLimit,
    mockNotifyNewComment: vi.fn().mockResolvedValue(undefined),
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
vi.mock('@/lib/firebase/sanitize', () => ({
  sanitize: <T>(v: T) => v,
}));
vi.mock('@/lib/notifications', () => ({
  notifyNewComment: mockNotifyNewComment,
}));
vi.mock('@/lib/activity', () => ({
  fanOutActivity: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from './route.js';

function makeGetRequest(targetId: string, targetType: string) {
  return new Request(
    `http://localhost/api/comments?targetId=${targetId}&targetType=${targetType}`,
  );
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/comments', () => {
  it('returns 400 when targetId or targetType is missing', async () => {
    const res = await GET(
      new Request('http://localhost/api/comments?targetId=x'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid targetType', async () => {
    const res = await GET(makeGetRequest('x', 'invalid'));
    expect(res.status).toBe(400);
  });

  it('returns comments ordered by createdAt', async () => {
    const snapshot = {
      docs: [
        {
          id: 'c-1',
          data: () => ({
            targetId: 'b-1',
            targetType: 'board',
            authorId: 'u-1',
            authorName: 'Alice',
            text: 'Great board!',
            createdAt: { seconds: 200 },
          }),
        },
        {
          id: 'c-2',
          data: () => ({
            targetId: 'b-1',
            targetType: 'board',
            authorId: 'u-2',
            authorName: 'Bob',
            text: 'Nice picks',
            createdAt: { seconds: 100 },
          }),
        },
      ],
    };

    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn2 = vi.fn().mockReturnValue({ orderBy: orderByFn });
    const whereFn1 = vi.fn().mockReturnValue({ where: whereFn2 });
    mockCollection.mockReturnValueOnce({ where: whereFn1 });

    const res = await GET(makeGetRequest('b-1', 'board'));
    const json = await res.json();

    expect(json.comments).toHaveLength(2);
    expect(json.comments[0].id).toBe('c-1');
    expect(json.comments[1].id).toBe('c-2');
  });

  it('returns empty array when no comments', async () => {
    const snapshot = { docs: [] };
    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn2 = vi.fn().mockReturnValue({ orderBy: orderByFn });
    const whereFn1 = vi.fn().mockReturnValue({ where: whereFn2 });
    mockCollection.mockReturnValueOnce({ where: whereFn1 });

    const res = await GET(makeGetRequest('b-1', 'board'));
    const json = await res.json();

    expect(json.comments).toEqual([]);
  });
});

describe('POST /api/comments', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await POST(
      makePostRequest({ targetId: 'b-1', targetType: 'board', text: 'Hi' }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing targetId', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });

    const res = await POST(
      makePostRequest({ targetType: 'board', text: 'Hi' }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid targetType', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });

    const res = await POST(
      makePostRequest({ targetId: 'b-1', targetType: 'draft', text: 'Hi' }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty text', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });

    const res = await POST(
      makePostRequest({ targetId: 'b-1', targetType: 'board', text: '  ' }),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for text exceeding 500 chars', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });

    const res = await POST(
      makePostRequest({
        targetId: 'b-1',
        targetType: 'board',
        text: 'x'.repeat(501),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('creates comment via transaction', async () => {
    mockGetSessionUser.mockResolvedValue({
      uid: 'u-1',
      name: 'Alice',
      email: 'alice@test.com',
    });
    mockRunTransaction.mockResolvedValue({
      commentId: 'c-new',
      authorName: 'Alice',
      authorSlug: 'alice',
      contentOwnerId: 'u-2',
      contentName: 'Top Board',
      contentSlug: 'top-board',
    });

    const res = await POST(
      makePostRequest({
        targetId: 'b-1',
        targetType: 'board',
        text: 'Great board!',
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.comment.text).toBe('Great board!');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it('notifies content owner on new comment', async () => {
    mockGetSessionUser.mockResolvedValue({
      uid: 'u-1',
      name: 'Alice',
    });
    mockRunTransaction.mockResolvedValue({
      commentId: 'c-new',
      authorName: 'Alice',
      contentOwnerId: 'u-2',
      contentName: 'Top Board',
      contentSlug: 'top-board',
    });

    await POST(
      makePostRequest({
        targetId: 'b-1',
        targetType: 'board',
        text: 'Nice!',
      }),
    );

    expect(mockNotifyNewComment).toHaveBeenCalledWith(
      'u-2',
      'Alice',
      'Top Board',
      '/boards/top-board',
      'board-commented',
    );
  });

  it('does not notify when commenting on own content', async () => {
    mockGetSessionUser.mockResolvedValue({
      uid: 'u-1',
      name: 'Alice',
    });
    mockRunTransaction.mockResolvedValue({
      commentId: 'c-new',
      authorName: 'Alice',
      contentOwnerId: 'u-1',
      contentName: 'My Board',
      contentSlug: 'my-board',
    });

    await POST(
      makePostRequest({
        targetId: 'b-1',
        targetType: 'board',
        text: 'Self comment',
      }),
    );

    expect(mockNotifyNewComment).not.toHaveBeenCalled();
  });

  it('returns 404 when content not found', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'u-1' });
    mockRunTransaction.mockRejectedValue(new Error('Content not found'));

    const res = await POST(
      makePostRequest({
        targetId: 'b-999',
        targetType: 'board',
        text: 'Hello',
      }),
    );

    expect(res.status).toBe(404);
  });
});
