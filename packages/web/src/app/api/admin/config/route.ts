import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';
import {
  getCachedSeasonConfig,
  resetSeasonConfigCache,
  resetAllCaches,
} from '@/lib/cache';

export async function GET() {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [config, announcementDoc, draftNamesDoc] = await Promise.all([
    getCachedSeasonConfig(),
    adminDb.collection('config').doc('announcement').get(),
    adminDb.collection('config').doc('draftNames').get(),
  ]);

  return NextResponse.json({
    ...config,
    announcement: announcementDoc.exists
      ? announcementDoc.data()
      : { text: '', active: false, variant: 'info' },
    draftNames: draftNamesDoc.exists
      ? draftNamesDoc.data()
      : { adjectives: [], nouns: [] },
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  // Season config save
  if (body.draftYear && body.statsYear) {
    await adminDb.collection('config').doc('season').set({
      draftYear: body.draftYear,
      statsYear: body.statsYear,
    });
    resetSeasonConfigCache();
    revalidatePath('/', 'layout');
  }

  // Announcement save
  if (body.announcement !== undefined) {
    await adminDb
      .collection('config')
      .doc('announcement')
      .set(body.announcement);
    resetAllCaches();
    revalidatePath('/', 'layout');
  }

  // Draft names save
  if (body.draftNames !== undefined) {
    await adminDb.collection('config').doc('draftNames').set(body.draftNames);
    resetAllCaches();
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  resetAllCaches();
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, message: 'All caches flushed.' });
}
