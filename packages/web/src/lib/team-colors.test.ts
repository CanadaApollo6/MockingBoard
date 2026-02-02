/// <reference types="vitest/globals" />
import { TEAM_COLORS, getTeamColor, teamColorStyle } from './team-colors.js';

describe('team-colors', () => {
  it('has entries for all 32 teams', () => {
    expect(Object.keys(TEAM_COLORS)).toHaveLength(32);
  });

  it('each entry has valid hex primary and secondary colors', () => {
    const hexRe = /^#[0-9A-Fa-f]{6}$/;
    for (const [team, colors] of Object.entries(TEAM_COLORS)) {
      expect(colors.primary, `${team} primary`).toMatch(hexRe);
      expect(colors.secondary, `${team} secondary`).toMatch(hexRe);
    }
  });

  describe('getTeamColor', () => {
    it('returns correct pair for known teams', () => {
      expect(getTeamColor('ARI')).toEqual({
        primary: '#97233F',
        secondary: '#000000',
      });
      expect(getTeamColor('DAL')).toEqual({
        primary: '#003594',
        secondary: '#041E42',
      });
      expect(getTeamColor('GB')).toEqual({
        primary: '#203731',
        secondary: '#FFB612',
      });
    });
  });

  describe('teamColorStyle', () => {
    it('returns CSS custom properties', () => {
      const style = teamColorStyle('SF');
      expect(style).toHaveProperty('--team-primary', '#AA0000');
      expect(style).toHaveProperty('--team-secondary', '#B3995D');
    });
  });
});
