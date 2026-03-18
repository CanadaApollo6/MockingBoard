/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const { mockGetCachedPublicBoards, mockGetCachedPlayerMap } = vi.hoisted(
  () => ({
    mockGetCachedPublicBoards: vi.fn(),
    mockGetCachedPlayerMap: vi.fn(),
  }),
);

vi.mock('server-only', () => ({}));
vi.mock('./firebase-admin', () => ({
  adminDb: { collection: vi.fn() },
}));
vi.mock('../cache', () => ({
  getCachedPlayerMap: () => mockGetCachedPlayerMap(),
  getCachedScoutProfiles: vi.fn(),
  getCachedPublicBoards: () => mockGetCachedPublicBoards(),
}));

import { getTrendingProspects } from './data.js';

function makeBoard(
  id: string,
  userId: string,
  year: number,
  rankings: string[],
) {
  return {
    id,
    userId,
    year,
    rankings,
    visibility: 'public' as const,
    createdAt: { seconds: 100 },
    updatedAt: { seconds: 100 },
  };
}

function makePlayer(id: string, consensusRank: number, position = 'QB') {
  return {
    id,
    name: `Player ${id}`,
    position,
    school: 'Test U',
    consensusRank,
    year: 2026,
    updatedAt: { seconds: 100 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTrendingProspects', () => {
  it('returns empty when no boards exist', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([]);
    mockGetCachedPlayerMap.mockResolvedValue(new Map());

    const result = await getTrendingProspects(2026);

    expect(result.mostDiscussed).toEqual([]);
    expect(result.risers).toEqual([]);
    expect(result.fallers).toEqual([]);
  });

  it('returns most discussed sorted by boardCount desc', async () => {
    // p1 on 5 boards, p2 on 4 boards, p3 on 3 boards
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1', 'p2', 'p3']),
      makeBoard('b2', 'u2', 2026, ['p1', 'p2', 'p3']),
      makeBoard('b3', 'u3', 2026, ['p1', 'p2', 'p3']),
      makeBoard('b4', 'u4', 2026, ['p1', 'p2']),
      makeBoard('b5', 'u5', 2026, ['p1']),
    ]);
    mockGetCachedPlayerMap.mockResolvedValue(
      new Map([
        ['p1', makePlayer('p1', 1)],
        ['p2', makePlayer('p2', 2)],
        ['p3', makePlayer('p3', 3)],
      ]),
    );

    const result = await getTrendingProspects(2026);

    expect(result.mostDiscussed[0].player.id).toBe('p1');
    expect(result.mostDiscussed[0].boardCount).toBe(5);
    expect(result.mostDiscussed[1].player.id).toBe('p2');
    expect(result.mostDiscussed[1].boardCount).toBe(4);
    expect(result.mostDiscussed[2].player.id).toBe('p3');
    expect(result.mostDiscussed[2].boardCount).toBe(3);
  });

  it('computes risers correctly (positive delta)', async () => {
    // p1: consensusRank 10, community averageRank ~1 → delta = +9 (riser)
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1']),
      makeBoard('b2', 'u2', 2026, ['p1']),
      makeBoard('b3', 'u3', 2026, ['p1']),
    ]);
    mockGetCachedPlayerMap.mockResolvedValue(
      new Map([['p1', makePlayer('p1', 10)]]),
    );

    const result = await getTrendingProspects(2026);

    expect(result.risers).toHaveLength(1);
    expect(result.risers[0].delta).toBe(9); // 10 - 1 = 9
    expect(result.fallers).toHaveLength(0);
  });

  it('computes fallers correctly (negative delta)', async () => {
    // p1: consensusRank 1, community averageRank ~10 → delta = -9 (faller)
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard(
        'b1',
        'u1',
        2026,
        Array.from({ length: 10 }, (_, i) => `p${i + 1}`),
      ),
      makeBoard(
        'b2',
        'u2',
        2026,
        Array.from({ length: 10 }, (_, i) => `p${i + 1}`),
      ),
      makeBoard(
        'b3',
        'u3',
        2026,
        Array.from({ length: 10 }, (_, i) => `p${i + 1}`),
      ),
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 10; i++) {
      // Make p10 have consensusRank 1 but community rank 10 (faller)
      const cr = i === 10 ? 1 : i + 10;
      playerMap.set(`p${i}`, makePlayer(`p${i}`, cr));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const result = await getTrendingProspects(2026);

    // p10: consensusRank 1, averageRank 10 → delta = 1 - 10 = -9
    const p10Faller = result.fallers.find((f) => f.player.id === 'p10');
    expect(p10Faller).toBeDefined();
    expect(p10Faller!.delta).toBe(-9);
  });

  it('limits results to 10 per category', async () => {
    // Create 15 players all on 3 boards each, all risers
    const rankings = Array.from({ length: 15 }, (_, i) => `p${i + 1}`);
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, rankings),
      makeBoard('b2', 'u2', 2026, rankings),
      makeBoard('b3', 'u3', 2026, rankings),
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 15; i++) {
      // consensusRank much higher than their board position → all risers
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i + 50));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const result = await getTrendingProspects(2026);

    expect(result.mostDiscussed).toHaveLength(10);
    expect(result.risers).toHaveLength(10);
  });

  it('excludes players not found in playerMap', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1', 'p2']),
      makeBoard('b2', 'u2', 2026, ['p1', 'p2']),
      makeBoard('b3', 'u3', 2026, ['p1', 'p2']),
    ]);
    // Only p1 in player map, p2 missing
    mockGetCachedPlayerMap.mockResolvedValue(
      new Map([['p1', makePlayer('p1', 1)]]),
    );

    const result = await getTrendingProspects(2026);

    expect(result.mostDiscussed).toHaveLength(1);
    expect(result.mostDiscussed[0].player.id).toBe('p1');
  });
});
