/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockCollection = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
  }));

  return {
    mockCollection,
    mockWhere,
    mockOrderBy,
    mockLimit,
    mockGet,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('./firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}));
vi.mock('../cache', () => ({
  getCachedPlayerMap: vi.fn(),
  getCachedScoutProfiles: vi.fn(),
}));

import { getTrendingBoards, getPopularReports } from './data/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTrendingBoards', () => {
  it('returns boards sorted by likeCount', async () => {
    const snapshot = {
      docs: [
        {
          id: 'b-1',
          data: () => ({
            name: 'Top Board',
            likeCount: 10,
            rankings: [],
            createdAt: { seconds: 100 },
            updatedAt: { seconds: 100 },
          }),
        },
        {
          id: 'b-2',
          data: () => ({
            name: 'Second Board',
            likeCount: 5,
            rankings: [],
            createdAt: { seconds: 90 },
            updatedAt: { seconds: 90 },
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

    const result = await getTrendingBoards(8);

    expect(whereFn).toHaveBeenCalledWith('visibility', '==', 'public');
    expect(orderByFn).toHaveBeenCalledWith('likeCount', 'desc');
    expect(limitFn).toHaveBeenCalledWith(8);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('b-1');
  });

  it('returns empty array when no boards', async () => {
    const snapshot = { docs: [] };
    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
    mockCollection.mockReturnValueOnce({ where: whereFn });

    const result = await getTrendingBoards();
    expect(result).toEqual([]);
  });
});

describe('getPopularReports', () => {
  it('returns reports sorted by likeCount', async () => {
    const snapshot = {
      docs: [
        {
          id: 'r-1',
          data: () => ({
            playerId: 'p-1',
            authorId: 'u-1',
            authorName: 'Alice',
            likeCount: 8,
            createdAt: { seconds: 200 },
            updatedAt: { seconds: 200 },
          }),
        },
      ],
    };

    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    mockCollection.mockReturnValueOnce({ orderBy: orderByFn });

    const result = await getPopularReports(6);

    expect(orderByFn).toHaveBeenCalledWith('likeCount', 'desc');
    expect(limitFn).toHaveBeenCalledWith(6);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r-1');
  });

  it('returns empty array when no reports', async () => {
    const snapshot = { docs: [] };
    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    mockCollection.mockReturnValueOnce({ orderBy: orderByFn });

    const result = await getPopularReports();
    expect(result).toEqual([]);
  });
});
