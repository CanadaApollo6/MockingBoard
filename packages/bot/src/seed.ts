import './utils/env.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/firestore.js';
import { teams } from '@mockingboard/shared';
import type {
  Position,
  TeamAbbreviation,
  DraftSlot,
  FuturePickSeed,
} from '@mockingboard/shared';

// ---- Team Name Mappings ----

// PFR team abbreviations → our TeamAbbreviation
const TEAM_MAP: Record<string, TeamAbbreviation> = {
  LVR: 'LV',
  NWE: 'NE',
  NOR: 'NO',
  GNB: 'GB',
  SFO: 'SF',
  TAM: 'TB',
  KAN: 'KC',
};

// City/market name → TeamAbbreviation (for draft order txt format)
const CITY_TO_TEAM: Record<string, TeamAbbreviation> = {
  'Las Vegas': 'LV',
  'NY Jets': 'NYJ',
  Arizona: 'ARI',
  Tennessee: 'TEN',
  'NY Giants': 'NYG',
  Cleveland: 'CLE',
  Washington: 'WAS',
  'New Orleans': 'NO',
  'Kansas City': 'KC',
  Cincinnati: 'CIN',
  Miami: 'MIA',
  Dallas: 'DAL',
  'LA Rams': 'LAR',
  Baltimore: 'BAL',
  'Tampa Bay': 'TB',
  Detroit: 'DET',
  Minnesota: 'MIN',
  Carolina: 'CAR',
  'Green Bay': 'GB',
  Pittsburgh: 'PIT',
  'LA Chargers': 'LAC',
  Philadelphia: 'PHI',
  Chicago: 'CHI',
  Buffalo: 'BUF',
  'San Francisco': 'SF',
  Houston: 'HOU',
  Indianapolis: 'IND',
  Atlanta: 'ATL',
  Jacksonville: 'JAX',
  Denver: 'DEN',
  'New England': 'NE',
  Seattle: 'SEA',
};

// Full team name → TeamAbbreviation (derived from teams seed data)
const FULLNAME_TO_TEAM = Object.fromEntries(
  teams.map((t) => [t.name, t.id]),
) as Record<string, TeamAbbreviation>;

// ---- Position Mappings ----

const POSITION_MAP: Record<string, Position> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OT: 'OT',
  OG: 'OG',
  C: 'C',
  OL: 'OG',
  G: 'OG',
  DE: 'EDGE',
  DT: 'DL',
  DL: 'DL',
  LB: 'LB',
  OLB: 'LB',
  CB: 'CB',
  SAF: 'S',
  S: 'S',
  DB: 'CB',
  FS: 'S',
  K: 'K',
  P: 'P',
  EDGE: 'EDGE',
  LS: 'LS',
  ED: 'EDGE',
  HB: 'RB',
  T: 'OT',
  DI: 'DL',
  FB: 'RB',
};

function mapTeam(pfrAbbr: string): TeamAbbreviation {
  return TEAM_MAP[pfrAbbr] ?? (pfrAbbr as TeamAbbreviation);
}

function mapPosition(pos: string): Position | null {
  return POSITION_MAP[pos] ?? null;
}

// ---- Player Parsers ----

interface ParsedPlayer {
  name: string;
  position: Position;
  school: string;
  consensusRank: number;
  year: number;
  draftedByTeam?: TeamAbbreviation;
}

// PFR format: 2 header rows, columns: Rnd(0), Pick(1), Tm(2), Player(3), Pos(4), ..., School(27)
function parsePfrCsv(filePath: string, year: number): ParsedPlayer[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const dataLines = lines.slice(2);
  const players: ParsedPlayer[] = [];

  for (const line of dataLines) {
    const cols = line.split(',');
    const pick = parseInt(cols[1], 10);
    const teamAbbr = cols[2];
    const name = cols[3];
    const pos = cols[4];
    const school = cols[27];

    if (!name || !pos || !teamAbbr || isNaN(pick)) continue;

    const position = mapPosition(pos);
    if (!position) {
      console.log(`Skipping ${name} (unknown position: ${pos})`);
      continue;
    }

    players.push({
      name: name.trim(),
      position,
      school: school?.trim() ?? '',
      consensusRank: pick,
      year,
      draftedByTeam: mapTeam(teamAbbr),
    });
  }

  return players;
}

