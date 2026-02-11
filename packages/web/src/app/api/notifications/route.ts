import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { sanitize } from '@/lib/sanitize';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await adminDb
      .collection('notifications')
      .where('userId', '==', session.uid)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const notifications = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ notifications: sanitize(notifications) });
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    if (body.all) {
      const snap = await adminDb
        .collection('notifications')
        .where('userId', '==', session.uid)
        .where('read', '==', false)
        .limit(100)
        .get();

      const batch = adminDb.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, { read: true });
      }
      await batch.commit();
    } else if (body.ids && body.ids.length > 0) {
      const refs = body.ids
        .slice(0, 50)
        .map((id) => adminDb.collection('notifications').doc(id));
      const docs = await adminDb.getAll(...refs);
      const batch = adminDb.batch();
      for (const d of docs) {
        if (d.exists && d.data()?.userId === session.uid) {
          batch.update(d.ref, { read: true });
        }
      }
      await batch.commit();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update notifications:', err);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 },
    );
  }
}
