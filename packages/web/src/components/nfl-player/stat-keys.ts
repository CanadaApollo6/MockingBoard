import type { EspnStatCategory } from '@/lib/cache';

/**
 * Priority list of stat `names` to highlight per category.
 * Order determines display order in headline cards and timeline pills.
 */
const KEY_STATS: Record<string, string[]> = {
  passing: [
    'passingYards',
    'passingTouchdowns',
    'interceptions',
    'completionPct',
    'QBRating',
  ],
  rushing: [
    'rushingYards',
    'rushingTouchdowns',
    'yardsPerRushAttempt',
    'rushingAttempts',
  ],
  receiving: [
    'receptions',
    'receivingYards',
    'receivingTouchdowns',
    'yardsPerReception',
  ],
  defensive: [
    'totalTackles',
    'sacks',
    'interceptions',
    'passesDefended',
    'fumblesForced',
  ],
  kicking: [
    'fieldGoalPct',
    'fieldGoalsMade-fieldGoalAttempts',
    'extraPointsMade',
    'longFieldGoalMade',
    'totalKickingPoints',
  ],
  punting: ['grossAvgPuntYards', 'punts', 'puntsInside20', 'puntingLong'],
  returning: [
    'kickReturnYards',
    'kickReturnTouchdowns',
    'puntReturnYards',
    'puntReturnTouchdowns',
  ],
  scoring: [
    'totalTouchdowns',
    'totalPoints',
    'rushingTouchdowns',
    'receivingTouchdowns',
  ],
};

/** Parse a stat string to a number. Strips commas, %, handles "--" and empty. */
export function parseStatValue(val: string): number {
  if (!val || val === '--' || val === '-') return 0;
  const cleaned = val.replace(/[,%]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export interface KeyStatIndex {
  index: number;
  name: string;
  label: string;
  displayName: string;
}

/**
 * Get the indices of key stats to highlight for a category.
 * Falls back to the first 4 stats with non-zero career totals (skipping GP).
 */
export function getKeyStatIndices(category: EspnStatCategory): KeyStatIndex[] {
  const priority = KEY_STATS[category.name];

  if (priority) {
    const indices: KeyStatIndex[] = [];
    for (const statName of priority) {
      const idx = category.names.indexOf(statName);
      if (idx !== -1) {
        indices.push({
          index: idx,
          name: category.names[idx],
          label: category.labels[idx],
          displayName: category.displayNames[idx],
        });
      }
    }
    if (indices.length > 0) return indices;
  }

  // Fallback: first 4 non-zero, non-GP stats
  const fallback: KeyStatIndex[] = [];
  for (let i = 0; i < category.names.length && fallback.length < 4; i++) {
    if (category.names[i] === 'gamesPlayed') continue;
    if (category.totals[i] && parseStatValue(category.totals[i]) !== 0) {
      fallback.push({
        index: i,
        name: category.names[i],
        label: category.labels[i],
        displayName: category.displayNames[i],
      });
    }
  }
  return fallback;
}
