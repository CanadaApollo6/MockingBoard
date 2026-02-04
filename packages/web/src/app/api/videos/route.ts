import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { sanitize } from '@/lib/sanitize';
import type { VideoBreakdown } from '@mockingboard/shared';

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json(
      { error: 'Missing required query param: playerId' },
      { status: 400 },
    );
  }

  try {
    const snap = await adminDb
      .collection('videoBreakdowns')
      .where('playerId', '==', playerId)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const videos: VideoBreakdown[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as VideoBreakdown[];

    return NextResponse.json({ videos: sanitize(videos) });
  } catch (err) {
    console.error('Failed to fetch videos:', err);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    playerId: string;
    youtubeUrl: string;
    title: string;
    timestamp?: number;
    tags?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { playerId, youtubeUrl, title } = body;

  if (!playerId || !youtubeUrl || !title) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

  if (!youtubeVideoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const userDoc = await adminDb.collection('users').doc(session.uid).get();
    const authorName =
      userDoc.data()?.displayName ?? userDoc.data()?.name ?? 'Unknown';

    const ref = adminDb.collection('videoBreakdowns').doc();
    const video = {
      playerId,
      authorId: session.uid,
      authorName,
      youtubeUrl,
      youtubeVideoId,
      title,
      timestamp: body.timestamp ?? null,
      tags: body.tags ?? [],
      createdAt: FieldValue.serverTimestamp(),
    };

    await ref.set(video);
    return NextResponse.json({ videoId: ref.id });
  } catch (err) {
    console.error('Failed to create video:', err);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 },
    );
  }
}
