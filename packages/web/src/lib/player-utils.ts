import type { Player, Position } from '@mockingboard/shared';

export const UNRANKED = 9999;

export const YEAR_LABELS: Record<string, string> = {
  FR: 'Freshman',
  SO: 'Sophomore',
  JR: 'Junior',
  SR: 'Senior',
  'RS-FR': 'RS-Freshman',
  'RS-SO': 'RS-Sophomore',
  'RS-JR': 'RS-Junior',
  'RS-SR': 'RS-Senior',
};

export function formatHeight(inches: number): string {
  const rounded = Math.round(inches);
  const feet = Math.floor(rounded / 12);
  const remaining = rounded % 12;
  return `${feet}'${remaining}"`;
}

export function formatMeasurement(value: number): string {
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac < 0.0625) return `${whole}"`;
  if (frac < 0.1875) return `${whole}\u215B"`; // ⅛
  if (frac < 0.3125) return `${whole}\u00BC"`; // ¼
  if (frac < 0.4375) return `${whole}\u215C"`; // ⅜
  if (frac < 0.5625) return `${whole}\u00BD"`; // ½
  if (frac < 0.6875) return `${whole}\u215D"`; // ⅝
  if (frac < 0.8125) return `${whole}\u00BE"`; // ¾
  if (frac < 0.9375) return `${whole}\u215E"`; // ⅞
  return `${whole + 1}"`;
}

export interface CombineMetric {
  label: string;
  value: string;
}

export function buildCombineMetrics(
  attributes: Player['attributes'],
): CombineMetric[] {
  if (!attributes) return [];
  const metrics: CombineMetric[] = [];
  if (attributes.fortyYard)
    metrics.push({ label: '40-Yard', value: attributes.fortyYard.toFixed(2) });
  if (attributes.vertical)
    metrics.push({ label: 'Vertical', value: `${attributes.vertical}"` });
  if (attributes.bench)
    metrics.push({ label: 'Bench', value: String(attributes.bench) });
  if (attributes.broad)
    metrics.push({ label: 'Broad', value: `${attributes.broad}"` });
  if (attributes.cone)
    metrics.push({ label: '3-Cone', value: attributes.cone.toFixed(2) });
  if (attributes.shuttle)
    metrics.push({ label: 'Shuttle', value: attributes.shuttle.toFixed(2) });
  return metrics;
}

export interface StatDef {
  key: string;
  label: string;
}

export const KEY_STATS: Partial<Record<Position, StatDef[]>> = {
  QB: [
    { key: 'pass_grd', label: 'PFF Grade' },
    { key: 'epa_play', label: 'EPA/Play' },
    { key: 'acomp_pct', label: 'Adj Comp%' },
    { key: 'pass_rtg', label: 'Rating' },
    { key: 'btt_pct', label: 'BTT%' },
    { key: 'twp_pct', label: 'TWP%' },
  ],
  WR: [
    { key: 'rec_grd', label: 'PFF Grade' },
    { key: 'yprr', label: 'YPRR' },
    { key: 'yac_rec', label: 'YAC/REC' },
    { key: 'deep_tgt_pct', label: 'Deep TGT%' },
    { key: 'rec_td', label: 'Rec TD' },
    { key: 'mtf_rec', label: 'MTF' },
  ],
  TE: [
    { key: 'rec_grd', label: 'Rec Grade' },
    { key: 'pblk_grd', label: 'Block Grade' },
    { key: 'yprr', label: 'YPRR' },
    { key: 'yac_rec', label: 'YAC/REC' },
    { key: 'rec_td', label: 'Rec TD' },
    { key: 'rec_comp_pct', label: 'Comp%' },
  ],
  RB: [
    { key: 'rush_grd', label: 'Rush Grade' },
    { key: 'rush_ypc', label: 'YPC' },
    { key: 'mtf_att', label: 'MTF/ATT' },
    { key: 'rec_grd', label: 'Rec Grade' },
    { key: 'stuff_rate', label: 'Stuff Rate' },
    { key: 'rush_td', label: 'Rush TD' },
  ],
  OT: [
    { key: 'pblk_grd', label: 'PFF Grade' },
    { key: 'pblk_pbe', label: 'PBE' },
    { key: 'pblk_kd_pct', label: 'KD%' },
    { key: 'pblk_hu', label: 'Hurries' },
    { key: 'pblk_sk', label: 'Sacks' },
    { key: 'pblk_pr_pct', label: 'Pressure%' },
  ],
  OG: [
    { key: 'pblk_grd', label: 'PFF Grade' },
    { key: 'pblk_pbe', label: 'PBE' },
    { key: 'pblk_kd_pct', label: 'KD%' },
    { key: 'pblk_hu', label: 'Hurries' },
    { key: 'pblk_sk', label: 'Sacks' },
    { key: 'pblk_pr_pct', label: 'Pressure%' },
  ],
  EDGE: [
    { key: 'prsh_grd', label: 'Rush Grade' },
    { key: 'prsh_win_pct', label: 'Win%' },
    { key: 'prsh_sk', label: 'Sacks' },
    { key: 'rund_tfl', label: 'TFL' },
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'prsh_tpr', label: 'Pressures' },
  ],
  DL: [
    { key: 'prsh_grd', label: 'Rush Grade' },
    { key: 'prsh_win_pct', label: 'Win%' },
    { key: 'prsh_sk', label: 'Sacks' },
    { key: 'rund_tfl', label: 'TFL' },
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'prsh_tpr', label: 'Pressures' },
  ],
  LB: [
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'cov_grd', label: 'Coverage' },
    { key: 'prsh_grd', label: 'Rush Grade' },
    { key: 'rund_tkl', label: 'Tackles' },
    { key: 'cov_rtg', label: 'COV RTG' },
    { key: 'cov_int', label: 'INT' },
  ],
  CB: [
    { key: 'cov_grd', label: 'COV Grade' },
    { key: 'cov_rtg', label: 'COV RTG' },
    { key: 'cov_int', label: 'INT' },
    { key: 'cov_pbu', label: 'PBU' },
    { key: 'cov_finc_pct', label: 'Forced Inc%' },
    { key: 'cov_yds_cov', label: 'YDS/COV' },
  ],
  S: [
    { key: 'cov_grd', label: 'COV Grade' },
    { key: 'rund_grd', label: 'Run Def' },
    { key: 'cov_rtg', label: 'COV RTG' },
    { key: 'cov_int', label: 'INT' },
    { key: 'rund_tkl', label: 'Tackles' },
    { key: 'cov_pbu', label: 'PBU' },
  ],
};

export function formatStatValue(val: number | string | null): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}
