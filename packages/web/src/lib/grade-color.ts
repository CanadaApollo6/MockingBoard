/**
 * Single source of truth for the 7-tier grade color system.
 *
 * Each entry maps a tier to its minimum numeric grade, Tailwind text class,
 * Tailwind background class, and raw hex value. Entries are ordered from
 * highest to lowest so lookup functions can iterate and return the first match.
 */

interface GradeColorEntry {
  tier: string;
  minGrade: number;
  textClass: string;
  bgClass: string;
  hex: string;
}

const GRADE_COLORS: GradeColorEntry[] = [
  {
    tier: 'Elite',
    minGrade: 90,
    textClass: 'text-mb-success',
    bgClass: 'bg-mb-success',
    hex: '#3dffa0',
  },
  {
    tier: 'Pro Bowl',
    minGrade: 80,
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-400',
    hex: '#34d399',
  },
  {
    tier: 'Starter',
    minGrade: 70,
    textClass: 'text-mb-accent',
    bgClass: 'bg-mb-accent',
    hex: '#60a5fa',
  },
  {
    tier: 'Solid',
    minGrade: 60,
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-400',
    hex: '#38bdf8',
  },
  {
    tier: 'Average',
    minGrade: 50,
    textClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500',
    hex: '#eab308',
  },
  {
    tier: 'Below Average',
    minGrade: 40,
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-400',
    hex: '#fb923c',
  },
  {
    tier: 'Practice Squad',
    minGrade: 0,
    textClass: 'text-mb-danger',
    bgClass: 'bg-mb-danger',
    hex: '#ff4d6a',
  },
];

const TIER_MAP = new Map(GRADE_COLORS.map((entry) => [entry.tier, entry]));
const FALLBACK = GRADE_COLORS[GRADE_COLORS.length - 1];

function entryByGrade(grade: number): GradeColorEntry {
  return GRADE_COLORS.find((e) => grade >= e.minGrade) ?? FALLBACK;
}

function entryByTier(tier: string): GradeColorEntry {
  return TIER_MAP.get(tier) ?? FALLBACK;
}

// ── Tailwind text classes ──────────────────────────────────────────

/** Returns a Tailwind text color class based on the grade tier label. */
export function tierColor(tier: string): string {
  return entryByTier(tier).textClass;
}

/** Returns a Tailwind text color class for a numeric grade (0–100). */
export function gradeColor(grade: number): string {
  return entryByGrade(grade).textClass;
}

// ── Tailwind background classes ────────────────────────────────────

/** Returns a Tailwind background color class for a numeric grade (0–100). */
export function barColor(grade: number): string {
  return entryByGrade(grade).bgClass;
}

// ── Raw hex values (for inline styles / canvas / share cards) ──────

/** Returns a hex color string based on the grade tier label. */
export function tierHex(tier: string): string {
  return entryByTier(tier).hex;
}

/** Returns a hex color string for a numeric grade (0–100). */
export function gradeHex(grade: number): string {
  return entryByGrade(grade).hex;
}
