import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { videoId } = await params;
  const doc = await adminDb.collection('videoBreakdowns').doc(videoId).get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  if (doc.data()?.authorId !== session.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await adminDb.collection('videoBreakdowns').doc(videoId).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete video:', err);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 },
    );
  }
}
