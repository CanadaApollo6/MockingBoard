import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { createWebTrade } from '@/lib/draft-actions';
import { getDraftOrFail } from '@/lib/data';
import { AppError, safeError } from '@/lib/validate';
import type { TeamAbbreviation, TradePiece } from '@mockingboard/shared';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draftId } = await params;

  let body: {
    proposerTeam: TeamAbbreviation;
    recipientTeam: TeamAbbreviation;
    proposerGives: TradePiece[];
    proposerReceives: TradePiece[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const draft = await getDraftOrFail(draftId);

    const { proposerTeam } = body;
    if (!proposerTeam || draft.teamAssignments[proposerTeam] !== session.uid) {
      return NextResponse.json(
        { error: 'You do not control that team' },
        { status: 403 },
      );
    }

    // Derive recipientId: null for CPU teams, userId for human teams
    const recipientId = draft.teamAssignments[body.recipientTeam] ?? null;

    const { trade, evaluation } = await createWebTrade({
      draftId,
      proposerId: session.uid,
      proposerTeam,
      recipientId,
      recipientTeam: body.recipientTeam,
      proposerGives: body.proposerGives,
      proposerReceives: body.proposerReceives,
    });

    return NextResponse.json({ trade, evaluation });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to create trade:', err);
    return NextResponse.json(
      {
        error: safeError(err, 'Failed to create trade'),
      },
      { status: 500 },
    );
  }
}
