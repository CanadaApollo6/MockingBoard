import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { recordPick, runCpuCascade } from '@/lib/draft-actions';
import { getCachedPlayerMap } from '@/lib/cache';
import { getDraftOrFail } from '@/lib/data';
import { adminDb } from '@/lib/firebase-admin';
import {
  resolveWebhookConfig,
  sendPickAnnouncement,
  sendDraftComplete,
} from '@/lib/discord-webhook';
import { getPickController } from '@mockingboard/shared';
import { hydrateDoc } from '@/lib/sanitize';
import type { Draft, Pick } from '@mockingboard/shared';
import { notifyYourTurn } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { AppError, safeError } from '@/lib/validate';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rateLimit(`pick:${session.uid}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { draftId } = await params;

  let body: { playerId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { playerId } = body;
  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
  }

  try {
    // Authorization: verify user controls current pick
    const draft = await getDraftOrFail(draftId);

    if (draft.status !== 'active') {
      return NextResponse.json(
        { error: 'Draft is not active' },
        { status: 400 },
      );
    }

    const currentSlot = draft.pickOrder[draft.currentPick - 1];
    if (!currentSlot) {
      return NextResponse.json({ error: 'No more picks' }, { status: 400 });
    }

    const controller = getPickController(draft, currentSlot);
    if (controller !== session.uid) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Record the user's pick
    const { pick, isComplete: pickComplete } = await recordPick(
      draftId,
      playerId,
      session.uid,
    );

    // Track all picks + final completion for webhook
    let allNewPicks: Pick[] = [pick];
    let draftCompleted = pickComplete;

    // Run CPU cascade only for instant speed (non-instant speeds are paced by the client)
    if (
      !pickComplete &&
      !draft.config.tradesEnabled &&
      (draft.config.cpuSpeed ?? 'normal') === 'instant'
    ) {
      const cascade = await runCpuCascade(draftId);
      allNewPicks = [pick, ...cascade.picks];
      draftCompleted = cascade.isComplete;
    }

    // Fire-and-forget: notify next human picker
    if (!draftCompleted) {
      adminDb
        .collection('drafts')
        .doc(draftId)
        .get()
        .then((snap) => {
          const d = hydrateDoc<Draft>(snap);
          const nextSlot = d.pickOrder[d.currentPick - 1];
          if (!nextSlot) return;
          const next = getPickController(d, nextSlot);
          if (next && next !== session.uid) {
            return notifyYourTurn(next, draftId, draft.name ?? 'Draft');
          }
        })
        .catch((err) => console.error('Your-turn notification failed:', err));
    }

    // Fire-and-forget: webhook notifications
    const webhookConfig = await resolveWebhookConfig(draft);
    if (webhookConfig?.notificationLevel === 'full' && webhookConfig.threadId) {
      const origin = request.headers.get('origin') ?? process.env.APP_URL ?? '';
      const draftUrl = `${origin}/drafts/${draftId}/live`;

      getCachedPlayerMap(draft.config.year)
        .then(async (playerMap) => {
          // Send user pick
          await sendPickAnnouncement(
            webhookConfig.webhookUrl,
            webhookConfig.threadId!,
            [pick],
            playerMap,
          );

          // Send batched CPU picks (if any)
          const cpuPicks = allNewPicks.filter((p) => p.userId === null);
          if (cpuPicks.length > 0) {
            await sendPickAnnouncement(
              webhookConfig.webhookUrl,
              webhookConfig.threadId!,
              cpuPicks,
              playerMap,
            );
          }

          // Send completion message
          if (draftCompleted) {
            await sendDraftComplete(
              webhookConfig.webhookUrl,
              webhookConfig.threadId,
              draft,
              draftUrl,
            );
          }
        })
        .catch((err) => console.error('Webhook notification failed:', err));
    }

    return NextResponse.json({
      pick,
      isComplete: draftCompleted,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Failed to record pick:', err);
    return NextResponse.json(
      { error: safeError(err, 'Failed to record pick') },
      { status: 500 },
    );
  }
}
