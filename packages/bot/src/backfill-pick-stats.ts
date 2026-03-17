/**
 * One-time backfill script to populate playerPickStats from existing drafts.
 * Run with: npx tsx packages/bot/src/backfill-pick-stats.ts
 */
import './utils/env.js';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/firestore.js';
import type { TeamAbbreviation } from '@mockingboard/shared';

interface PickStats {
  pickCount: number;
  sumOverall: number;
  minOverall: number;
  maxOverall: number;
  teamCounts: Record<string, number>;
  year: number;
}

async function backfillPickStats() {
  console.log('Fetching completed drafts...');

  const draftsSnap = await db
    .collection('drafts')
    .where('status', '==', 'complete')
    .get();

  console.log(`Found ${draftsSnap.size} completed drafts`);

  // Aggregate stats per player across all drafts
  const statsMap = new Map<string, PickStats>();

  for (const draftDoc of draftsSnap.docs) {
    const draftData = draftDoc.data();
    const year = draftData.config?.year ?? 2025;

    const picksSnap = await draftDoc.ref.collection('picks').get();

    for (const pickDoc of picksSnap.docs) {
      const pick = pickDoc.data();
      const playerId = pick.playerId as string;
      const overall = pick.overall as number;
      const team = pick.team as TeamAbbreviation;

      if (!playerId || !overall || !team) continue;

      const existing = statsMap.get(playerId);
      if (existing) {
        existing.pickCount++;
        existing.sumOverall += overall;
        existing.minOverall = Math.min(existing.minOverall, overall);
        existing.maxOverall = Math.max(existing.maxOverall, overall);
        existing.teamCounts[team] = (existing.teamCounts[team] ?? 0) + 1;
      } else {
        statsMap.set(playerId, {
          pickCount: 1,
          sumOverall: overall,
          minOverall: overall,
          maxOverall: overall,
          teamCounts: { [team]: 1 },
          year,
        });
      }
    }

    process.stdout.write('.');
  }

  console.log(`\nAggregated stats for ${statsMap.size} players`);

  // Write to Firestore in batches of 500
  const entries = [...statsMap.entries()];
  let written = 0;

  for (let i = 0; i < entries.length; i += 500) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + 500);

    for (const [playerId, stats] of chunk) {
      const ref = db.collection('playerPickStats').doc(playerId);
      batch.set(ref, {
        playerId,
        year: stats.year,
        pickCount: stats.pickCount,
        sumOverall: stats.sumOverall,
        minOverall: stats.minOverall,
        maxOverall: stats.maxOverall,
        teamCounts: stats.teamCounts,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    written += chunk.length;
    console.log(`Written ${written}/${entries.length} player stats`);
  }

  console.log('Backfill complete!');
}

backfillPickStats().catch(console.error);
