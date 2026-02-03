import type { Position } from './types';

// ---- Measurement Parsers ----

/** Parse NFL Combine height format: 6020 → 74 inches (6'2") */
export function parseHeight(raw: string): number | undefined {
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 4000) return undefined;
  const feet = Math.floor(num / 1000);
  const inches = Math.floor((num % 1000) / 10);
  const eighths = num % 10;
  return feet * 12 + inches + eighths / 8;
}

/** Parse NFL Combine fraction format: 3038 → 30.375 (30⅜") */
export function parseFraction(raw: string): number | undefined {
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 100) return undefined;
  const whole = Math.floor(num / 100);
  const eighths = Math.floor((num % 100) / 10);
  return whole + eighths / 8;
}

/** Parse a stat value: numbers stay as numbers, percentages stay as strings */
export function parseStatValue(raw: string): number | string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('%')) return trimmed;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  return trimmed;
}

// ---- School Name Normalization ----

export const SCHOOL_NORMALIZE: Record<string, string> = {
  'MISS STATE': 'MISSISSIPPI STATE',
  'MISS ST': 'MISSISSIPPI STATE',
  'MISSISSIPPI ST': 'MISSISSIPPI STATE',
  'MISSISSIPPI ST.': 'MISSISSIPPI STATE',
  MISSISSIPPI: 'OLE MISS',
  'OLE MISS': 'OLE MISS',
  NWESTERN: 'NORTHWESTERN',
  'MIAMI FL': 'MIAMI',
  'MIAMI (FL)': 'MIAMI',
  'S CAROLINA': 'SOUTH CAROLINA',
  'SOUTH CAROLINA': 'SOUTH CAROLINA',
  BC: 'BOSTON COLLEGE',
  'BOSTON COLLEGE': 'BOSTON COLLEGE',
  'VA TECH': 'VIRGINIA TECH',
  'VIRGINIA TECH': 'VIRGINIA TECH',
  'KANSAS ST': 'KANSAS STATE',
  'IOWA ST': 'IOWA STATE',
  PITT: 'PITTSBURGH',
  'N CAROLINA': 'NORTH CAROLINA',
  UNC: 'NORTH CAROLINA',
  'FLORIDA ST': 'FLORIDA STATE',
  'FLORIDA ST.': 'FLORIDA STATE',
  'W VIRGINIA': 'WEST VIRGINIA',
  'S ALABAMA': 'SOUTH ALABAMA',
  'ARIZONA ST': 'ARIZONA STATE',
  'S DAKOTA ST': 'SOUTH DAKOTA STATE',
  'S ILLINOIS': 'SOUTHERN ILLINOIS',
  'E WASHINGTON': 'EASTERN WASHINGTON',
  'S MISSISSIPPI': 'SOUTHERN MISS',
  'TEXAS ST': 'TEXAS STATE',
  'SAN DIEGO ST': 'SAN DIEGO STATE',
  'N TEXAS': 'NORTH TEXAS',
  'TENN TECH': 'TENNESSEE TECH',
  'MORGAN ST': 'MORGAN STATE',
  'KENNESAW ST': 'KENNESAW STATE',
  WAKE: 'WAKE FOREST',
  UCONN: 'UCONN',
  DARMOUTH: 'DARTMOUTH',
  'W MICHIGAN': 'WESTERN MICHIGAN',
  'MICHIGAN ST': 'MICHIGAN STATE',
  'BOISE ST': 'BOISE STATE',
  'N DAK ST': 'NORTH DAKOTA STATE',
  NDSU: 'NORTH DAKOTA STATE',
  CAL: 'CALIFORNIA',
  USF: 'SOUTH FLORIDA',
  'GEORGIA SOUTHERN': 'GEORGIA SOUTHERN',
  'BOWLING GREEN': 'BOWLING GREEN',
  'EAST CAROLINA': 'EAST CAROLINA',
  'NC STATE': 'NC STATE',
};

