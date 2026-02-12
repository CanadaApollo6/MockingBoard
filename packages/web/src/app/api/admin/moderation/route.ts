import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';
import { adminDb } from '@/lib/firebase/firebase-admin';

export interface ModerationItem {
  id: string;
  contentType: 'scouting-report' | 'video' | 'board' | 'profile';
  contentId: string;
  contentPreview: string;
  authorId: string;
  authorName: string;
  status: 'pending' | 'approved' | 'removed';
  reviewedBy?: string;
  reviewedAt?: unknown;
  createdAt: unknown;
}

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending';
  const type = searchParams.get('type') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  let query = adminDb
    .collection('moderation')
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (type) {
    query = adminDb
      .collection('moderation')
      .where('status', '==', status)
      .where('contentType', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ModerationItem[];

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.uid)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id, action } = body as { id: string; action: 'approve' | 'remove' };

  if (!id || !action)
    return NextResponse.json(
      { error: 'ID and action required' },
      { status: 400 },
    );

  const newStatus = action === 'approve' ? 'approved' : 'removed';

  await adminDb.collection('moderation').doc(id).update({
    status: newStatus,
    reviewedBy: session.uid,
    reviewedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
