import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import {
  buildPickOrder,
  buildFuturePicks,
  createWebDraft,
} from '@/lib/draft-actions';
import { resolveUser } from '@/lib/user-resolve';
import { adminDb } from '@/lib/firebase-admin';
import { sendDraftStarted } from '@/lib/discord-webhook';
import { teams } from '@mockingboard/shared';
import type {
  TeamAbbreviation,
  DraftFormat,
  CpuSpeed,
  NotificationLevel,
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
    secondsPerPick?: number;
    tradesEnabled: boolean;
    notificationLevel?: NotificationLevel;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const {
    year,
    rounds,
    format,
    selectedTeam,
    cpuSpeed,
    secondsPerPick,
    tradesEnabled,
    notificationLevel,
  } = body;

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

    const user = await resolveUser(session.uid);
    const discordId = user?.discordId ?? session.uid;

    const draft = await createWebDraft({
      userId: session.uid,
      discordId,
      config: {
        rounds,
        format,
        year,
        cpuSpeed,
        secondsPerPick: secondsPerPick ?? 0,
        tradesEnabled,
      },
      teamAssignments,
      pickOrder,
      futurePicks,
      participantIds: [...new Set([session.uid, discordId])],
      notificationLevel,
    });

    // Fire-and-forget: send webhook notification if enabled
    if (notificationLevel && notificationLevel !== 'off') {
      const webhookUrl = user?.discordWebhookUrl as string | undefined;
      if (webhookUrl) {
        const origin = request.headers.get('origin') ?? process.env.APP_URL ?? '';
        const draftUrl = `${origin}/drafts/${draft.id}/live`;

        sendDraftStarted(webhookUrl, draft, draftUrl, notificationLevel)
          .then(async (threadId) => {
            if (threadId) {
              await adminDb
                .collection('drafts')
                .doc(draft.id)
                .update({ webhookThreadId: threadId });
            }
          })
          .catch((err) => console.error('Webhook notification failed:', err));
      }
    }

    return NextResponse.json({ draftId: draft.id });
  } catch (err) {
    console.error('Failed to create draft:', err);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 },
    );
  }
}
