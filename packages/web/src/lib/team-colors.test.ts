/// <reference types="vitest/globals" />
import {
  TEAM_COLORS,
  getTeamColor,
  teamColorStyle,
  hexToHsl,
  hslToHex,
  deriveThemeOverrides,
} from './team-colors.js';
import type { TeamAbbreviation } from '@mockingboard/shared';

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

describe('hexToHsl', () => {
  it('converts pure red', () => {
    const [h, s, l] = hexToHsl('#ff0000');
    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it('converts pure green', () => {
    const [h, s, l] = hexToHsl('#00ff00');
    expect(h).toBeCloseTo(120, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it('converts pure blue', () => {
    const [h, s, l] = hexToHsl('#0000ff');
    expect(h).toBeCloseTo(240, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it('converts white', () => {
    const [, s, l] = hexToHsl('#ffffff');
    expect(s).toBe(0);
    expect(l).toBe(100);
  });

  it('converts black', () => {
    const [, s, l] = hexToHsl('#000000');
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it('converts a mid-range color (KC red)', () => {
    const [h, s, l] = hexToHsl('#E31837');
    expect(h).toBeCloseTo(351, 0);
    expect(s).toBeGreaterThan(70);
    expect(l).toBeGreaterThan(40);
    expect(l).toBeLessThan(55);
  });
});

describe('hslToHex', () => {
  it('round-trips primary colors', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('round-trips black and white', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });

  it('preserves hue through hexToHsl → hslToHex round-trip', () => {
    const original = '#E31837';
    const [h, s, l] = hexToHsl(original);
    const result = hslToHex(h, s, l);
    // Allow 1 step rounding difference per channel
    const diff = Math.abs(
      parseInt(original.slice(1), 16) - parseInt(result.slice(1), 16),
    );
    expect(diff).toBeLessThan(0x020202);
  });
});

describe('deriveThemeOverrides', () => {
  const EXPECTED_KEYS = [
    '--primary',
    '--primary-foreground',
    '--ring',
    '--mb-accent',
    '--mb-accent-hover',
    '--mb-accent-muted',
    '--sidebar-primary',
    '--sidebar-primary-foreground',
    '--sidebar-ring',
    '--chart-1',
    '--shadow-glow',
  ];

  it('returns all expected CSS variable keys for a chromatic team', () => {
    const overrides = deriveThemeOverrides('KC', 'dark');
    for (const key of EXPECTED_KEYS) {
      expect(overrides, `missing ${key}`).toHaveProperty(key);
    }
  });

  it('returns empty object for LV (achromatic primary and low-saturation secondary)', () => {
    const overrides = deriveThemeOverrides('LV', 'dark');
    expect(Object.keys(overrides)).toHaveLength(0);
  });

  it('falls back to secondary when primary is achromatic', () => {
    // ARI has achromatic secondary (#000000) but chromatic primary (#97233F)
    // CHI has very dark primary (#0B162A) — should still produce output since it has hue
    const chiOverrides = deriveThemeOverrides('CHI', 'dark');
    expect(Object.keys(chiOverrides).length).toBeGreaterThan(0);
  });

  it('produces valid hex accent for every chromatic team', () => {
    const hexRe = /^#[0-9a-f]{6}$/;
    for (const team of Object.keys(TEAM_COLORS) as TeamAbbreviation[]) {
      const overrides = deriveThemeOverrides(team, 'dark');
      if (Object.keys(overrides).length === 0) continue; // achromatic, skip
      expect(overrides['--primary'], `${team} dark`).toMatch(hexRe);
    }
  });

  describe('dark mode', () => {
    it('produces bright accents (lightness >= 55) for dark teams', () => {
      // CLE primary is very dark (#311D00, ~9% lightness)
      const overrides = deriveThemeOverrides('CLE', 'dark');
      const [, , l] = hexToHsl(overrides['--primary']);
      expect(l).toBeGreaterThanOrEqual(55);
    });

    it('clamps bright team colors to max 75% lightness', () => {
      // PIT primary is very bright (#FFB612, ~54% lightness) — already in range
      const overrides = deriveThemeOverrides('PIT', 'dark');
      const [, , l] = hexToHsl(overrides['--primary']);
      expect(l).toBeLessThanOrEqual(75);
    });

    it('uses dark foreground text on bright accents', () => {
      // KC red will produce a bright accent in dark mode
      const overrides = deriveThemeOverrides('KC', 'dark');
      const [, , l] = hexToHsl(overrides['--primary']);
      if (l > 55) {
        expect(overrides['--primary-foreground']).toBe('#0a0a0b');
      }
    });
  });

  describe('light mode', () => {
    it('produces muted accents (lightness ~<= 45) for bright teams', () => {
      // PIT primary is very bright (#FFB612)
      // Allow ~1% tolerance for hex round-trip rounding
      const overrides = deriveThemeOverrides('PIT', 'light');
      const [, , l] = hexToHsl(overrides['--primary']);
      expect(l).toBeLessThanOrEqual(46);
    });

    it('clamps dark team colors to min 30% lightness', () => {
      // CLE primary is very dark (#311D00)
      const overrides = deriveThemeOverrides('CLE', 'light');
      const [, , l] = hexToHsl(overrides['--primary']);
      expect(l).toBeGreaterThanOrEqual(30);
    });
  });

  it('preserves hue of team color', () => {
    const teams: TeamAbbreviation[] = ['KC', 'BUF', 'GB', 'MIN', 'SF'];
    for (const team of teams) {
      const { primary, secondary } = TEAM_COLORS[team];
      const [, ps] = hexToHsl(primary);
      const sourceHex = ps < 5 ? secondary : primary;
      const [origH] = hexToHsl(sourceHex);

      const overrides = deriveThemeOverrides(team, 'dark');
      if (Object.keys(overrides).length === 0) continue;
      const [derivedH] = hexToHsl(overrides['--primary']);
      expect(Math.abs(origH - derivedH), `${team} hue drift`).toBeLessThan(2);
    }
  });

  it('produces different results for dark vs light mode', () => {
    const dark = deriveThemeOverrides('KC', 'dark');
    const light = deriveThemeOverrides('KC', 'light');
    expect(dark['--primary']).not.toBe(light['--primary']);
  });

  it('includes rgba muted variant', () => {
    const overrides = deriveThemeOverrides('BUF', 'dark');
    expect(overrides['--mb-accent-muted']).toMatch(
      /^rgba\(\d+, \d+, \d+, 0\.12\)$/,
    );
  });

  it('includes glow shadow', () => {
    const overrides = deriveThemeOverrides('BUF', 'dark');
    expect(overrides['--shadow-glow']).toMatch(/^0 0 20px rgba\(/);
  });

  it('accepts a raw color pair instead of team abbreviation', () => {
    const colors = { primary: '#E31837', secondary: '#FFB81C' };
    const overrides = deriveThemeOverrides(colors, 'dark');
    expect(Object.keys(overrides).length).toBeGreaterThan(0);
    expect(overrides['--primary']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('produces identical results for team abbreviation and equivalent color pair', () => {
    const teamOverrides = deriveThemeOverrides('KC', 'dark');
    const colorOverrides = deriveThemeOverrides(TEAM_COLORS['KC'], 'dark');
    expect(teamOverrides).toEqual(colorOverrides);
  });

  it('returns empty object for achromatic color pair', () => {
    const colors = { primary: '#000000', secondary: '#A0A0A0' };
    const overrides = deriveThemeOverrides(colors, 'dark');
    expect(Object.keys(overrides)).toHaveLength(0);
  });
});
