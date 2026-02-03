import './utils/env.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/firestore.js';
import type { UpdateData } from 'firebase-admin/firestore';
import type { Position } from '@mockingboard/shared';
import {
  parseProspectCsv,
  matchKey,
  toDisplaySchool,
  type ParsedProspect,
} from '@mockingboard/shared';

// ---- CSV Files ----

const CSV_FILES: { file: string; position: Position }[] = [
  { file: '2026 Prospect Measureables - QB.csv', position: 'QB' },
  { file: '2026 Prospect Measureables - Receiver.csv', position: 'WR' },
  { file: '2026 Prospect Measureables - Tight End.csv', position: 'TE' },
  { file: '2026 Prospect Measureables - Running Back.csv', position: 'RB' },
  { file: '2026 Prospect Measureables - Tackle.csv', position: 'OT' },
  { file: '2026 Prospect Measureables - iOL.csv', position: 'OG' },
  { file: '2026 Prospect Measureables - EDGE.csv', position: 'EDGE' },
  { file: '2026 Prospect Measureables - IDL.csv', position: 'DL' },
  { file: '2026 Prospect Measureables - LB.csv', position: 'LB' },
  { file: '2026 Prospect Measureables - Corner.csv', position: 'CB' },
  { file: '2026 Prospect Measureables - Safety.csv', position: 'S' },
];

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

  for (const { file, position } of CSV_FILES) {
    const content = readFileSync(resolve(csvDir, file), 'utf-8');
    const prospects = parseProspectCsv(content, position);
    for (const p of prospects) {
      const key = matchKey(p.name, p.school);
      if (!allProspects.has(key)) {
        allProspects.set(key, p);
      }
    }
    console.log(`  ${file}: ${prospects.length} prospects (${position})`);
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
