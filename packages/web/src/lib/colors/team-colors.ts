import type { TeamAbbreviation } from '@mockingboard/shared';

interface TeamColorPair {
  primary: string;
  secondary: string;
}

export const TEAM_COLORS: Record<TeamAbbreviation, TeamColorPair> = {
  ARI: { primary: '#97233F', secondary: '#000000' },
  ATL: { primary: '#A71930', secondary: '#000000' },
  BAL: { primary: '#241773', secondary: '#000000' },
  BUF: { primary: '#00338D', secondary: '#C60C30' },
  CAR: { primary: '#0085CA', secondary: '#101820' },
  CHI: { primary: '#C83803', secondary: '#0B162A' },
  CIN: { primary: '#FB4F14', secondary: '#000000' },
  CLE: { primary: '#311D00', secondary: '#FF3C00' },
  DAL: { primary: '#041E42', secondary: '#FFFFFF' },
  DEN: { primary: '#FB4F14', secondary: '#002244' },
  DET: { primary: '#0076B6', secondary: '#B0B7BC' },
  GB: { primary: '#203731', secondary: '#FFB612' },
  HOU: { primary: '#03202F', secondary: '#A71930' },
  IND: { primary: '#002C5F', secondary: '#A2AAAD' },
  JAX: { primary: '#006778', secondary: '#D7A22A' },
  KC: { primary: '#E31837', secondary: '#FFB81C' },
  LAC: { primary: '#0080C6', secondary: '#FFC20E' },
  LAR: { primary: '#003594', secondary: '#FFA300' },
  LV: { primary: '#000000', secondary: '#A5ACAF' },
  MIA: { primary: '#008E97', secondary: '#FC4C02' },
  MIN: { primary: '#4F2683', secondary: '#FFC62F' },
  NE: { primary: '#002244', secondary: '#C60C30' },
  NO: { primary: '#D3BC8D', secondary: '#101820' },
  NYG: { primary: '#0B2265', secondary: '#A71930' },
  NYJ: { primary: '#105741', secondary: '#000000' },
  PHI: { primary: '#004C54', secondary: '#A5ACAF' },
  PIT: { primary: '#FFB612', secondary: '#101820' },
  SEA: { primary: '#69BE28', secondary: '#002244' },
  SF: { primary: '#AA0000', secondary: '#B3995D' },
  TB: { primary: '#A71930', secondary: '#FF7900' },
  TEN: { primary: '#4B92DB', secondary: '#0C2340' },
  WAS: { primary: '#5A1414', secondary: '#FFB612' },
};

export function getTeamColor(team: TeamAbbreviation): TeamColorPair {
  return TEAM_COLORS[team];
}

// --- Color visibility utilities ---

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const MIN_BORDER_LIGHTNESS = 38;

/** Boost dark hex colors so their hue is perceptible in thin UI elements. */
export function ensureVisible(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  if (l >= MIN_BORDER_LIGHTNESS) return hex;
  // Achromatic colors (e.g. LV black) stay achromatic; chromatic ones get a saturation floor
  const newS = s < 5 ? s : Math.max(s, 55);
  return hslToHex(h, newS, MIN_BORDER_LIGHTNESS);
}

const SIMILARITY_THRESHOLD = 0.15;

function colorDistance(hex1: string, hex2: string): number {
  const [h1, s1, l1] = hexToHsl(hex1);
  const [h2, s2, l2] = hexToHsl(hex2);
  const hd = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180;
  const sd = (s1 - s2) / 100;
  const ld = (l1 - l2) / 100;
  return Math.sqrt(hd * hd + sd * sd + ld * ld);
}

/**
 * Walk the pick order top-to-bottom. When a row's color is too close to the
 * previous row's resolved color, flip it to the team's secondary (also
 * visibility-adjusted). Returns overall → hex color.
 */