// PFF format: 1 header row, columns: Rank(0), Player(1), Position(2), School(3), PFF Grade(4), Analysis(5)
function parsePffCsv(filePath: string, year: number): ParsedPlayer[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const dataLines = lines.slice(1);
  const players: ParsedPlayer[] = [];

  for (const line of dataLines) {
    const cols = line.split(',');
    const rank = parseInt(cols[0], 10);
    const name = cols[1];
    const pos = cols[2];
    const school = cols[3];

    if (!name || !pos || isNaN(rank)) continue;

    const position = mapPosition(pos);
    if (!position) {
      console.log(`Skipping ${name} (unknown position: ${pos})`);
      continue;
    }

    players.push({
      name: name.trim(),
      position,
      school: school?.trim() ?? '',
      consensusRank: rank,
      year,
    });
  }

  return players;
}

// ---- Draft Order Parsers ----

/**
 * Parse draft order from the txt format used for 2026+.
 * Format: round headers, pick numbers on alternating lines with team names,
 * optional indented original team annotation (skipped).
 */
function parseDraftOrderTxt(filePath: string): DraftSlot[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const slots: DraftSlot[] = [];

  let currentRound = 0;
  let pickInRound = 0;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Round header: "1st Round", "2nd Round", etc.
    if (/^\d+(st|nd|rd|th) Round$/i.test(trimmed)) {
      currentRound++;
      pickInRound = 0;
      i++;
      continue;
    }

    // Pick number line (e.g., "13\t ")
    const pickMatch = trimmed.match(/^(\d+)\s*$/);
    if (pickMatch && currentRound > 0) {
      const overall = parseInt(pickMatch[1], 10);
      i++;

      const teamName = lines[i]?.trim();
      if (!teamName) {
        i++;
        continue;
      }

      const team = CITY_TO_TEAM[teamName];
      if (!team) {
        console.warn(`Unknown team: "${teamName}" at pick ${overall}`);
        i++;
        continue;
      }

      i++;
      pickInRound++;

      // Parse traded-from annotation: indented line = original team
      let originalTeam: TeamAbbreviation | undefined;
      if (i < lines.length && lines[i] && /^\s{2,}\S/.test(lines[i])) {
        const origName = lines[i].trim();
        originalTeam = CITY_TO_TEAM[origName];
        if (!originalTeam) {
          console.warn(
            `Unknown original team: "${origName}" at pick ${overall}`,
          );
        }
        i++;
      }

      if (originalTeam) {
        slots.push({
          overall,
          round: currentRound,
          pick: pickInRound,
          team: originalTeam,
          teamOverride: team,
        });
      } else {
        slots.push({ overall, round: currentRound, pick: pickInRound, team });
      }
      continue;
    }

    i++;
  }

  return slots;
}

/**
 * Derive draft order from PFR CSV (for 2025).
 * Extracts round, overall pick, and team from each row.
 */
function parseDraftOrderFromPfr(filePath: string): DraftSlot[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());
  const dataLines = lines.slice(2);

  const slots: DraftSlot[] = [];
  let currentRound = 0;
  let pickInRound = 0;

  for (const line of dataLines) {
    const cols = line.split(',');
    const round = parseInt(cols[0], 10);
    const overall = parseInt(cols[1], 10);
    const teamAbbr = cols[2];

    if (isNaN(round) || isNaN(overall) || !teamAbbr) continue;

    if (round !== currentRound) {
      currentRound = round;
      pickInRound = 0;
    }
    pickInRound++;

    slots.push({
      overall,
      round,
      pick: pickInRound,
      team: mapTeam(teamAbbr),
    });
  }

  return slots;
}

// ---- Future Draft Assets Parser ----

/**
 * Parse future draft pick ownership from the text file.
 * Handles traded picks, including hardcoded resolution for conditional picks:
 * - NYJ gets DAL's 2027 1st (more favorable)
 * - DAL keeps GB's 2027 1st (less favorable)
 */
