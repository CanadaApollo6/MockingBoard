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
  DraftVisibility,
  TeamAssignmentMode,
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
    selectedTeams?: TeamAbbreviation[];
    cpuSpeed: CpuSpeed;
    cpuRandomness?: number;
    cpuNeedsWeight?: number;
    secondsPerPick?: number;
    tradesEnabled: boolean;
    notificationLevel?: NotificationLevel;
    multiplayer?: boolean;
    visibility?: DraftVisibility;
    teamAssignmentMode?: TeamAssignmentMode;
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
    selectedTeams,
    cpuSpeed,
    cpuRandomness,
    cpuNeedsWeight,
    secondsPerPick,
    tradesEnabled,
    notificationLevel,
    multiplayer,
    visibility,
    teamAssignmentMode,
  } = body;

  if (!year || !rounds || !format || !cpuSpeed) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  // Multiplayer requires a selected team (creator's team)
  if (multiplayer && !selectedTeam) {
    return NextResponse.json(
      { error: 'Team selection required for multiplayer drafts' },
      { status: 400 },
    );
  }

  if (!multiplayer && format === 'single-team' && !selectedTeam) {
    return NextResponse.json(
      { error: 'Team selection required for single-team format' },
      { status: 400 },
    );
  }

  if (
    !multiplayer &&
    format === 'multi-team' &&
    (!selectedTeams || selectedTeams.length < 2)
  ) {
    return NextResponse.json(
      { error: 'At least 2 teams required for multi-team format' },
      { status: 400 },
    );
  }

  try {
    const [pickOrder, futurePicks] = await Promise.all([
      buildPickOrder(rounds, year),
      tradesEnabled ? buildFuturePicks(year, rounds) : Promise.resolve([]),
    ]);

    const teamAssignments = {} as Record<TeamAbbreviation, string | null>;
    const multiTeamSet =
      format === 'multi-team' && selectedTeams ? new Set(selectedTeams) : null;
    for (const team of teams) {
      if (multiplayer) {
        teamAssignments[team.id] =
          team.id === selectedTeam ? session.uid : null;
      } else if (format === 'full') {
        teamAssignments[team.id] = session.uid;
      } else if (multiTeamSet) {
        teamAssignments[team.id] = multiTeamSet.has(team.id)
          ? session.uid
          : null;
      } else {
        teamAssignments[team.id] =
          team.id === selectedTeam ? session.uid : null;
      }
    }

    const user = await resolveUser(session.uid);
    const discordId = user?.discordId ?? session.uid;
    const displayName =
      user?.displayName ?? user?.discordUsername ?? 'Player 1';

    const draft = await createWebDraft({
      userId: session.uid,
      discordId,
      displayName,
      config: {
        rounds,
        format,
        year,
        cpuSpeed,
        secondsPerPick: secondsPerPick ?? 0,
        tradesEnabled,
        teamAssignmentMode: multiplayer
          ? (teamAssignmentMode ?? 'choice')
          : 'choice',
        ...(cpuRandomness != null && { cpuRandomness }),
        ...(cpuNeedsWeight != null && { cpuNeedsWeight }),
      },
      teamAssignments,
      pickOrder,
      futurePicks,
      notificationLevel,
      multiplayer,
      visibility,
    });

    // Fire-and-forget: send webhook notification if enabled
    if (notificationLevel && notificationLevel !== 'off') {
      const webhookUrl = user?.discordWebhookUrl as string | undefined;
      if (webhookUrl) {
        const origin =
          request.headers.get('origin') ?? process.env.APP_URL ?? '';
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
