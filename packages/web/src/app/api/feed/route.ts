import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { sanitize } from '@/lib/firebase/sanitize';
import type { ActivityEvent } from '@mockingboard/shared';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  let query = adminDb
    .collection('activityEvents')
    .where('feedUserId', '==', session.uid)
    .orderBy('createdAt', 'desc');

  if (cursor) {
    query = query.startAfter(new Timestamp(Number(cursor), 0));
  }

  query = query.limit(limit + 1);

  const snapshot = await query.get();
  const events: ActivityEvent[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ActivityEvent[];

  const hasMore = events.length > limit;

  return NextResponse.json({
    events: sanitize(events.slice(0, limit)),
    hasMore,
  });
}
