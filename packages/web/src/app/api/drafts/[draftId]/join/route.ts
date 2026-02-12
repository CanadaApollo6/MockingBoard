import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import { joinLobby } from '@/lib/lobby-actions';
import { safeError, AppError } from '@/lib/validate';
import type { TeamAbbreviation } from '@mockingboard/shared';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  let body: { team?: TeamAbbreviation; inviteCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const user = await resolveUser(session.uid);
    const displayName = user?.displayName ?? user?.discordUsername ?? 'Player';

    const result = await joinLobby({
      draftId,
      userId: session.uid,
      displayName,
      discordId: user?.discordId,
      team: body.team,
      inviteCode: body.inviteCode,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = safeError(err, 'Failed to join draft');
    const status = err instanceof AppError ? err.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
