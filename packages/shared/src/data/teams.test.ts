import { teams } from './teams.js';

describe('team seed data', () => {
  it('contains exactly 32 teams', () => {
    expect(teams).toHaveLength(32);
  });

  it('has unique team abbreviations', () => {
    const ids = teams.map((t) => t.id);
    expect(new Set(ids).size).toBe(32);
  });

  it('has all required fields on every team', () => {
    for (const team of teams) {
      expect(team.name).toBeTruthy();
      expect(team.city).toBeTruthy();
      expect(team.mascot).toBeTruthy();
      expect(['AFC', 'NFC']).toContain(team.conference);
      expect(['North', 'South', 'East', 'West']).toContain(team.division);
      expect(team.picks.year).toBe(2025);
      expect(team.picks.slots.length).toBeGreaterThan(0);
    }
  });

  it('has 4 teams per division per conference', () => {
    const divisions = teams.reduce(
      (acc, t) => {
        const key = `${t.conference}-${t.division}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    for (const count of Object.values(divisions)) {
      expect(count).toBe(4);
    }
  });

  it('has positional needs for every team', () => {
    for (const team of teams) {
      expect(team.needs.length).toBeGreaterThan(0);
    }
  });
});
