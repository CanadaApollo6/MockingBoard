import './utils/env.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/firestore.js';
import type { UpdateData } from 'firebase-admin/firestore';
import type { Position } from '@mockingboard/shared';

// ---- Measurement Parsers ----

/** Parse NFL Combine height format: 6020 → 74 inches (6'2") */
function parseHeight(raw: string): number | undefined {
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 4000) return undefined;
  const feet = Math.floor(num / 1000);
  const inches = Math.floor((num % 1000) / 10);
  const eighths = num % 10;
  return feet * 12 + inches + eighths / 8;
}

/** Parse NFL Combine fraction format: 3038 → 30.375 (30⅜") */
function parseFraction(raw: string): number | undefined {
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 100) return undefined;
  const whole = Math.floor(num / 100);
  const eighths = Math.floor((num % 100) / 10);
  return whole + eighths / 8;
}

/** Parse a stat value: numbers stay as numbers, percentages stay as strings */
function parseStatValue(raw: string): number | string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith('%')) return trimmed;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  return trimmed;
}

// ---- School Name Normalization ----

const SCHOOL_NORMALIZE: Record<string, string> = {
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
function normalizeSchool(raw: string): string {
  const upper = raw.trim().toUpperCase();
  return SCHOOL_NORMALIZE[upper] ?? upper;
}

/** Uppercase abbreviations that should stay as-is */
const UPPERCASE_SCHOOLS = new Set([
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
function toDisplaySchool(canonical: string): string {
  if (UPPERCASE_SCHOOLS.has(canonical)) return canonical;
  if (canonical === 'OLE MISS') return 'Ole Miss';
  if (canonical === 'NC STATE') return 'NC State';
  return canonical
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ---- Player Name Normalization ----

function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.']/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .trim();
}

function matchKey(name: string, school: string): string {
  return `${normalizePlayerName(name)}|${normalizeSchool(school)}`;
}

// ---- Stat Column Definitions ----

const PASS_KEYS = [
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

const RUSH_KEYS = [
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

const REC_KEYS = [
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

const PBLK_KEYS = [
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

const PRSH_KEYS = [
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

const RUND_KEYS = [
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

const COV_KEYS = [
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

// ---- CSV Configurations ----

interface CsvConfig {
  file: string;
  position: Position;
  sections: string[][];
}

const CSV_CONFIGS: CsvConfig[] = [
  {
    file: '2026 Prospect Measureables - QB.csv',
    position: 'QB',
    sections: [PASS_KEYS],
  },
  {
    file: '2026 Prospect Measureables - Receiver.csv',
    position: 'WR',
    sections: [REC_KEYS],
  },
  {
    file: '2026 Prospect Measureables - Tight End.csv',
    position: 'TE',
    sections: [REC_KEYS, PBLK_KEYS],
  },
  {
    file: '2026 Prospect Measureables - Running Back.csv',
    position: 'RB',
    sections: [RUSH_KEYS, PBLK_KEYS, REC_KEYS],
  },
  {
    file: '2026 Prospect Measureables - Tackle.csv',
    position: 'OT',
    sections: [PBLK_KEYS],
  },
  {
    file: '2026 Prospect Measureables - iOL.csv',
    position: 'OG',
    sections: [PBLK_KEYS],
  },
  {
    file: '2026 Prospect Measureables - EDGE.csv',
    position: 'EDGE',
    sections: [PRSH_KEYS, RUND_KEYS, COV_KEYS],
  },
  {
    file: '2026 Prospect Measureables - IDL.csv',
    position: 'DL',
    sections: [PRSH_KEYS, RUND_KEYS],
  },
  {
    file: '2026 Prospect Measureables - LB.csv',
    position: 'LB',
    sections: [PRSH_KEYS, COV_KEYS, RUND_KEYS],
  },
  {
    file: '2026 Prospect Measureables - Corner.csv',
    position: 'CB',
    sections: [COV_KEYS],
  },
  {
    file: '2026 Prospect Measureables - Safety.csv',
    position: 'S',
    sections: [COV_KEYS, RUND_KEYS],
  },
];

// ---- Parsed Prospect ----

interface ParsedProspect {
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

function parseProspectCsv(config: CsvConfig, dir: string): ParsedProspect[] {
  const filePath = resolve(dir, config.file);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());
  const dataLines = lines.slice(1); // skip header

  const prospects: ParsedProspect[] = [];

  for (const line of dataLines) {
    const cols = line.split(',');
    const name = cols[0]?.trim();
    const college = cols[1]?.trim();
    if (!name || !college) continue;

    // Parse common measurables
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

    // Parse position-specific stats
    const stats: Record<string, number | string | null> = {};
    let colIndex = 8;
    for (const section of config.sections) {
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
      position: config.position,
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

// ---- Main ----

async function seedProspects() {
  const year = parseInt(process.argv[2], 10);
  if (!year) {
    console.error('Usage: tsx src/seed-prospects.ts <year>');
    process.exit(1);
  }

  const csvDir = resolve(import.meta.dirname, '../../../prospect_data');

  // 1. Parse all CSVs
  const allProspects = new Map<string, ParsedProspect>();
  let totalParsed = 0;

  for (const config of CSV_CONFIGS) {
    const prospects = parseProspectCsv(config, csvDir);
    for (const p of prospects) {
      const key = matchKey(p.name, p.school);
      // If duplicate (shouldn't happen), keep the first occurrence
      if (!allProspects.has(key)) {
        allProspects.set(key, p);
      }
    }
    console.log(
      `  ${config.file}: ${prospects.length} prospects (${config.position})`,
    );
    totalParsed += prospects.length;
  }
  console.log(
    `Parsed ${totalParsed} rows → ${allProspects.size} unique prospects\n`,
  );

  // 2. Fetch existing players from Firestore
  const snapshot = await db
    .collection('players')
    .where('year', '==', year)
    .get();
  console.log(`Found ${snapshot.size} existing players for year ${year}`);

  // Build lookup from existing players
  const existingByKey = new Map<
    string,
    { docId: string; name: string; school: string }
  >();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const key = matchKey(data.name, data.school);
    existingByKey.set(key, {
      docId: doc.id,
      name: data.name,
      school: data.school,
    });
  }

  // 3. Match and prepare writes
  let matched = 0;
  let added = 0;
  const unmatchedInFirestore: string[] = [];
  const now = FieldValue.serverTimestamp();

  // Collect all operations
  const updates: { docId: string; data: Record<string, unknown> }[] = [];
  const creates: Record<string, unknown>[] = [];

  for (const [key, prospect] of allProspects) {
    const existing = existingByKey.get(key);

    // Build attributes update (only set fields that have values)
    const attrs: Record<string, unknown> = {};
    if (prospect.height != null) attrs['attributes.height'] = prospect.height;
    if (prospect.weight != null) attrs['attributes.weight'] = prospect.weight;
    if (prospect.fortyYard != null)
      attrs['attributes.fortyYard'] = prospect.fortyYard;
    if (prospect.armLength != null)
      attrs['attributes.armLength'] = prospect.armLength;
    if (prospect.handSize != null)
      attrs['attributes.handSize'] = prospect.handSize;
    if (prospect.wingSpan != null)
      attrs['attributes.wingSpan'] = prospect.wingSpan;

    if (existing) {
      // Update existing player with measurables + stats
      updates.push({
        docId: existing.docId,
        data: {
          ...attrs,
          stats: prospect.stats,
          updatedAt: now,
        },
      });
      matched++;
      existingByKey.delete(key); // Track unmatched Firestore players
    } else {
      // New prospect — create with high rank so they sort after ranked players
      const displaySchool = toDisplaySchool(prospect.normalizedSchool);
      creates.push({
        name: prospect.name,
        position: prospect.position,
        school: displaySchool,
        consensusRank: 9999,
        year,
        attributes: {
          conference: '',
          ...(prospect.height != null && { height: prospect.height }),
          ...(prospect.weight != null && { weight: prospect.weight }),
          ...(prospect.fortyYard != null && { fortyYard: prospect.fortyYard }),
          ...(prospect.armLength != null && { armLength: prospect.armLength }),
          ...(prospect.handSize != null && { handSize: prospect.handSize }),
          ...(prospect.wingSpan != null && { wingSpan: prospect.wingSpan }),
        },
        stats: prospect.stats,
        updatedAt: now,
      });
      added++;
    }
  }

  // Log unmatched Firestore players (exist in DB but not in prospect CSVs)
  for (const [, existing] of existingByKey) {
    unmatchedInFirestore.push(`${existing.name} (${existing.school})`);
  }

  console.log(`\nMatch results:`);
  console.log(`  Matched (will update): ${matched}`);
  console.log(`  New prospects (will create): ${added}`);
  console.log(
    `  Existing players without prospect data: ${unmatchedInFirestore.length}`,
  );

  if (unmatchedInFirestore.length > 0 && unmatchedInFirestore.length <= 50) {
    console.log(`\nUnmatched existing players:`);
    for (const name of unmatchedInFirestore) {
      console.log(`  - ${name}`);
    }
  }

  // 4. Batch write to Firestore
  const BATCH_SIZE = 499;
  let opCount = 0;

  // Process updates in batches
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + BATCH_SIZE);
    for (const { docId, data } of chunk) {
      batch.update(
        db.collection('players').doc(docId),
        data as UpdateData<Record<string, unknown>>,
      );
    }
    await batch.commit();
    opCount += chunk.length;
    console.log(`  Updated ${opCount}/${updates.length} players...`);
  }

  // Process creates in batches
  opCount = 0;
  for (let i = 0; i < creates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = creates.slice(i, i + BATCH_SIZE);
    for (const data of chunk) {
      const ref = db.collection('players').doc();
      batch.set(ref, data);
    }
    await batch.commit();
    opCount += chunk.length;
    console.log(`  Created ${opCount}/${creates.length} players...`);
  }

  console.log(
    `\nDone. Updated ${updates.length}, created ${creates.length} players.`,
  );
}

seedProspects().catch((err) => {
  console.error('Seed prospects failed:', err);
  process.exit(1);
});
