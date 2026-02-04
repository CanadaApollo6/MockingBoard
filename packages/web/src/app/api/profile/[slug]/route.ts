import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sanitize } from '@/lib/sanitize';

const SENSITIVE_FIELDS = [
  'email',
  'discordWebhookUrl',
  'firebaseUid',
  'preferences',
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const snap = await adminDb
      .collection('users')
      .where('slug', '==', slug)
      .where('isPublic', '==', true)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() };

    for (const field of SENSITIVE_FIELDS) {
      delete (data as Record<string, unknown>)[field];
    }

    return NextResponse.json({ profile: sanitize(data) });
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
