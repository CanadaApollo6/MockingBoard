import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth-session';
import { adminDb } from '@/lib/firebase-admin';
import { teams } from '@mockingboard/shared';

const VALID_TEAMS: Set<string> = new Set(teams.map((t) => t.id));

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ALLOWED_LINK_KEYS = new Set([
    'youtube',
    'twitter',
    'bluesky',
    'website',
  ]);

  let body: {
    slug?: string;
    bio?: string;
    avatar?: string;
    links?: Record<string, string>;
    isPublic?: boolean;
    followedTeam?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  // Strip unknown link keys
  if (body.links && typeof body.links === 'object') {
    body.links = Object.fromEntries(
      Object.entries(body.links).filter(([k]) => ALLOWED_LINK_KEYS.has(k)),
    );
  }

  try {
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Determine the slug to validate
    let slugToSet: string | undefined = undefined;

    if (body.slug !== undefined) {
      slugToSet = toSlug(body.slug);
    } else if (body.isPublic === true) {
      // Auto-generate slug from displayName if going public without one
      const userDoc = await adminDb.collection('users').doc(session.uid).get();
      const existing = userDoc.data();
      if (!existing?.slug) {
        const displayName =
          existing?.displayName ?? existing?.name ?? session.uid;
        slugToSet = toSlug(displayName);
      }
    }

    if (slugToSet !== undefined) {
      if (!slugToSet || !SLUG_RE.test(slugToSet)) {
        return NextResponse.json(
          { error: 'Invalid slug format' },
          { status: 400 },
        );
      }

      // Validate slug uniqueness
      const existing = await adminDb
        .collection('users')
        .where('slug', '==', slugToSet)
        .limit(1)
        .get();

      const taken = existing.docs.some((doc) => doc.id !== session.uid);
      if (taken) {
        return NextResponse.json(
          { error: 'Slug is already in use' },
          { status: 409 },
        );
      }

      updates.slug = slugToSet;
    }

    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.avatar !== undefined) updates.avatar = body.avatar;
    if (body.links !== undefined) updates.links = body.links;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;

    if (body.followedTeam !== undefined) {
      if (body.followedTeam === null) {
        updates.followedTeam = FieldValue.delete();
      } else if (VALID_TEAMS.has(body.followedTeam)) {
        updates.followedTeam = body.followedTeam;
      } else {
        return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
      }
    }

    await adminDb.collection('users').doc(session.uid).update(updates);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update profile:', err);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    );
  }
}
