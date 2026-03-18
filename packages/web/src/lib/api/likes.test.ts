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

import { handleLikeGet, handleLikePost, handleLikeDelete } from './likes.js';

const TEST_CONFIG = {
  likeCollection: 'testLikes',
  resourceCollection: 'testResources',
  resourceKey: 'resourceId',
  label: 'Test Resource',
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleLikeGet', () => {
  it('returns count only for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);
    mockCollection.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        count: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ data: () => ({ count: 7 }) }),
        }),
      }),
    });

    const res = await handleLikeGet('res-1', TEST_CONFIG);
    const json = await res.json();

    expect(json.isLiked).toBe(false);
    expect(json.likeCount).toBe(7);
  });

  it('returns isLiked true when user has liked', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });

    const likeDoc = { exists: true };
    const resourceDoc = { data: () => ({ likeCount: 3 }) };
    mockGet.mockResolvedValueOnce(likeDoc).mockResolvedValueOnce(resourceDoc);

    const res = await handleLikeGet('res-1', TEST_CONFIG);
    const json = await res.json();

    expect(json.isLiked).toBe(true);
    expect(json.likeCount).toBe(3);
  });

  it('returns isLiked false when user has not liked', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });

    const likeDoc = { exists: false };
    const resourceDoc = { data: () => ({ likeCount: 1 }) };
    mockGet.mockResolvedValueOnce(likeDoc).mockResolvedValueOnce(resourceDoc);

    const res = await handleLikeGet('res-1', TEST_CONFIG);
    const json = await res.json();

    expect(json.isLiked).toBe(false);
    expect(json.likeCount).toBe(1);
  });

  it('defaults likeCount to 0 when missing', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });

    const likeDoc = { exists: false };
    const resourceDoc = { data: () => ({}) };
    mockGet.mockResolvedValueOnce(likeDoc).mockResolvedValueOnce(resourceDoc);

    const res = await handleLikeGet('res-1', TEST_CONFIG);
    const json = await res.json();

    expect(json.likeCount).toBe(0);
  });
});

describe('handleLikePost', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await handleLikePost('res-1', TEST_CONFIG);

    expect(res.status).toBe(401);
  });

  it('creates a like via transaction', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockResolvedValue(undefined);

    const res = await handleLikePost('res-1', TEST_CONFIG);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when resource not found', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockRejectedValue(new Error('Test Resource not found'));

    const res = await handleLikePost('res-1', TEST_CONFIG);

    expect(res.status).toBe(404);
  });

  it('returns 500 on unexpected errors', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockRejectedValue(new Error('Firestore unavailable'));

    const res = await handleLikePost('res-1', TEST_CONFIG);

    expect(res.status).toBe(500);
  });
});

describe('handleLikeDelete', () => {
  it('returns 401 for unauthenticated users', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await handleLikeDelete('res-1', TEST_CONFIG);

    expect(res.status).toBe(401);
  });

  it('removes a like via transaction', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockResolvedValue(undefined);

    const res = await handleLikeDelete('res-1', TEST_CONFIG);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns 500 on transaction failure', async () => {
    mockGetSessionUser.mockResolvedValue({ uid: 'user-1' });
    mockRunTransaction.mockRejectedValue(new Error('Transaction failed'));

    const res = await handleLikeDelete('res-1', TEST_CONFIG);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to unlike Test Resource');
  });
});
