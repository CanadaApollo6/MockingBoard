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

// PFR positions → our Position type
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
};

function mapTeam(pfrAbbr: string): TeamAbbreviation {
  return TEAM_MAP[pfrAbbr] ?? (pfrAbbr as TeamAbbreviation);
}

function mapPosition(pfrPos: string): Position | null {
  return POSITION_MAP[pfrPos] ?? null;
}

interface ParsedPlayer {
  name: string;
  position: Position;
  school: string;
  consensusRank: number;
  year: number;
  draftedByTeam: TeamAbbreviation;
}

function parseCsv(filePath: string): ParsedPlayer[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Skip the two header rows
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
      year: 2025,
      draftedByTeam: mapTeam(teamAbbr),
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
  const csvPath = resolve(
    import.meta.dirname,
    '../../../drafts/2025_draft.csv',
  );
  const players = parseCsv(csvPath);

  console.log(`Parsed ${players.length} players from CSV`);

  // Clear existing players for this year to prevent duplicates
  await clearExistingPlayers(2025);

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
