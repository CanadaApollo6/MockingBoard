import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { safeError } from '@/lib/validate';

export async function POST(request: Request) {
  if (!rateLimit(`signup:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { email: string; password: string; displayName: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { email, password, displayName } = body;

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: 'Email, password, and display name are required' },
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
    // Create Firestore user doc first to get the doc ID
    const now = new Date();
    const docRef = await adminDb.collection('users').add({
      displayName,
      email,
      createdAt: now,
      updatedAt: now,
    });

    // Create Firebase Auth user with the Firestore doc ID as UID
    // This ensures session.uid === Firestore doc ID for all auth methods
    await adminAuth.createUser({
      uid: docRef.id,
      email,
      password,
      displayName,
    });

    // Store the firebaseUid reference
    await docRef.update({ firebaseUid: docRef.id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email signup failed:', err);

    // Firebase Auth errors have a `code` property
    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: safeError(err, 'Signup failed') },
      { status: 400 },
    );
  }
}
