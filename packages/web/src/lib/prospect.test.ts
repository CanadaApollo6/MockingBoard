/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { getProspectOfTheDay } from './prospect.js';
import type { Player } from '@mockingboard/shared';

function makePlayer(id: string, rank: number): Player {
  return {
    id,
    name: `Player ${id}`,
    position: 'QB',
    school: 'Alabama',
    consensusRank: rank,
    year: 2026,
  } as Player;
}

function buildMap(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

describe('getProspectOfTheDay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns null for empty map', () => {
    expect(getProspectOfTheDay(new Map())).toBeNull();
  });

  it('returns null when no players have positive consensusRank', () => {
    const map = buildMap([makePlayer('a', 0), makePlayer('b', -1)]);
    expect(getProspectOfTheDay(map)).toBeNull();
  });

  it('returns a player from the map', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, i + 1),
    );
    const map = buildMap(players);
    vi.setSystemTime(new Date('2026-02-04T12:00:00Z'));
    const result = getProspectOfTheDay(map);
    expect(result).not.toBeNull();
    expect(players).toContainEqual(result);
  });

  it('returns the same player for the same date', () => {
    const players = Array.from({ length: 50 }, (_, i) =>
      makePlayer(`p${i}`, i + 1),
    );
    const map = buildMap(players);

    vi.setSystemTime(new Date('2026-04-15T08:00:00Z'));
    const first = getProspectOfTheDay(map);

    vi.setSystemTime(new Date('2026-04-15T23:59:59Z'));
    const second = getProspectOfTheDay(map);

    expect(first!.id).toBe(second!.id);
  });

  it('returns a different player on a different date', () => {
    const players = Array.from({ length: 100 }, (_, i) =>
      makePlayer(`p${i}`, i + 1),
    );
    const map = buildMap(players);

    // Collect results across several days — at least some should differ
    const results = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      vi.setSystemTime(
        new Date(`2026-03-${String(d).padStart(2, '0')}T12:00:00Z`),
      );
      const result = getProspectOfTheDay(map);
      results.add(result!.id);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('only selects from top 100 ranked players', () => {
    const players = Array.from({ length: 150 }, (_, i) =>
      makePlayer(`p${i}`, i + 1),
    );
    const map = buildMap(players);

    // Test many dates to build confidence
    for (let d = 1; d <= 31; d++) {
      vi.setSystemTime(
        new Date(`2026-01-${String(d).padStart(2, '0')}T12:00:00Z`),
      );
      const result = getProspectOfTheDay(map);
      expect(result!.consensusRank).toBeLessThanOrEqual(100);
    }
  });
});
