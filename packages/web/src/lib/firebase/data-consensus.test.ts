/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetCachedPublicBoards } = vi.hoisted(() => ({
  mockGetCachedPublicBoards: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('./firebase-admin', () => ({
  adminDb: { collection: vi.fn() },
}));
vi.mock('../cache', () => ({
  getCachedPlayerMap: vi.fn(),
  getCachedScoutProfiles: vi.fn(),
  getCachedPublicBoards: () => mockGetCachedPublicBoards(),
}));

import { getConsensusBoard } from './data/index.js';

function makeBoard(
  id: string,
  userId: string,
  year: number,
  rankings: string[],
  updatedSeconds = 100,
) {
  return {
    id,
    userId,
    year,
    rankings,
    visibility: 'public' as const,
    createdAt: { seconds: updatedSeconds },
    updatedAt: { seconds: updatedSeconds },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getConsensusBoard', () => {
  it('returns empty entries when no boards exist', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([]);

    const result = await getConsensusBoard(2026);

    expect(result.entries).toEqual([]);
    expect(result.totalBoards).toBe(0);
    expect(result.totalScouts).toBe(0);
    expect(result.lastUpdated).toBeNull();
  });

  it('excludes players appearing on fewer than 3 boards', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1', 'p2']),
      makeBoard('b2', 'u2', 2026, ['p1', 'p2']),
      // p1 and p2 only on 2 boards — below threshold
    ]);

    const result = await getConsensusBoard(2026);

    expect(result.entries).toEqual([]);
    expect(result.totalBoards).toBe(2);
  });

  it('computes average rank correctly', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1', 'p2', 'p3']),
      makeBoard('b2', 'u2', 2026, ['p2', 'p1', 'p3']),
      makeBoard('b3', 'u3', 2026, ['p1', 'p3', 'p2']),
    ]);

    const result = await getConsensusBoard(2026);

    // p1: ranks [1, 2, 1] → avg 4/3 ≈ 1.333
    // p2: ranks [2, 1, 3] → avg 6/3 = 2.0
    // p3: ranks [3, 3, 2] → avg 8/3 ≈ 2.667
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].playerId).toBe('p1');
    expect(result.entries[0].averageRank).toBeCloseTo(4 / 3);
    expect(result.entries[0].boardCount).toBe(3);
    expect(result.entries[0].highestRank).toBe(1);
    expect(result.entries[0].lowestRank).toBe(2);

    expect(result.entries[1].playerId).toBe('p2');
    expect(result.entries[1].averageRank).toBe(2);

    expect(result.entries[2].playerId).toBe('p3');
    expect(result.entries[2].averageRank).toBeCloseTo(8 / 3);
  });

  it('breaks ties by boardCount then highestRank', async () => {
    // p1 on 4 boards, p2 on 3 boards — same average rank
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1', 'p2']),
      makeBoard('b2', 'u2', 2026, ['p2', 'p1']),
      makeBoard('b3', 'u3', 2026, ['p1', 'p2']),
      makeBoard('b4', 'u4', 2026, ['p2', 'p1']),
      // p1: ranks [1, 2, 1, 2] → avg 1.5, count 4
      // p2: ranks [2, 1, 2, 1] → avg 1.5, count 4
      // Same avg + count → tiebreak on highestRank (both 1) → stable
    ]);

    const result = await getConsensusBoard(2026);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].averageRank).toBe(1.5);
    expect(result.entries[1].averageRank).toBe(1.5);
  });

  it('only includes boards matching the requested year', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1']),
      makeBoard('b2', 'u2', 2026, ['p1']),
      makeBoard('b3', 'u3', 2026, ['p1']),
      makeBoard('b4', 'u4', 2025, ['p1', 'p2']), // wrong year
      makeBoard('b5', 'u5', 2025, ['p1', 'p2']),
      makeBoard('b6', 'u6', 2025, ['p1', 'p2']),
    ]);

    const result = await getConsensusBoard(2026);

    expect(result.totalBoards).toBe(3);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].playerId).toBe('p1');
  });

  it('counts distinct scouts', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1']),
      makeBoard('b2', 'u1', 2026, ['p1']), // same user
      makeBoard('b3', 'u2', 2026, ['p1']),
      makeBoard('b4', 'u3', 2026, ['p1']),
    ]);

    const result = await getConsensusBoard(2026);

    expect(result.totalBoards).toBe(4);
    expect(result.totalScouts).toBe(3);
  });

  it('tracks lastUpdated from most recent board', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1'], 100),
      makeBoard('b2', 'u2', 2026, ['p1'], 300),
      makeBoard('b3', 'u3', 2026, ['p1'], 200),
    ]);

    const result = await getConsensusBoard(2026);

    expect(result.lastUpdated).toBe(300);
  });
});