/** Normalize any school name to a canonical uppercase key for matching */
export function normalizeSchool(raw: string): string {
  const upper = raw.trim().toUpperCase();
  return SCHOOL_NORMALIZE[upper] ?? upper;
}

/** Uppercase abbreviations that should stay as-is */
export const UPPERCASE_SCHOOLS = new Set([
  'LSU',
  'UCF',
  'SMU',
  'BYU',
  'TCU',
  'UCLA',
  'USC',
  'USF',
  'UNLV',
  'UCONN',
]);

/** Convert canonical key to display name for new players */
export function toDisplaySchool(canonical: string): string {
  if (UPPERCASE_SCHOOLS.has(canonical)) return canonical;
  if (canonical === 'OLE MISS') return 'Ole Miss';
  if (canonical === 'NC STATE') return 'NC State';
  return canonical
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ---- Player Name Normalization ----

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.']/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .trim();
}

export function matchKey(name: string, school: string): string {
  return `${normalizePlayerName(name)}|${normalizeSchool(school)}`;
}

// ---- Stat Column Definitions ----

export const PASS_KEYS = [
  'epa_play',
  'acomp_pct',
  'pass_adot',
  'pass_ypa',
  'pass_rtg',
  'btt_pct',
  'twp_pct',
  'pass_yac_pct',
  'pass_td',
  'pass_int',
  'pass_sk',
  'avg_ttt',
  'pass_grd',
  'pos_epa_pct',
  'pass_key',
  'pass_db',
  'tm_db_pct',
  'pass_att',
  'pass_comp',
  'pass_comp_pct',
  'pass_yds',
  'pass_scr',
  'pass_bp',
  'pass_pbu',
  'pass_twp_count',
  'pass_btt_count',
  'pass_dp',
  'pass_1d',
];

export const RUSH_KEYS = [
  'rush_grd',
  'rush_key',
  'rush_att',
  'rush_att_pct',
  'rush_yds',
  'rush_ypc',
  'rush_td',
  'rush_1d',
  'rush_1dtd_pct',
  'poa_change_pct',
  'expl_run',
  'rush_ybc',
  'rush_ybc_att',
  'rush_ybc_pct',
  'stuff_rate',
  'rush_yco',
  'rush_yco_att',
  'rush_yco_pct',
  'mtf_run',
  'mtf_att',
  'rush_fum',
  'rush_fuml',
];

export const REC_KEYS = [
  'rec_grd',
  'rec_key',
  'rec_snp',
  'rec_threat',
  'rec_vs_prs',
  'rec_tgt',
  'slot_tgt_pct',
  'rec_adot',
  'deep_tgt_pct',
  'rec',
  'rec_comp_pct',
  'rec_yds',
  'ypr',
  'rec_expl',
  'rec_cbl',
  'rec_cblc_pct',
  'rec_ctt',
  'rec_ctc',
  'rec_ctc_pct',
  'rec_ctt_pct',
  'rec_td',
  'rec_1d',
  'mtf_rec',
  'rec_yac',
  'yac_rec',
  'rec_yco',
  'yprr',
  'wr_rtg',
  'rec_dp',
  'rec_dp_pct',
  'rec_fum',
  'rec_fuml',
];

export const PBLK_KEYS = [
  'pblk_grd',
  'pblk_key',
  'pblk_snp',
  'pblk_sk',
  'pblk_ht',
  'pblk_hu',
  'pblk_bd',
  'pblk_pr',
  'pblk_pbe',
  'pblk_kd_pct',
  'pblk_pr_pct',
];

export const PRSH_KEYS = [
  'prsh_grd',
  'prsh_key',
  'prsh_snp',
  'prsh_sk',
  'prsh_ht',
  'prsh_hu',
  'prsh_bd',
  'prsh_ubp',
  'prsh_cupp',
  'prsh_tpr',
  'prsh_bp',
  'prsh_win_pct',
  'prsh_pr_pct',
  'prsh_prp',
];

