import './utils/env.js';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/firestore.js';
import type { Position } from '@mockingboard/shared';

/**
 * One-time backfill script:
 * 1. Creates Brett Kollmann's scout profile in Firestore
 * 2. Adds `dataProviders` attribution to all existing players that have stats
 *
 * Usage: npx tsx packages/bot/src/seed-scout-profiles.ts
 */

const BRETT_PROFILE = {
  name: 'Brett Kollmann',
  slug: 'brett-kollmann',
  bio: 'NFL analyst and YouTube creator covering the NFL Draft, scouting, and film breakdowns.',
  links: {
    youtube: 'https://www.youtube.com/@BrettKollmann',
    twitter: 'https://x.com/BrettKollmann',
  },
  tier: 'elite' as const,
};

async function main() {
  const year = parseInt(process.argv[2] ?? '2026', 10);
  console.log(`Backfilling scout profile + attribution for year ${year}...`);

  // Step 1: Create or update Brett's scout profile
  const profileRef = db.collection('scoutProfiles').doc();
  const profileId = profileRef.id;

  // Check if a profile with this slug already exists
  const existing = await db
    .collection('scoutProfiles')
    .where('slug', '==', BRETT_PROFILE.slug)
    .limit(1)
    .get();

  let resolvedId: string;

  if (!existing.empty) {
    resolvedId = existing.docs[0].id;
    console.log(`Scout profile already exists: ${resolvedId}`);
  } else {
    await profileRef.set({
      ...BRETT_PROFILE,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    resolvedId = profileId;
    console.log(`Created scout profile: ${resolvedId}`);
  }

  // Step 2: Find all players for the year that have stats
  const playersSnapshot = await db
    .collection('players')
    .where('year', '==', year)
    .get();

  const playersWithStats = playersSnapshot.docs.filter((doc) => {
    const data = doc.data();
    return data.stats && Object.keys(data.stats).length > 0;
  });

  console.log(
    `Found ${playersWithStats.length} players with stats out of ${playersSnapshot.size} total`,
  );

  // Step 3: Build attribution fields list per player
  const provider = {
    name: BRETT_PROFILE.name,
    slug: BRETT_PROFILE.slug,
    fields: ['stats'],
  };

  // Step 4: Batch update players with dataProviders
  const BATCH_SIZE = 499;
  const positionsCovered = new Set<Position>();
  let opCount = 0;

  for (let i = 0; i < playersWithStats.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = playersWithStats.slice(i, i + BATCH_SIZE);

    for (const doc of chunk) {
      const data = doc.data();
      positionsCovered.add(data.position as Position);

      // Add attributes fields if they exist
      const fields = [...provider.fields];
      if (data.attributes) {
        if (data.attributes.height) fields.push('attributes.height');
        if (data.attributes.weight) fields.push('attributes.weight');
        if (data.attributes.fortyYard) fields.push('attributes.fortyYard');
        if (data.attributes.armLength) fields.push('attributes.armLength');
        if (data.attributes.handSize) fields.push('attributes.handSize');
        if (data.attributes.wingSpan) fields.push('attributes.wingSpan');
      }

      batch.update(doc.ref, {
        [`dataProviders.${resolvedId}`]: {
          name: BRETT_PROFILE.name,
          slug: BRETT_PROFILE.slug,
          fields,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    opCount += chunk.length;
    console.log(`  Updated ${opCount}/${playersWithStats.length} players...`);
  }

  // Step 5: Update scout profile stats
  await db
    .collection('scoutProfiles')
    .doc(resolvedId)
    .update({
      stats: {
        playersContributed: playersWithStats.length,
        positionsCovered: [...positionsCovered],
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

  console.log(
    `Done! Updated ${opCount} players with attribution for ${BRETT_PROFILE.name}`,
  );
  console.log(`Positions covered: ${[...positionsCovered].join(', ')}`);
}

main().catch(console.error);
