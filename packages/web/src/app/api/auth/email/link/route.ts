import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/firebase-admin';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { safeError } from '@/lib/validate';

export async function POST(request: Request) {
  if (!rateLimit(`email-link:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { email: string; password: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 },
    );
  }

  try {
    // Add email/password provider to the existing Firebase Auth user
    await adminAuth.updateUser(session.uid, { email, password });

    // Update Firestore user doc with email
    await adminDb.collection('users').doc(session.uid).update({
      email,
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Email link failed:', err);

    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: safeError(err, 'Failed to link email') },
      { status: 400 },
    );
  }
}
