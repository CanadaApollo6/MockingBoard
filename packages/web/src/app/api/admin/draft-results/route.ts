import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { isAdmin } from '@/lib/admin';
import { adminDb } from '@/lib/firebase-admin';
import type { DraftResultPick } from '@mockingboard/shared';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ?? '2026';

  const doc = await adminDb.collection('draftResults').doc(year).get();
  return NextResponse.json({ picks: doc.data()?.picks ?? [] });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { year, picks } = (await request.json()) as {
    year: number;
    picks: DraftResultPick[];
  };

  if (!year || !Array.isArray(picks))
    return NextResponse.json(
      { error: 'year and picks required' },
      { status: 400 },
    );

  await adminDb.collection('draftResults').doc(`${year}`).set({
    year,
    picks,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
