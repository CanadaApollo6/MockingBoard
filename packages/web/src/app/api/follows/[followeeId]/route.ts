import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ followeeId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { followeeId } = await params;

  try {
    const docId = `${session.uid}_${followeeId}`;
    await adminDb.collection('follows').doc(docId).delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to unfollow user:', err);
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ followeeId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { followeeId } = await params;

  try {
    const docId = `${session.uid}_${followeeId}`;
    const doc = await adminDb.collection('follows').doc(docId).get();

    return NextResponse.json({ isFollowing: doc.exists });
  } catch (err) {
    console.error('Failed to check follow status:', err);
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 },
    );
  }
}
