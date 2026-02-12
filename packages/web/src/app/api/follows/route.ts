import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { sanitize } from '@/lib/firebase/sanitize';
import { notifyNewFollower } from '@/lib/notifications';

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { followeeId: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { followeeId } = body;

  if (!followeeId) {
    return NextResponse.json(
      { error: 'Missing required field: followeeId' },
      { status: 400 },
    );
  }

  if (followeeId === session.uid) {
    return NextResponse.json(
      { error: 'Cannot follow yourself' },
      { status: 400 },
    );
  }

  try {
    // Validate that the followee exists
    const followeeDoc = await adminDb.collection('users').doc(followeeId).get();
    if (!followeeDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const docId = `${session.uid}_${followeeId}`;
    await adminDb.collection('follows').doc(docId).set({
      followerId: session.uid,
      followeeId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Fire-and-forget: notify the followee
    const followerDoc = await adminDb
      .collection('users')
      .doc(session.uid)
      .get();
    const followerData = followerDoc.data();
    notifyNewFollower(
      followeeId,
      followerData?.displayName ?? 'Someone',
      followerData?.slug,
    ).catch((err) => console.error('Follow notification failed:', err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to follow user:', err);
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const userId = searchParams.get('userId');

  if (!type || !userId) {
    return NextResponse.json(
      { error: 'Missing required query params: type and userId' },
      { status: 400 },
    );
  }

  if (type !== 'following' && type !== 'followers') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "following" or "followers"' },
      { status: 400 },
    );
  }

  try {
    const field = type === 'following' ? 'followerId' : 'followeeId';
    const snap = await adminDb
      .collection('follows')
      .where(field, '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const follows = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ follows: sanitize(follows) });
  } catch (err) {
    console.error('Failed to fetch follows:', err);
    return NextResponse.json(
      { error: 'Failed to fetch follows' },
      { status: 500 },
    );
  }
}