export function buildRowColors(
  slots: ReadonlyArray<{
    team: string;
    teamOverride?: string;
    overall: number;
  }>,
): Map<number, string> {
  const result = new Map<number, string>();
  let prevColor = '';

  for (const slot of slots) {
    const displayTeam = (slot.teamOverride ?? slot.team) as TeamAbbreviation;
    const colors = getTeamColor(displayTeam);
    const primary = ensureVisible(colors.primary);

    if (prevColor && colorDistance(primary, prevColor) < SIMILARITY_THRESHOLD) {
      const secondary = ensureVisible(colors.secondary);
      result.set(slot.overall, secondary);
      prevColor = secondary;
    } else {
      result.set(slot.overall, primary);
      prevColor = primary;
    }
  }

  return result;
}

/** Returns inline style object setting --team-primary and --team-secondary CSS custom properties */
export function teamColorStyle(team: TeamAbbreviation): React.CSSProperties {
  const c = TEAM_COLORS[team];
  return {
    '--team-primary': c.primary,
    '--team-secondary': c.secondary,
  } as React.CSSProperties;
}

// --- Theme derivation ---

const ACHROMATIC_THRESHOLD = 8;

/**
 * Derive accent color palette from a hex color, adjusted for the given mode.
 * Dark mode: bright vibrant accents (lightness 55–75%).
 * Light mode: muted readable accents (lightness 30–45%).
 */
function deriveAccentPalette(
  hex: string,
  mode: 'dark' | 'light',
): { accent: string; accentHover: string; accentMuted: string } {
  const [h, s] = hexToHsl(hex);

  if (mode === 'dark') {
    const l = Math.max(55, Math.min(75, hexToHsl(hex)[2]));
    const sat = Math.max(s, 60);
    const accent = hslToHex(h, sat, l);
    const hover = hslToHex(h, sat, Math.max(45, l - 10));
    const [r, g, b] = hexToRgb(accent);
    return {
      accent,
      accentHover: hover,
      accentMuted: `rgba(${r}, ${g}, ${b}, 0.12)`,
    };
  }

  const l = Math.max(30, Math.min(45, hexToHsl(hex)[2]));
  const sat = Math.max(s, 50);
  const accent = hslToHex(h, sat, l);
  const hover = hslToHex(h, sat, Math.min(55, l + 10));
  const [r, g, b] = hexToRgb(accent);
  return {
    accent,
    accentHover: hover,
    accentMuted: `rgba(${r}, ${g}, ${b}, 0.10)`,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Derive a full set of CSS variable overrides for team/school theming.
 * Accepts a TeamAbbreviation or a raw {primary, secondary} color pair.
 * Returns empty object for achromatic colors (no viable accent).
 */
export function deriveThemeOverrides(
  teamOrColors: TeamAbbreviation | { primary: string; secondary: string },
  mode: 'dark' | 'light',
): Record<string, string> {
  const { primary, secondary } =
    typeof teamOrColors === 'string' ? TEAM_COLORS[teamOrColors] : teamOrColors;

  // Use primary unless achromatic, then try secondary
  const [, ps] = hexToHsl(primary);
  const sourceHex = ps < ACHROMATIC_THRESHOLD ? secondary : primary;
  const [, ss] = hexToHsl(sourceHex);
  if (ss < ACHROMATIC_THRESHOLD) return {};

  const { accent, accentHover, accentMuted } = deriveAccentPalette(
    sourceHex,
    mode,
  );

  const [, , al] = hexToHsl(accent);
  const foreground = al > 55 ? '#0a0a0b' : '#ffffff';

  const overrides: Record<string, string> = {
    '--primary': accent,
    '--primary-foreground': foreground,
    '--ring': accent,
    '--mb-accent': accent,
    '--mb-accent-hover': accentHover,
    '--mb-accent-muted': accentMuted,
    '--sidebar-primary': accent,
    '--sidebar-primary-foreground': foreground,
    '--sidebar-ring': accent,
    '--chart-1': accent,
    '--shadow-glow': `0 0 20px ${accentMuted}`,
  };

  // Derive secondary accent from whichever color was NOT chosen as the source
  const otherHex = sourceHex === primary ? secondary : primary;
  const [, otherSat] = hexToHsl(otherHex);
  if (otherSat >= ACHROMATIC_THRESHOLD) {
    const { accent: otherAccent } = deriveAccentPalette(otherHex, mode);
    overrides['--mb-secondary'] = otherAccent;
    overrides['--chart-2'] = otherAccent;
  }

  return overrides;
}
