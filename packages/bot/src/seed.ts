import './utils/env.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/firestore.js';
import { teams } from '@mockingboard/shared';
import type { Position, TeamAbbreviation } from '@mockingboard/shared';

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

// Position abbreviations → our Position type (covers both PFR and PFF formats)
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
  // PFF-specific
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

async function seed() {
  const year = parseInt(process.argv[2], 10);
  if (!year || ![2025, 2026].includes(year)) {
    console.error('Usage: tsx src/seed.ts <year>  (2025 or 2026)');
    process.exit(1);
  }

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

  await clearExistingPlayers(year);

  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  // Seed players
  for (const player of players) {
    const ref = db.collection('players').doc();
    batch.set(ref, { ...player, updatedAt: now });
  }

  // Seed teams
  for (const team of teams) {
    const ref = db.collection('teams').doc(team.id);
    batch.set(ref, { ...team, updatedAt: now });
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
