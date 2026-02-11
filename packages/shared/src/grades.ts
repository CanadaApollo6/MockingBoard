import type { GradeSystem } from './types';

// ---- System metadata ----

export const GRADE_SYSTEMS: { id: GradeSystem; label: string }[] = [
  { id: 'tier', label: 'Tier' },
  { id: 'nfl', label: 'NFL' },
  { id: 'letter', label: 'Letter' },
  { id: 'projection', label: 'Projection' },
];

// ---- Option definitions ----

interface GradeOption {
  label: string;
  shortLabel: string;
  value: number; // representative 0-100 value
  min: number;
  max: number;
  color: string; // Tailwind text color class
  bg: string; // Tailwind bg + border classes
}

const TIER_OPTIONS: GradeOption[] = [
  {
    label: 'Practice Squad',
    shortLabel: 'PS',
    value: 25,
    min: 0,
    max: 39,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
  {
    label: 'Roster',
    shortLabel: 'Roster',
    value: 45,
    min: 40,
    max: 49,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'Backup',
    shortLabel: 'Backup',
    value: 55,
    min: 50,
    max: 59,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'Contributor',
    shortLabel: 'Contrib',
    value: 65,
    min: 60,
    max: 69,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'Starter',
    shortLabel: 'Starter',
    value: 75,
    min: 70,
    max: 79,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'Pro Bowl',
    shortLabel: 'Pro Bowl',
    value: 85,
    min: 80,
    max: 89,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'Elite',
    shortLabel: 'Elite',
    value: 95,
    min: 90,
    max: 100,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
];

const NFL_OPTIONS: GradeOption[] = [
  {
    label: '8.0 — Perfect prospect',
    shortLabel: '8.0',
    value: 97,
    min: 95,
    max: 100,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: '7.3–7.5 — Perennial All-Pro',
    shortLabel: '7.5',
    value: 91,
    min: 88,
    max: 94,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: '7.0–7.1 — Pro Bowl talent',
    shortLabel: '7.0',
    value: 84,
    min: 82,
    max: 87,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: '6.7–6.9 — Year 1 starter',
    shortLabel: '6.8',
    value: 78,
    min: 76,
    max: 81,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: '6.5–6.6 — Boom-or-bust',
    shortLabel: '6.5',
    value: 73,
    min: 72,
    max: 75,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: '6.40–6.49 — Starter in 2 years',
    shortLabel: '6.4',
    value: 68,
    min: 66,
    max: 71,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: '6.30–6.39 — Plus starter eventually',
    shortLabel: '6.3',
    value: 62,
    min: 60,
    max: 65,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: '6.20–6.29 — Avg starter eventually',
    shortLabel: '6.2',
    value: 56,
    min: 54,
    max: 59,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: '6.10–6.19 — Backup → starter',
    shortLabel: '6.1',
    value: 50,
    min: 47,
    max: 53,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: '6.0–6.09 — Above-avg backup',
    shortLabel: '6.0',
    value: 43,
    min: 40,
    max: 46,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: '5.80–5.99 — Backup / ST',
    shortLabel: '5.9',
    value: 34,
    min: 30,
    max: 39,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
  {
    label: '5.60–5.69 — Bottom of roster',
    shortLabel: '5.6',
    value: 24,
    min: 20,
    max: 29,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
  {
    label: '5.50–5.59 — Priority UDFA',
    shortLabel: '5.5',
    value: 10,
    min: 0,
    max: 19,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
];

const LETTER_OPTIONS: GradeOption[] = [
  {
    label: 'A+',
    shortLabel: 'A+',
    value: 98,
    min: 97,
    max: 100,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'A',
    shortLabel: 'A',
    value: 94,
    min: 93,
    max: 96,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'A-',
    shortLabel: 'A-',
    value: 91,
    min: 90,
    max: 92,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'B+',
    shortLabel: 'B+',
    value: 88,
    min: 87,
    max: 89,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'B',
    shortLabel: 'B',
    value: 84,
    min: 83,
    max: 86,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'B-',
    shortLabel: 'B-',
    value: 81,
    min: 80,
    max: 82,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'C+',
    shortLabel: 'C+',
    value: 78,
    min: 77,
    max: 79,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'C',
    shortLabel: 'C',
    value: 74,
    min: 73,
    max: 76,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: 'C-',
    shortLabel: 'C-',
    value: 71,
    min: 70,
    max: 72,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'D+',
    shortLabel: 'D+',
    value: 68,
    min: 67,
    max: 69,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'D',
    shortLabel: 'D',
    value: 64,
    min: 63,
    max: 66,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'D-',
    shortLabel: 'D-',
    value: 61,
    min: 60,
    max: 62,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
  {
    label: 'F',
    shortLabel: 'F',
    value: 30,
    min: 0,
    max: 59,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
];

const PROJECTION_OPTIONS: GradeOption[] = [
  {
    label: 'Top 5',
    shortLabel: 'Top 5',
    value: 96,
    min: 92,
    max: 100,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'Top 15',
    shortLabel: 'Top 15',
    value: 87,
    min: 83,
    max: 91,
    color: 'text-mb-success',
    bg: 'bg-mb-success/15 border-mb-success/30',
  },
  {
    label: 'Late 1st',
    shortLabel: 'Late 1st',
    value: 78,
    min: 75,
    max: 82,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: '2nd Round',
    shortLabel: '2nd Rd',
    value: 69,
    min: 65,
    max: 74,
    color: 'text-mb-accent',
    bg: 'bg-mb-accent/15 border-mb-accent/30',
  },
  {
    label: '3rd Round',
    shortLabel: '3rd Rd',
    value: 59,
    min: 55,
    max: 64,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'Day 3',
    shortLabel: 'Day 3',
    value: 44,
    min: 35,
    max: 54,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  {
    label: 'Priority UDFA',
    shortLabel: 'PUDFA',
    value: 24,
    min: 15,
    max: 34,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
  {
    label: 'UDFA',
    shortLabel: 'UDFA',
    value: 7,
    min: 0,
    max: 14,
    color: 'text-mb-danger',
    bg: 'bg-mb-danger/15 border-mb-danger/30',
  },
];

const OPTIONS_MAP: Record<GradeSystem, GradeOption[]> = {
  tier: TIER_OPTIONS,
  nfl: NFL_OPTIONS,
  letter: LETTER_OPTIONS,
  projection: PROJECTION_OPTIONS,
};

// ---- Public API ----

export interface GradeDisplay {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
}

/** Convert a 0-100 grade to its display representation in the given system. */
export function getGradeDisplay(
  grade: number,
  system: GradeSystem,
): GradeDisplay {
  const options = OPTIONS_MAP[system];
  // Walk from highest to lowest, return first match
  for (const opt of options) {
    if (grade >= opt.min && grade <= opt.max) {
      return {
        label: opt.label,
        shortLabel: opt.shortLabel,
        color: opt.color,
        bg: opt.bg,
      };
    }
  }
  // Fallback to lowest tier
  const last = options[options.length - 1];
  return {
    label: last.label,
    shortLabel: last.shortLabel,
    color: last.color,
    bg: last.bg,
  };
}

/** Returns selectable grade options for the given system (for picker UIs). */
export function getGradeOptions(system: GradeSystem): {
  label: string;
  shortLabel: string;
  value: number;
  color: string;
  bg: string;
}[] {
  return OPTIONS_MAP[system].map((opt) => ({
    label: opt.label,
    shortLabel: opt.shortLabel,
    value: opt.value,
    color: opt.color,
    bg: opt.bg,
  }));
}

// ---- NFL grade conversion helpers ----

const NFL_TIERS: { nfl: number; min: number; max: number }[] = [
  { nfl: 8.0, min: 95, max: 100 },
  { nfl: 7.5, min: 88, max: 94 },
  { nfl: 7.0, min: 82, max: 87 },
  { nfl: 6.8, min: 76, max: 81 },
  { nfl: 6.5, min: 72, max: 75 },
  { nfl: 6.4, min: 66, max: 71 },
  { nfl: 6.3, min: 60, max: 65 },
  { nfl: 6.2, min: 54, max: 59 },
  { nfl: 6.1, min: 47, max: 53 },
  { nfl: 6.0, min: 40, max: 46 },
  { nfl: 5.9, min: 30, max: 39 },
  { nfl: 5.6, min: 20, max: 29 },
  { nfl: 5.5, min: 0, max: 19 },
];

/** Convert an NFL decimal grade (5.5–8.0) to the representative 0-100 internal value. */
export function nflGradeToInternal(nflGrade: number): number {
  let closest = NFL_TIERS[NFL_TIERS.length - 1];
  let bestDiff = Infinity;
  for (const tier of NFL_TIERS) {
    const diff = Math.abs(tier.nfl - nflGrade);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = tier;
    }
  }
  return Math.round((closest.min + closest.max) / 2);
}

/** Convert a 0-100 internal grade to the NFL decimal grade. */
export function internalToNflGrade(grade: number): number {
  for (const tier of NFL_TIERS) {
    if (grade >= tier.min && grade <= tier.max) return tier.nfl;
  }
  return 5.5;
}
