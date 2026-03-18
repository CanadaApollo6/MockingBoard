/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockDoc = vi.fn(() => ({ get: mockGet }));
  const mockCollection = vi.fn(() => ({ where: mockWhere, doc: mockDoc }));

  return {
    mockCollection,
    mockWhere,
    mockOrderBy,
    mockLimit,
    mockGet,
    mockDoc,
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

import {
  getUserLikedBoards,
  getUserLikedReports,
  getBoardsByIds,
  getReportsByIds,
} from './data/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getUserLikedBoards', () => {
  it('returns liked board refs ordered by createdAt', async () => {
    const snapshot = {
      docs: [
        { data: () => ({ boardId: 'b-1', createdAt: { seconds: 100 } }) },
        { data: () => ({ boardId: 'b-2', createdAt: { seconds: 90 } }) },
      ],
    };

    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
    mockCollection.mockReturnValueOnce({ where: whereFn });

    const result = await getUserLikedBoards('user-1');

    expect(whereFn).toHaveBeenCalledWith('userId', '==', 'user-1');
    expect(orderByFn).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limitFn).toHaveBeenCalledWith(10);
    expect(result).toEqual([
      { boardId: 'b-1', createdAt: { seconds: 100 } },
      { boardId: 'b-2', createdAt: { seconds: 90 } },
    ]);
  });

  it('returns empty array when no likes', async () => {
    const snapshot = { docs: [] };
    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
    mockCollection.mockReturnValueOnce({ where: whereFn });

    const result = await getUserLikedBoards('user-2');
    expect(result).toEqual([]);
  });
});

describe('getUserLikedReports', () => {
  it('returns liked report refs ordered by createdAt', async () => {
    const snapshot = {
      docs: [
        { data: () => ({ reportId: 'r-1', createdAt: { seconds: 200 } }) },
      ],
    };

    const limitFn = vi
      .fn()
      .mockReturnValue({ get: vi.fn().mockResolvedValue(snapshot) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
    mockCollection.mockReturnValueOnce({ where: whereFn });

    const result = await getUserLikedReports('user-1');

    expect(whereFn).toHaveBeenCalledWith('userId', '==', 'user-1');
    expect(result).toEqual([{ reportId: 'r-1', createdAt: { seconds: 200 } }]);
  });
});

describe('getBoardsByIds', () => {
  it('returns public boards only', async () => {
    const mockDocGet1 = vi.fn().mockResolvedValue({
      exists: true,
      id: 'b-1',
      data: () => ({ name: 'Public Board', visibility: 'public' }),
    });
    const mockDocGet2 = vi.fn().mockResolvedValue({
      exists: true,
      id: 'b-2',
      data: () => ({ name: 'Private Board', visibility: 'private' }),
    });

    mockCollection.mockImplementation(() => ({
      doc: vi.fn((id: string) => ({
        get: id === 'b-1' ? mockDocGet1 : mockDocGet2,
      })),
    }));

    const result = await getBoardsByIds(['b-1', 'b-2']);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b-1');
  });

  it('returns empty array for empty input', async () => {
    const result = await getBoardsByIds([]);
    expect(result).toEqual([]);
  });

  it('filters out non-existent docs', async () => {
    mockCollection.mockImplementation(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false }),
      })),
    }));

    const result = await getBoardsByIds(['missing-1']);
    expect(result).toEqual([]);
  });
});

describe('getReportsByIds', () => {
  it('returns reports by ids', async () => {
    mockCollection.mockImplementation(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          id: 'r-1',
          data: () => ({ playerId: 'p-1', authorId: 'u-1' }),
        }),
      })),
    }));

    const result = await getReportsByIds(['r-1']);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r-1');
  });

  it('returns empty array for empty input', async () => {
    const result = await getReportsByIds([]);
    expect(result).toEqual([]);
  });
});
