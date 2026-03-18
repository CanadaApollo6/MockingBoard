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

import { getBoardHotTakes, getGlobalHotTakes } from './data.js';

function makeBoard(
  id: string,
  userId: string,
  year: number,
  rankings: string[],
  name = 'Test Board',
  authorName = 'Scout',
) {
  return {
    id,
    userId,
    name,
    authorName,
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

describe('getBoardHotTakes', () => {
  it('returns empty when no consensus data exists', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([]);
    mockGetCachedPlayerMap.mockResolvedValue(new Map());

    const result = await getBoardHotTakes([], 2026);
    expect(result).toEqual([]);
  });

  it('filters out players with |delta| < 15', async () => {
    // 3 boards with p1 at rank 1 → consensus avg ~1
    // Board under test also has p1 at rank 1 → delta = 0
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, ['p1']),
      makeBoard('b2', 'u2', 2026, ['p1']),
      makeBoard('b3', 'u3', 2026, ['p1']),
    ]);
    mockGetCachedPlayerMap.mockResolvedValue(
      new Map([['p1', makePlayer('p1', 1)]]),
    );

    const result = await getBoardHotTakes(['p1'], 2026);
    expect(result).toHaveLength(0);
  });

  it('includes players with |delta| >= 15', async () => {
    // 3 boards: p1 always at position 1 → consensus avg = 1
    // Board under test: p1 at rank 20 → delta = 1 - 20 = -19
    const rankings = Array.from({ length: 20 }, (_, i) => `p${i + 1}`);
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, rankings),
      makeBoard('b2', 'u2', 2026, rankings),
      makeBoard('b3', 'u3', 2026, rankings),
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 20; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    // Test board has p1 at rank 20 (hot take: consensus avg ~1, board rank 20)
    const testRankings = Array.from({ length: 20 }, (_, i) => `p${20 - i}`);
    const result = await getBoardHotTakes(testRankings, 2026);

    // p1 consensus avg = 1, board rank = 20, delta = 1 - 20 = -19
    const p1Take = result.find((t) => t.player.id === 'p1');
    expect(p1Take).toBeDefined();
    expect(Math.abs(p1Take!.delta)).toBeGreaterThanOrEqual(15);
  });

  it('sorts by |delta| descending', async () => {
    const rankings = Array.from({ length: 30 }, (_, i) => `p${i + 1}`);
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, rankings),
      makeBoard('b2', 'u2', 2026, rankings),
      makeBoard('b3', 'u3', 2026, rankings),
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 30; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    // Reverse order: p30 at rank 1, p1 at rank 30
    const testRankings = Array.from({ length: 30 }, (_, i) => `p${30 - i}`);
    const result = await getBoardHotTakes(testRankings, 2026);

    for (let i = 1; i < result.length; i++) {
      expect(Math.abs(result[i - 1].delta)).toBeGreaterThanOrEqual(
        Math.abs(result[i].delta),
      );
    }
  });

  it('limits to 5 results', async () => {
    const rankings = Array.from({ length: 40 }, (_, i) => `p${i + 1}`);
    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, rankings),
      makeBoard('b2', 'u2', 2026, rankings),
      makeBoard('b3', 'u3', 2026, rankings),
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 40; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const testRankings = Array.from({ length: 40 }, (_, i) => `p${40 - i}`);
    const result = await getBoardHotTakes(testRankings, 2026);

    expect(result).toHaveLength(5);
  });

  it('skips players missing from consensus', async () => {
    mockGetCachedPublicBoards.mockResolvedValue([]);
    mockGetCachedPlayerMap.mockResolvedValue(
      new Map([['p1', makePlayer('p1', 1)]]),
    );

    // p1 is in player map but not in any boards → no consensus entry
    const result = await getBoardHotTakes(['p1'], 2026);
    expect(result).toHaveLength(0);
  });
});

describe('getGlobalHotTakes', () => {
  it('aggregates across multiple boards', async () => {
    // Use 10 normal boards so consensus avg stays close to true rank
    // Then 1 reversed board creates big deltas (≥15)
    const rankings = Array.from({ length: 30 }, (_, i) => `p${i + 1}`);
    const reversed = Array.from({ length: 30 }, (_, i) => `p${30 - i}`);

    const boards = [];
    for (let i = 0; i < 10; i++) {
      boards.push(
        makeBoard(
          `b${i}`,
          `u${i}`,
          2026,
          rankings,
          `Normal ${i}`,
          `Scout ${i}`,
        ),
      );
    }
    boards.push(
      makeBoard('bold', 'ubold', 2026, reversed, 'Bold Board', 'Bold Scout'),
    );

    mockGetCachedPublicBoards.mockResolvedValue(boards);

    const playerMap = new Map();
    for (let i = 1; i <= 30; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const result = await getGlobalHotTakes(2026);

    expect(result.takes.length).toBeGreaterThan(0);
    expect(result.totalBoards).toBe(11);
  });

  it('includes board metadata', async () => {
    const rankings = Array.from({ length: 30 }, (_, i) => `p${i + 1}`);
    const reversed = Array.from({ length: 30 }, (_, i) => `p${30 - i}`);

    const boards = [];
    for (let i = 0; i < 10; i++) {
      boards.push(
        makeBoard(`b${i}`, `u${i}`, 2026, rankings, `Board ${i}`, `Scout ${i}`),
      );
    }
    boards.push(
      makeBoard('bold', 'ubold', 2026, reversed, 'Bold Board', 'Bold Scout'),
    );

    mockGetCachedPublicBoards.mockResolvedValue(boards);

    const playerMap = new Map();
    for (let i = 1; i <= 30; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const result = await getGlobalHotTakes(2026);

    const boldTake = result.takes.find((t) => t.boardId === 'bold');
    expect(boldTake).toBeDefined();
    expect(boldTake!.boardName).toBe('Bold Board');
    expect(boldTake!.authorName).toBe('Bold Scout');
  });

  it('limits to 20 results', async () => {
    const rankings = Array.from({ length: 40 }, (_, i) => `p${i + 1}`);
    const reversed = Array.from({ length: 40 }, (_, i) => `p${40 - i}`);

    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, rankings),
      makeBoard('b2', 'u2', 2026, rankings),
      makeBoard('b3', 'u3', 2026, rankings),
      makeBoard('b4', 'u4', 2026, reversed),
      makeBoard('b5', 'u5', 2026, reversed),
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 40; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const result = await getGlobalHotTakes(2026);

    expect(result.takes.length).toBeLessThanOrEqual(20);
  });

  it('filters by year', async () => {
    const rankings = Array.from({ length: 20 }, (_, i) => `p${i + 1}`);
    const reversed = Array.from({ length: 20 }, (_, i) => `p${20 - i}`);

    mockGetCachedPublicBoards.mockResolvedValue([
      makeBoard('b1', 'u1', 2026, rankings),
      makeBoard('b2', 'u2', 2026, rankings),
      makeBoard('b3', 'u3', 2026, rankings),
      makeBoard('b4', 'u4', 2025, reversed), // wrong year
    ]);

    const playerMap = new Map();
    for (let i = 1; i <= 20; i++) {
      playerMap.set(`p${i}`, makePlayer(`p${i}`, i));
    }
    mockGetCachedPlayerMap.mockResolvedValue(playerMap);

    const result = await getGlobalHotTakes(2026);

    // All 2026 boards have same rankings → no hot takes
    // The 2025 board with reversed rankings is excluded
    expect(result.takes).toHaveLength(0);
    expect(result.totalBoards).toBe(3);
  });
});
