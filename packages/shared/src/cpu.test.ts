import type { Player, Position } from './types';
import { selectCpuPick } from './cpu';

function makePlayer(
  overrides: Partial<Player> & { consensusRank: number },
): Player {
  return {
    id: `player-${overrides.consensusRank}`,
    name: `Player ${overrides.consensusRank}`,
    position: 'WR',
    school: 'Test U',
    year: 2025,
    updatedAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

describe('selectCpuPick', () => {
  it('picks a need player when one is in the top 5 BPA', () => {
    const players = [
      makePlayer({ consensusRank: 1, position: 'QB' }),
      makePlayer({ consensusRank: 2, position: 'WR' }),
      makePlayer({ consensusRank: 3, position: 'CB' }),
      makePlayer({ consensusRank: 4, position: 'OT' }),
      makePlayer({ consensusRank: 5, position: 'EDGE' }),
      makePlayer({ consensusRank: 6, position: 'DL' }),
    ];
    const needs: Position[] = ['CB', 'S'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('CB');
    expect(pick.consensusRank).toBe(3);
  });

  it('falls back to BPA when no need player is in the top 5', () => {
    const players = [
      makePlayer({ consensusRank: 1, position: 'QB' }),
      makePlayer({ consensusRank: 2, position: 'WR' }),
      makePlayer({ consensusRank: 3, position: 'RB' }),
      makePlayer({ consensusRank: 4, position: 'OT' }),
      makePlayer({ consensusRank: 5, position: 'OG' }),
      makePlayer({ consensusRank: 6, position: 'CB' }),
    ];
    const needs: Position[] = ['CB', 'S'];

    const pick = selectCpuPick(players, needs);
    expect(pick.consensusRank).toBeLessThanOrEqual(3);
  });

  it('returns BPA when needs array is empty', () => {
    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
      makePlayer({ consensusRank: 3 }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBeLessThanOrEqual(3);
  });

  it('handles a single available player', () => {
    const players = [makePlayer({ consensusRank: 10 })];

    const pick = selectCpuPick(players, ['QB']);
    expect(pick.consensusRank).toBe(10);
  });

  it('handles two available players', () => {
    const players = [
      makePlayer({ consensusRank: 1 }),
      makePlayer({ consensusRank: 2 }),
    ];

    const pick = selectCpuPick(players, []);
    expect(pick.consensusRank).toBeLessThanOrEqual(2);
  });

  it('throws when no players are available', () => {
    expect(() => selectCpuPick([], ['QB'])).toThrow('No available players');
  });

  it('picks the first need match when multiple needs are in top 5', () => {
    const players = [
      makePlayer({ consensusRank: 1, position: 'QB' }),
      makePlayer({ consensusRank: 2, position: 'CB' }),
      makePlayer({ consensusRank: 3, position: 'EDGE' }),
      makePlayer({ consensusRank: 4, position: 'OT' }),
      makePlayer({ consensusRank: 5, position: 'WR' }),
    ];
    const needs: Position[] = ['EDGE', 'CB'];

    const pick = selectCpuPick(players, needs);
    expect(pick.position).toBe('CB');
  });
});
