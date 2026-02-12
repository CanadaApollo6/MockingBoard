import { NextResponse } from 'next/server';
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_MS,
} from '@/lib/firebase/auth-session';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation failed:', error);
    return NextResponse.json(
      { error: 'Session creation failed' },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
