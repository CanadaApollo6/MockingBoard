import type { Player, Position, BoardGenerationConfig } from './types';

// ---- Conference Tiers ----

const CONFERENCE_TIERS: Record<string, number> = {
  SEC: 1.0,
  'BIG TEN': 1.0,
  'BIG 12': 0.9,
  ACC: 0.9,
  AAC: 0.8,
  'MOUNTAIN WEST': 0.8,
  'SUN BELT': 0.8,
  'CONFERENCE USA': 0.8,
  'C-USA': 0.8,
  MAC: 0.8,
  INDEPENDENT: 0.8,
};

const FCS_TIER = 0.6;
const DEFAULT_CONF_TIER = 0.7;

function getConferenceTier(conference: string | undefined): number {
  if (!conference) return DEFAULT_CONF_TIER;
  return CONFERENCE_TIERS[conference.toUpperCase()] ?? FCS_TIER;
}

// ---- Headline Stats Per Position ----

const HEADLINE_STATS: Record<string, string[]> = {
  QB: ['pass_grd', 'epa_play', 'btt_pct', 'twp_pct', 'pass_rtg'],
  RB: ['rush_grd', 'rush_ypc', 'mtf_att', 'rush_ybc_att', 'stuff_rate'],
  WR: ['rec_grd', 'yprr', 'rec_ctc_pct', 'rec_adot', 'mtf_rec'],
  TE: ['rec_grd', 'pblk_grd', 'yprr', 'rec_ctc_pct'],
  OT: ['pblk_grd', 'pblk_pr_pct', 'pblk_kd_pct'],
  OG: ['pblk_grd', 'pblk_pr_pct', 'pblk_kd_pct'],
  C: ['pblk_grd', 'pblk_pr_pct', 'pblk_kd_pct'],
  EDGE: ['prsh_grd', 'prsh_win_pct', 'rund_grd', 'prsh_sk'],
  DL: ['rund_grd', 'prsh_grd', 'rund_stop', 'rund_tfl'],
  LB: ['rund_grd', 'cov_grd', 'rund_stop', 'cov_comp_pct'],
  CB: ['cov_grd', 'cov_comp_pct', 'cov_yds_ctgt', 'cov_rtg'],
  S: ['cov_grd', 'rund_grd', 'cov_comp_pct', 'cov_int'],
};

/** Get the stat keys to evaluate for a given position. */
export function getHeadlineStats(position: Position): string[] {
  return HEADLINE_STATS[position] ?? [];
}

// ---- Athleticism Measurements ----

type MeasurementKey =
  | 'fortyYard'
  | 'vertical'
  | 'broad'
  | 'bench'
  | 'cone'
  | 'shuttle';

const MEASUREMENT_KEYS: MeasurementKey[] = [
  'fortyYard',
  'vertical',
  'broad',
  'bench',
  'cone',
  'shuttle',
];

/** Lower-is-better measurements (faster time = better). */
const INVERTED_MEASUREMENTS = new Set<MeasurementKey>([
  'fortyYard',
  'cone',
  'shuttle',
]);

// ---- Percentile Calculation ----

/**
 * Compute the percentile rank of a value within a sorted array of values.
 * Returns 0-1 where 1 is the best.
 */
function percentileRank(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 0.5;
  let count = 0;
  for (const v of allValues) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
  }
  return count / allValues.length;
}

// ---- Core Algorithm ----

/**
 * Generate board rankings from a set of players and a generation config.
 * Returns an array of player IDs sorted by composite score (best first).
 */
export function generateBoardRankings(
  players: Player[],
  config: BoardGenerationConfig,
): string[] {
  // Filter by position if not ALL
  const filtered =
    config.position === 'ALL'
      ? players
      : players.filter((p) => p.position === config.position);

  if (filtered.length === 0) return [];

  const totalPlayers = filtered.length;

  // Determine stat keys to use for each player's position
  const statKeysForPosition = (pos: Position): string[] => {
    if (config.statOverrides && Object.keys(config.statOverrides).length > 0) {
      return Object.keys(config.statOverrides);
    }
    return getHeadlineStats(pos);
  };

  // Pre-compute stat distributions for percentile calculation
  const statDistributions = new Map<string, number[]>();
  const measurementDistributions = new Map<MeasurementKey, number[]>();

  // Collect all stat values across filtered players
  for (const player of filtered) {
    const keys = statKeysForPosition(player.position);
    for (const key of keys) {
      const val = player.stats?.[key];
      if (typeof val === 'number') {
        const arr = statDistributions.get(key) ?? [];
        arr.push(val);
        statDistributions.set(key, arr);
      }
    }
    for (const mk of MEASUREMENT_KEYS) {
      const val = player.attributes?.[mk];
      if (typeof val === 'number') {
        const arr = measurementDistributions.get(mk) ?? [];
        arr.push(val);
        measurementDistributions.set(mk, arr);
      }
    }
  }

  // Sort distributions for percentile calculation
  for (const arr of statDistributions.values()) arr.sort((a, b) => a - b);
  for (const arr of measurementDistributions.values())
    arr.sort((a, b) => a - b);

  // Score each player
  const scored = filtered.map((player) => {
    // Production score
    const keys = statKeysForPosition(player.position);
    let prodSum = 0;
    let prodCount = 0;
    for (const key of keys) {
      const val = player.stats?.[key];
      if (typeof val !== 'number') continue;
      const dist = statDistributions.get(key);
      if (!dist || dist.length === 0) continue;

      // Some stats are "lower is better" (e.g. twp_pct, stuff_rate)
      const pct = percentileRank(val, dist);
      const weight = config.statOverrides?.[key] ?? 50;
      prodSum += pct * (weight / 50); // normalize weight around 50
      prodCount++;
    }
    const productionScore = prodCount > 0 ? prodSum / prodCount : 0.5;

    // Athleticism score
    let athSum = 0;
    let athCount = 0;
    for (const mk of MEASUREMENT_KEYS) {
      const val = player.attributes?.[mk];
      if (typeof val !== 'number') continue;
      const dist = measurementDistributions.get(mk);
      if (!dist || dist.length === 0) continue;
      let pct = percentileRank(val, dist);
      if (INVERTED_MEASUREMENTS.has(mk)) pct = 1 - pct;
      athSum += pct;
      athCount++;
    }
    const athleticismScore = athCount > 0 ? athSum / athCount : 0.5;

    // Conference score
    const conferenceScore = getConferenceTier(player.attributes?.conference);

    // Consensus score (higher rank = closer to 1)
    const consensusScore = 1 - (player.consensusRank - 1) / totalPlayers;

    // Weighted composite
    const w = config.weights;
    const totalWeight =
      w.production + w.athleticism + w.conference + w.consensus;
    if (totalWeight === 0) return { id: player.id, score: 0 };

    const composite =
      (w.production * productionScore +
        w.athleticism * athleticismScore +
        w.conference * conferenceScore +
        w.consensus * Math.max(0, consensusScore)) /
      totalWeight;

    return { id: player.id, score: composite };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.id);
}
