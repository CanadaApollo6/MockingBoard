import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import {
  buildPickOrder,
  buildFuturePicks,
  createWebDraft,
} from '@/lib/draft-actions';
import { teams } from '@mockingboard/shared';
import type {
  TeamAbbreviation,
  DraftFormat,
  CpuSpeed,
} from '@mockingboard/shared';

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    year: number;
    rounds: number;
    format: DraftFormat;
    selectedTeam: TeamAbbreviation | null;
    cpuSpeed: CpuSpeed;
    tradesEnabled: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { year, rounds, format, selectedTeam, cpuSpeed, tradesEnabled } = body;

  if (!year || !rounds || !format || !cpuSpeed) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  if (format === 'single-team' && !selectedTeam) {
    return NextResponse.json(
      { error: 'Team selection required for single-team format' },
      { status: 400 },
    );
  }

  try {
    const [pickOrder, futurePicks] = await Promise.all([
      buildPickOrder(rounds, year),
      tradesEnabled ? buildFuturePicks(year) : Promise.resolve([]),
    ]);

    const teamAssignments = {} as Record<TeamAbbreviation, string | null>;
    for (const team of teams) {
      if (format === 'full') {
        teamAssignments[team.id] = session.uid;
      } else {
        teamAssignments[team.id] =
          team.id === selectedTeam ? session.uid : null;
      }
    }

    const draft = await createWebDraft({
      userId: session.uid,
      discordId: session.uid,
      config: { rounds, format, year, cpuSpeed, tradesEnabled },
      teamAssignments,
      pickOrder,
      futurePicks,
    });

    return NextResponse.json({ draftId: draft.id });
  } catch (err) {
    console.error('Failed to create draft:', err);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 },
    );
  }
}
