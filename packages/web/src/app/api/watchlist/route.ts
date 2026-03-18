import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const yearParam = searchParams.get('year');

  // Single-item check
  if (playerId) {
    const docId = `${session.uid}_${playerId}`;
    const doc = await adminDb.collection('watchlistItems').doc(docId).get();
    return NextResponse.json({ isWatching: doc.exists });
  }

  // List all for year
  if (!yearParam) {
    return NextResponse.json({ error: 'year is required' }, { status: 400 });
  }

  const year = parseInt(yearParam, 10);
  if (isNaN(year)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const snapshot = await adminDb
    .collection('watchlistItems')
    .where('userId', '==', session.uid)
    .where('year', '==', year)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { playerId, year } = body;

  if (!playerId || !year) {
    return NextResponse.json(
      { error: 'playerId and year required' },
      { status: 400 },
    );
  }

  const docId = `${session.uid}_${playerId}`;
  const ref = adminDb.collection('watchlistItems').doc(docId);

  const existing = await ref.get();
  if (existing.exists) {
    return NextResponse.json({ ok: true });
  }

  await ref.set({
    userId: session.uid,
    playerId,
    year,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  }

  const docId = `${session.uid}_${playerId}`;
  await adminDb.collection('watchlistItems').doc(docId).delete();

  return NextResponse.json({ ok: true });
}
