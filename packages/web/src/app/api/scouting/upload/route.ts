import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin';
import {
  parseProspectCsv,
  matchKey,
  toDisplaySchool,
  type ParsedProspect,
} from '@mockingboard/shared';
import type { Position } from '@mockingboard/shared';

interface UploadBody {
  csvContent: string;
  position: Position;
  scoutProfileId: string;
  year: number;
  dryRun: boolean;
  excludeKeys?: string[];
}

interface PreviewMatch {
  key: string;
  csvName: string;
  existingName: string;
  school: string;
  position: Position;
  statsCount: number;
  hasHeight: boolean;
  hasWeight: boolean;
}

interface PreviewNew {
  key: string;
  name: string;
  school: string;
  position: Position;
  statsCount: number;
}

interface PreviewUnmatched {
  name: string;
  school: string;
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.uid)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: UploadBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { csvContent, position, scoutProfileId, year, dryRun, excludeKeys } =
    body;

  if (!csvContent || !position || !scoutProfileId || !year) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: csvContent, position, scoutProfileId, year',
      },
      { status: 400 },
    );
  }

  // Parse CSV
  const prospects = parseProspectCsv(csvContent, position);
  if (prospects.length === 0) {
    return NextResponse.json(
      { error: 'No prospects parsed. Check CSV format and position.' },
      { status: 400 },
    );
  }

  // Build lookup from CSV prospects
  const csvByKey = new Map<string, ParsedProspect>();
  for (const p of prospects) {
    const key = matchKey(p.name, p.school);
    if (!csvByKey.has(key)) csvByKey.set(key, p);
  }

  // Fetch existing players for this year
  const snapshot = await adminDb
    .collection('players')
    .where('year', '==', year)
    .get();

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

  // Match CSV prospects against existing players
  const matched: PreviewMatch[] = [];
  const newPlayers: PreviewNew[] = [];
  const matchedExistingKeys = new Set<string>();

  for (const [key, prospect] of csvByKey) {
    const existing = existingByKey.get(key);
    if (existing) {
      matched.push({
        key,
        csvName: prospect.name,
        existingName: existing.name,
        school: prospect.school,
        position: prospect.position,
        statsCount: Object.keys(prospect.stats).length,
        hasHeight: prospect.height != null,
        hasWeight: prospect.weight != null,
      });
      matchedExistingKeys.add(key);
    } else {
      newPlayers.push({
        key,
        name: prospect.name,
        school: prospect.school,
        position: prospect.position,
        statsCount: Object.keys(prospect.stats).length,
      });
    }
  }

  // Existing players not in CSV
  const unmatched: PreviewUnmatched[] = [];
  for (const [key, existing] of existingByKey) {
    if (!matchedExistingKeys.has(key)) {
      unmatched.push({ name: existing.name, school: existing.school });
    }
  }

  // Preview mode — return results without writing
  if (dryRun) {
    return NextResponse.json({
      matched,
      newPlayers,
      unmatched,
      totalParsed: prospects.length,
    });
  }

  // Commit mode — write to Firestore
  const excludeSet = new Set(excludeKeys ?? []);

  // Fetch scout profile for denormalization
  const scoutDoc = await adminDb
    .collection('scoutProfiles')
    .doc(scoutProfileId)
    .get();
  const scoutData = scoutDoc.data();
  if (!scoutData) {
    return NextResponse.json(
      { error: 'Scout profile not found' },
      { status: 404 },
    );
  }

  const providerEntry = {
    name: scoutData.name,
    slug: scoutData.slug,
    fields: ['stats', 'attributes'],
  };

  const BATCH_SIZE = 499;
  const now = FieldValue.serverTimestamp();
  let updated = 0;
  let created = 0;

  // Batch update matched players
  const updateOps: { docId: string; data: Record<string, unknown> }[] = [];
  for (const m of matched) {
    if (excludeSet.has(m.key)) continue;
    const prospect = csvByKey.get(m.key)!;
    const existing = existingByKey.get(m.key)!;

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

    updateOps.push({
      docId: existing.docId,
      data: {
        ...attrs,
        stats: prospect.stats,
        [`dataProviders.${scoutProfileId}`]: providerEntry,
        updatedAt: now,
      },
    });
  }

  for (let i = 0; i < updateOps.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = updateOps.slice(i, i + BATCH_SIZE);
    for (const { docId, data } of chunk) {
      batch.update(
        adminDb.collection('players').doc(docId),
        data as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
      );
    }
    await batch.commit();
    updated += chunk.length;
  }

  // Batch create new players
  const createOps: Record<string, unknown>[] = [];
  for (const n of newPlayers) {
    if (excludeSet.has(n.key)) continue;
    const prospect = csvByKey.get(n.key)!;
    const displaySchool = toDisplaySchool(prospect.normalizedSchool);

    createOps.push({
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
      [`dataProviders`]: { [scoutProfileId]: providerEntry },
      updatedAt: now,
    });
  }

  for (let i = 0; i < createOps.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = createOps.slice(i, i + BATCH_SIZE);
    for (const data of chunk) {
      const ref = adminDb.collection('players').doc();
      batch.set(ref, data);
    }
    await batch.commit();
    created += chunk.length;
  }

  // Update scout profile stats
  const positionsCovered = new Set<string>();
  for (const m of matched) {
    if (!excludeSet.has(m.key)) positionsCovered.add(m.position);
  }
  for (const n of newPlayers) {
    if (!excludeSet.has(n.key)) positionsCovered.add(n.position);
  }

  await adminDb
    .collection('scoutProfiles')
    .doc(scoutProfileId)
    .update({
      'stats.playersContributed': FieldValue.increment(updated + created),
      'stats.positionsCovered': Array.from(positionsCovered),
      updatedAt: now,
    });

  return NextResponse.json({ updated, created });
}
