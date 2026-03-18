import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { isAdmin } from '@/lib/firebase/admin';

type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;
type NonNullSession = NonNullable<SessionUser>;

/**
 * Require an authenticated session. Returns the session user
 * or a 401 NextResponse if not authenticated.
 */
export async function requireSession(): Promise<NonNullSession | NextResponse> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

/**
 * Require an admin session. Returns the session user
 * or a 401/403 NextResponse if not authenticated/authorized.
 */
export async function requireAdmin(): Promise<NonNullSession | NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!(await isAdmin(session.uid))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}

/** Type guard to check if the result is a NextResponse (error). */
export function isErrorResponse(
  result: NonNullSession | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
