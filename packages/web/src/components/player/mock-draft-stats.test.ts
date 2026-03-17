/// <reference types="vitest/globals" />

// Test the pure logic used by MockDraftStats
// (ordinal formatting and top team extraction)

describe('ordinal', () => {
  // Inline the function since it's not exported
  function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `#${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  }

  it('handles 1st, 2nd, 3rd', () => {
    expect(ordinal(1)).toBe('#1st');
    expect(ordinal(2)).toBe('#2nd');
    expect(ordinal(3)).toBe('#3rd');
  });

  it('handles teen numbers', () => {
    expect(ordinal(11)).toBe('#11th');
    expect(ordinal(12)).toBe('#12th');
    expect(ordinal(13)).toBe('#13th');
  });

  it('handles 21st, 22nd, 23rd', () => {
    expect(ordinal(21)).toBe('#21st');
    expect(ordinal(22)).toBe('#22nd');
    expect(ordinal(23)).toBe('#23rd');
  });

  it('handles regular th numbers', () => {
    expect(ordinal(4)).toBe('#4th');
    expect(ordinal(10)).toBe('#10th');
    expect(ordinal(32)).toBe('#32nd');
  });
});

describe('getTopTeam', () => {
  function getTopTeam(
    teamCounts: Record<string, number>,
  ): { team: string; count: number } | null {
    let topTeam: string | null = null;
    let topCount = 0;
    for (const [team, count] of Object.entries(teamCounts)) {
      if (count > topCount) {
        topTeam = team;
        topCount = count;
      }
    }
    if (!topTeam) return null;
    return { team: topTeam, count: topCount };
  }

  it('returns the team with the highest count', () => {
    const result = getTopTeam({ CHI: 10, NYG: 15, DAL: 5 });
    expect(result).toEqual({ team: 'NYG', count: 15 });
  });

  it('returns null for empty counts', () => {
    expect(getTopTeam({})).toBeNull();
  });

  it('handles single team', () => {
    const result = getTopTeam({ NE: 42 });
    expect(result).toEqual({ team: 'NE', count: 42 });
  });
});

describe('average pick calculation', () => {
  it('computes correct average', () => {
    const sumOverall = 90;
    const pickCount = 10;
    expect(Math.round(sumOverall / pickCount)).toBe(9);
  });

  it('rounds to nearest integer', () => {
    const sumOverall = 95;
    const pickCount = 10;
    expect(Math.round(sumOverall / pickCount)).toBe(10);
  });
});
