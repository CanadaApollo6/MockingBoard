import { getTeam, getTeamName, getTeamCity } from './teams';
import type { TeamAbbreviation } from '@mockingboard/shared';

describe('teams', () => {
  it('getTeamName returns full team name', () => {
    expect(getTeamName('TEN' as TeamAbbreviation)).toBe('Tennessee Titans');
    expect(getTeamName('NYJ' as TeamAbbreviation)).toBe('New York Jets');
  });

  it('getTeamCity returns team city', () => {
    expect(getTeamCity('GB' as TeamAbbreviation)).toBe('Green Bay');
    expect(getTeamCity('DAL' as TeamAbbreviation)).toBe('Dallas');
  });

  it('getTeam returns full team seed data', () => {
    const team = getTeam('NE' as TeamAbbreviation);
    expect(team).toBeDefined();
    expect(team?.name).toBe('New England Patriots');
    expect(team?.conference).toBe('AFC');
  });

  it('returns abbreviation as fallback for unknown team', () => {
    expect(getTeamName('ZZZ' as TeamAbbreviation)).toBe('ZZZ');
    expect(getTeamCity('ZZZ' as TeamAbbreviation)).toBe('ZZZ');
  });

  it('getTeam returns undefined for unknown team', () => {
    expect(getTeam('ZZZ' as TeamAbbreviation)).toBeUndefined();
  });
});
