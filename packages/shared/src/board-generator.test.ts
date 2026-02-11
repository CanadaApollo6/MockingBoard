import { describe, it, expect } from 'vitest';
import { generateBoardRankings, getHeadlineStats } from './board-generator';
import type { Player, BoardGenerationConfig } from './types';

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    name: overrides.id,
    position: 'QB',
    school: 'Test U',
    consensusRank: 50,
    year: 2025,
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

const DEFAULT_WEIGHTS: BoardGenerationConfig['weights'] = {
  production: 40,
  athleticism: 25,
  conference: 15,
  consensus: 20,
};

describe('generateBoardRankings', () => {
  it('returns empty array for empty input', () => {
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: DEFAULT_WEIGHTS,
    };
    expect(generateBoardRankings([], config)).toEqual([]);
  });

  it('filters by position when not ALL', () => {
    const players = [
      makePlayer({ id: 'qb1', position: 'QB', consensusRank: 1 }),
      makePlayer({ id: 'wr1', position: 'WR', consensusRank: 2 }),
      makePlayer({ id: 'rb1', position: 'RB', consensusRank: 3 }),
    ];
    const config: BoardGenerationConfig = {
      position: 'QB',
      weights: DEFAULT_WEIGHTS,
    };
    const result = generateBoardRankings(players, config);
    expect(result).toEqual(['qb1']);
  });

  it('returns all players when position is ALL', () => {
    const players = [
      makePlayer({ id: 'qb1', position: 'QB', consensusRank: 1 }),
      makePlayer({ id: 'wr1', position: 'WR', consensusRank: 2 }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: DEFAULT_WEIGHTS,
    };
    const result = generateBoardRankings(players, config);
    expect(result).toHaveLength(2);
  });

  it('higher consensus weight approximates consensus order', () => {
    const players = [
      makePlayer({ id: 'p1', consensusRank: 1 }),
      makePlayer({ id: 'p2', consensusRank: 2 }),
      makePlayer({ id: 'p3', consensusRank: 3 }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: { production: 0, athleticism: 0, conference: 0, consensus: 100 },
    };
    const result = generateBoardRankings(players, config);
    expect(result).toEqual(['p1', 'p2', 'p3']);
  });

  it('higher conference weight favors SEC/Big Ten', () => {
    const players = [
      makePlayer({
        id: 'fcs',
        consensusRank: 1,
        attributes: { conference: 'FCS' },
      }),
      makePlayer({
        id: 'sec',
        consensusRank: 2,
        attributes: { conference: 'SEC' },
      }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: { production: 0, athleticism: 0, conference: 100, consensus: 0 },
    };
    const result = generateBoardRankings(players, config);
    expect(result[0]).toBe('sec');
  });

  it('higher production weight favors players with strong stats', () => {
    const players = [
      makePlayer({
        id: 'high-prod',
        position: 'QB',
        consensusRank: 10,
        stats: {
          pass_grd: 95,
          epa_play: 0.3,
          btt_pct: 8,
          twp_pct: 1,
          pass_rtg: 120,
        },
      }),
      makePlayer({
        id: 'low-prod',
        position: 'QB',
        consensusRank: 1,
        stats: {
          pass_grd: 50,
          epa_play: -0.1,
          btt_pct: 2,
          twp_pct: 5,
          pass_rtg: 70,
        },
      }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: { production: 100, athleticism: 0, conference: 0, consensus: 0 },
    };
    const result = generateBoardRankings(players, config);
    expect(result[0]).toBe('high-prod');
  });

  it('players with no stats still get ranked via consensus + athleticism', () => {
    const players = [
      makePlayer({ id: 'p1', consensusRank: 1 }),
      makePlayer({ id: 'p2', consensusRank: 5 }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: DEFAULT_WEIGHTS,
    };
    const result = generateBoardRankings(players, config);
    expect(result).toHaveLength(2);
    // With no stats or athleticism data, consensus should dominate
    expect(result[0]).toBe('p1');
  });

  it('statOverrides changes which stats are used', () => {
    const players = [
      makePlayer({
        id: 'custom-strong',
        position: 'QB',
        consensusRank: 5,
        stats: { custom_stat: 100, pass_grd: 20 },
      }),
      makePlayer({
        id: 'default-strong',
        position: 'QB',
        consensusRank: 5,
        stats: { custom_stat: 10, pass_grd: 90 },
      }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: { production: 100, athleticism: 0, conference: 0, consensus: 0 },
      statOverrides: { custom_stat: 100 },
    };
    const result = generateBoardRankings(players, config);
    expect(result[0]).toBe('custom-strong');
  });

  it('athleticism weight favors athletic players', () => {
    const players = [
      makePlayer({
        id: 'fast',
        consensusRank: 5,
        attributes: {
          conference: 'SEC',
          fortyYard: 4.3,
          vertical: 40,
          broad: 130,
        },
      }),
      makePlayer({
        id: 'slow',
        consensusRank: 5,
        attributes: {
          conference: 'SEC',
          fortyYard: 5.0,
          vertical: 25,
          broad: 100,
        },
      }),
    ];
    const config: BoardGenerationConfig = {
      position: 'ALL',
      weights: { production: 0, athleticism: 100, conference: 0, consensus: 0 },
    };
    const result = generateBoardRankings(players, config);
    expect(result[0]).toBe('fast');
  });
});

describe('getHeadlineStats', () => {
  it('returns known stats for QB', () => {
    const stats = getHeadlineStats('QB');
    expect(stats).toContain('pass_grd');
    expect(stats.length).toBeGreaterThan(0);
  });

  it('returns known stats for CB', () => {
    const stats = getHeadlineStats('CB');
    expect(stats).toContain('cov_grd');
  });

  it('returns empty for unknown position', () => {
    const stats = getHeadlineStats('K');
    expect(stats).toEqual([]);
  });
});
