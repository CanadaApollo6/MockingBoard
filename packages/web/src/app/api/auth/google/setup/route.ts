import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  let body: { idToken: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { idToken } = body;
  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Idempotent: if the user doc already exists, we're done
    const docRef = adminDb.collection('users').doc(uid);
    const doc = await docRef.get();
    if (doc.exists) {
      return NextResponse.json({ ok: true });
    }

    // Get the full Auth user record for display name and email
    const authUser = await adminAuth.getUser(uid);
    const now = new Date();

    await docRef.set({
      displayName: authUser.displayName ?? authUser.email ?? 'User',
      email: authUser.email ?? null,
      firebaseUid: uid,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Google setup failed:', err);
    return NextResponse.json({ error: 'Setup failed' }, { status: 401 });
  }
}