function parseFutureDraftAssets(
  filePath: string,
): Partial<Record<TeamAbbreviation, FuturePickSeed[]>> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const result: Partial<Record<TeamAbbreviation, FuturePickSeed[]>> = {};
  let currentTeam: TeamAbbreviation | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Team header: "Arizona Cardinals Draft Picks"
    const headerMatch = trimmed.match(/^(.+) Draft Picks$/);
    if (headerMatch) {
      currentTeam = FULLNAME_TO_TEAM[headerMatch[1]] ?? null;
      if (currentTeam) result[currentTeam] = [];
      continue;
    }

    if (!currentTeam) continue;

    // Pick line: "2027 1st Round: Own"
    const pickMatch = trimmed.match(/^(\d+) (\d+)(?:st|nd|rd|th) Round: (.+)$/);
    if (!pickMatch) continue;

    const year = parseInt(pickMatch[1], 10);
    const round = parseInt(pickMatch[2], 10);
    const status = pickMatch[3].trim();

    if (status === 'Own') {
      result[currentTeam]!.push({ year, round, originalTeam: currentTeam });
    } else if (status.startsWith('To ')) {
      // Pick traded away — don't add for this team
    } else if (currentTeam === 'DAL' && status.includes('Less favorable')) {
      // DAL keeps GB's 1st (per resolved conditional)
      result[currentTeam]!.push({ year, round, originalTeam: 'GB' });
    } else if (currentTeam === 'NYJ' && status.includes(';')) {
      // NYJ gets: own + IND's + DAL's 1st (per resolved conditional)
      result[currentTeam]!.push({ year, round, originalTeam: 'NYJ' });
      result[currentTeam]!.push({ year, round, originalTeam: 'IND' });
      result[currentTeam]!.push({ year, round, originalTeam: 'DAL' });
    }
  }

  return result;
}

// ---- Seed Helpers ----

async function clearExistingPlayers(year: number) {
  const snapshot = await db
    .collection('players')
    .where('year', '==', year)
    .get();

  if (snapshot.empty) return;

  console.log(`Clearing ${snapshot.size} existing players for year ${year}...`);
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

// ---- Main Seed ----

async function seed() {
  const year = parseInt(process.argv[2], 10);
  const orderOnly = process.argv.includes('--order-only');

  if (!year || ![2025, 2026].includes(year)) {
    console.error(
      'Usage: tsx src/seed.ts <year> [--order-only]  (2025 or 2026)',
    );
    process.exit(1);
  }

  // Parse draft order
  const draftOrderConfigs: Record<
    number,
    { file: string; parser: (path: string) => DraftSlot[] }
  > = {
    2025: { file: '2025_draft.csv', parser: parseDraftOrderFromPfr },
    2026: { file: '2026_draft_order.txt', parser: parseDraftOrderTxt },
  };

  const orderConfig = draftOrderConfigs[year];
  const orderPath = resolve(
    import.meta.dirname,
    '../../../drafts',
    orderConfig.file,
  );
  const draftSlots = orderConfig.parser(orderPath);
  console.log(`Parsed ${draftSlots.length} draft slots for ${year}`);

  // Write draft order to draftOrders/{year}
  await db.collection('draftOrders').doc(`${year}`).set({
    slots: draftSlots,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`Seeded draft order for ${year} (${draftSlots.length} slots)`);

  if (orderOnly) return;

  // Parse players
  const csvConfigs: Record<
    number,
    { file: string; parser: typeof parsePfrCsv }
  > = {
    2025: { file: '2025_draft.csv', parser: parsePfrCsv },
    2026: { file: 'pff-my-big-board-2026-01-30.csv', parser: parsePffCsv },
  };

  const { file, parser } = csvConfigs[year];
  const csvPath = resolve(import.meta.dirname, '../../../drafts', file);
  const players = parser(csvPath, year);
  console.log(`Parsed ${players.length} players for ${year} from ${file}`);

  // Parse future draft assets (optional)
  let futureAssets: Partial<Record<TeamAbbreviation, FuturePickSeed[]>> | null =
    null;
  try {
    const futureAssetsPath = resolve(
      import.meta.dirname,
      '../../../drafts',
      'future_draft_assets.txt',
    );
    futureAssets = parseFutureDraftAssets(futureAssetsPath);
    console.log(
      `Parsed future pick data for ${Object.keys(futureAssets).length} teams`,
    );
  } catch {
    console.log('No future draft assets file found, skipping');
  }

  // Clear existing players
  await clearExistingPlayers(year);

  // Batch write players and teams
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const player of players) {
    const ref = db.collection('players').doc();
    batch.set(ref, { ...player, updatedAt: now });
  }

  for (const team of teams) {
    const ref = db.collection('teams').doc(team.id);
    const teamData: Record<string, unknown> = { ...team, updatedAt: now };
    if (futureAssets?.[team.id]) {
      teamData.futurePicks = futureAssets[team.id];
    }
    batch.set(ref, teamData);
  }

  await batch.commit();
  console.log(
    `Seeded ${players.length} players and ${teams.length} teams to Firestore.`,
  );
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
