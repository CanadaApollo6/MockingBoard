import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { sanitize } from '@/lib/firebase/sanitize';
import type { VideoBreakdown, VideoPlatform } from '@mockingboard/shared';

interface ParsedVideo {
  platform: VideoPlatform;
  embedId: string;
}

function parseVideoUrl(url: string): ParsedVideo | null {
  // YouTube
  const ytPatterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = url.match(pattern);
    if (match) return { platform: 'youtube', embedId: match[1] };
  }

  // Instagram (posts and reels)
  const igMatch = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return { platform: 'instagram', embedId: igMatch[1] };

  // Twitter / X
  const twMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (twMatch) return { platform: 'twitter', embedId: twMatch[1] };

  // TikTok
  const tkMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tkMatch) return { platform: 'tiktok', embedId: tkMatch[1] };

  return null;
}

/** Normalize legacy Firestore docs that only have youtubeUrl/youtubeVideoId */
function normalizeVideo(
  doc: FirebaseFirestore.DocumentSnapshot,
): VideoBreakdown {
  const data = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    ...data,
    platform: (data.platform as VideoPlatform) ?? 'youtube',
    url: (data.url as string) ?? (data.youtubeUrl as string) ?? '',
    embedId: (data.embedId as string) ?? (data.youtubeVideoId as string) ?? '',
  } as VideoBreakdown;
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

    const videos: VideoBreakdown[] = snap.docs.map(normalizeVideo);
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
    url: string;
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

  const { playerId, url, title } = body;

  if (!playerId || !url || !title) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const parsed = parseVideoUrl(url);

  if (!parsed) {
    return NextResponse.json(
      {
        error:
          'Unsupported URL. Supported platforms: YouTube, Instagram, Twitter/X, TikTok.',
      },
      { status: 400 },
    );
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
      platform: parsed.platform,
      url,
      embedId: parsed.embedId,
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