export const RUND_KEYS = [
  'rund_grd',
  'rund_key',
  'rund_snp',
  'rund_pct',
  'rund_tkl',
  'rund_ast',
  'rund_mt',
  'rund_stop',
  'rund_tfl',
  'rund_ff',
  'rund_adotk',
  'rund_neg_pct',
  'rund_pos_pct',
];

export const COV_KEYS = [
  'cov_grd',
  'cov_key',
  'cov_snp',
  'cov_press',
  'cov_ctgt',
  'cov_rec_all',
  'cov_comp_pct',
  'cov_yds_all',
  'cov_td',
  'cov_ypr',
  'cov_yds_ctgt',
  'cov_yds_cov',
  'cov_adot',
  'cov_1d_all',
  'cov_int',
  'cov_dp_int',
  'cov_pbu',
  'cov_finc',
  'cov_finc_pct',
  'cov_rtg',
  'cov_pen',
  'cov_stop',
  'cov_open_tgt_pct',
  'cov_dp_ot',
];

// ---- Position → Stat Sections Mapping ----

export const POSITION_STAT_SECTIONS: Partial<Record<Position, string[][]>> = {
  QB: [PASS_KEYS],
  WR: [REC_KEYS],
  TE: [REC_KEYS, PBLK_KEYS],
  RB: [RUSH_KEYS, PBLK_KEYS, REC_KEYS],
  OT: [PBLK_KEYS],
  OG: [PBLK_KEYS],
  EDGE: [PRSH_KEYS, RUND_KEYS, COV_KEYS],
  DL: [PRSH_KEYS, RUND_KEYS],
  LB: [PRSH_KEYS, COV_KEYS, RUND_KEYS],
  CB: [COV_KEYS],
  S: [COV_KEYS, RUND_KEYS],
};

// ---- Parsed Prospect ----

export interface ParsedProspect {
  name: string;
  school: string;
  normalizedSchool: string;
  position: Position;
  height?: number;
  weight?: number;
  fortyYard?: number;
  armLength?: number;
  handSize?: number;
  wingSpan?: number;
  stats: Record<string, number | string | null>;
}

// ---- CSV Parser ----

/** Parse CSV content for a given position into prospect records. */
export function parseProspectCsv(
  csvContent: string,
  position: Position,
): ParsedProspect[] {
  const sections = POSITION_STAT_SECTIONS[position];
  if (!sections) return [];

  const lines = csvContent.split('\n').filter((l) => l.trim());
  const dataLines = lines.slice(1); // skip header

  const prospects: ParsedProspect[] = [];

  for (const line of dataLines) {
    const cols = line.split(',');
    const name = cols[0]?.trim();
    const college = cols[1]?.trim();
    if (!name || !college) continue;

    const height = parseHeight(cols[2] ?? '');
    const weight = cols[3]?.trim()
      ? parseInt(cols[3].trim(), 10) || undefined
      : undefined;
    const fortyRaw = cols[4]?.trim();
    const fortyYard =
      fortyRaw && /^\d+\.\d+$/.test(fortyRaw)
        ? parseFloat(fortyRaw)
        : undefined;
    const armLength = parseFraction(cols[5] ?? '');
    const handSize = parseFraction(cols[6] ?? '');
    const wingSpan = parseFraction(cols[7] ?? '');

    const stats: Record<string, number | string | null> = {};
    let colIndex = 8;
    for (const section of sections) {
      for (const key of section) {
        const raw = cols[colIndex] ?? '';
        const val = parseStatValue(raw);
        if (val !== null) stats[key] = val;
        colIndex++;
      }
    }

    prospects.push({
      name,
      school: college,
      normalizedSchool: normalizeSchool(college),
      position,
      height,
      weight,
      fortyYard,
      armLength,
      handSize,
      wingSpan,
      stats,
    });
  }

  return prospects;
}
