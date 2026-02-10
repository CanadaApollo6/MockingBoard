import 'server-only';

import { adminDb } from './firebase-admin';
import type {
  Draft,
  Pick,
  Player,
  NotificationLevel,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { getTeamName } from './teams';
import { getTeamColor } from './team-colors';

const MB_BLUE = 0x3b82f6;

/** Only allow Discord webhook URLs — prevents SSRF via stored webhook values. */
export const DISCORD_WEBHOOK_RE =
  /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

interface WebhookConfig {
  webhookUrl: string;
  notificationLevel: NotificationLevel;
  threadId?: string;
}

/** Resolve webhook config for a draft by loading the creator's user doc. */
export async function resolveWebhookConfig(
  draft: Draft,
): Promise<WebhookConfig | null> {
  if (!draft.notificationLevel || draft.notificationLevel === 'off') {
    return null;
  }

  const userDoc = await adminDb.collection('users').doc(draft.createdBy).get();
  if (!userDoc.exists) return null;

  const webhookUrl = userDoc.data()?.discordWebhookUrl;
  if (!webhookUrl) return null;

  return {
    webhookUrl,
    notificationLevel: draft.notificationLevel,
    threadId: draft.webhookThreadId,
  };
}

/** Convert a hex color string like "#3b82f6" to a Discord embed color int. */
function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Send a "draft started" notification.
 * For "link-only": sends a single embed with a link to the draft.
 * For "full": creates a thread via the `thread_name` parameter and returns the thread ID.
 */
export async function sendDraftStarted(
  webhookUrl: string,
  draft: Draft,
  draftUrl: string,
  level: NotificationLevel,
): Promise<string | undefined> {
  if (level === 'off') return undefined;

  const teamList = Object.entries(draft.teamAssignments)
    .filter(([, userId]) => userId !== null)
    .map(([team]) => getTeamName(team as TeamAbbreviation))
    .join(', ');

  const embed = {
    title: 'Mock Draft Started',
    description: `A ${draft.config.rounds}-round ${draft.config.format} draft has started.`,
    color: MB_BLUE,
    fields: [
      ...(teamList ? [{ name: 'Teams', value: teamList, inline: false }] : []),
      {
        name: 'View Draft',
        value: `[Open in MockingBoard](${draftUrl})`,
        inline: false,
      },
    ],
  };

  if (level === 'link-only') {
    await postWebhook(webhookUrl, { embeds: [embed] });
    return undefined;
  }

  // Full mode: create a thread
  const res = await postWebhook(
    webhookUrl,
    { embeds: [embed] },
    {
      threadName: `Mock Draft - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    },
  );

  // Discord returns the thread/channel ID in the response
  return res?.channel_id;
}

/**
 * Send pick announcements to an existing webhook thread.
 * Single user pick gets its own embed; multiple CPU picks are batched.
 */
export async function sendPickAnnouncement(
  webhookUrl: string,
  threadId: string,
  picks: Pick[],
  playerMap: Map<string, Player>,
): Promise<void> {
  if (picks.length === 0) return;

  if (picks.length === 1) {
    const pick = picks[0];
    const player = playerMap.get(pick.playerId);
    const teamColor = getTeamColor(pick.team as TeamAbbreviation).primary;

    await postWebhook(
      webhookUrl,
      {
        embeds: [
          {
            title: `Pick ${pick.overall}: ${getTeamName(pick.team as TeamAbbreviation)}`,
            description: `**${player?.name ?? pick.playerId}** — ${player?.position ?? '?'}, ${player?.school ?? '?'}`,
            color: hexToInt(teamColor),
            footer: pick.userId === null ? { text: 'CPU Pick' } : undefined,
          },
        ],
      },
      { threadId },
    );
    return;
  }

  // Batch CPU picks
  const lines = picks.map((p) => {
    const player = playerMap.get(p.playerId);
    return `**${p.overall}.** ${getTeamName(p.team as TeamAbbreviation)} — ${player?.name ?? p.playerId} (${player?.position ?? '?'})`;
  });

  await postWebhook(
    webhookUrl,
    {
      embeds: [
        {
          title: `CPU Picks ${picks[0].overall}–${picks[picks.length - 1].overall}`,
          description: lines.join('\n'),
          color: MB_BLUE,
        },
      ],
    },
    { threadId },
  );
}

/** Send a draft completion summary. */
export async function sendDraftComplete(
  webhookUrl: string,
  threadId: string | undefined,
  draft: Draft,
  draftUrl: string,
): Promise<void> {
  await postWebhook(
    webhookUrl,
    {
      embeds: [
        {
          title: 'Draft Complete',
          description: `The ${draft.config.rounds}-round mock draft is finished.\n[View Results](${draftUrl})`,
          color: MB_BLUE,
        },
      ],
    },
    { threadId },
  );
}

// ---- Internal ----

interface WebhookPayload {
  embeds: unknown[];
  content?: string;
}

async function postWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  options?: { threadId?: string; threadName?: string },
): Promise<{ channel_id?: string } | null> {
  if (!DISCORD_WEBHOOK_RE.test(webhookUrl)) {
    console.error('Invalid webhook URL blocked:', webhookUrl);
    return null;
  }

  const params = new URLSearchParams({ wait: 'true' });
  if (options?.threadId) params.set('thread_id', options.threadId);

  const body: Record<string, unknown> = { ...payload };
  if (options?.threadName) {
    body.thread_name = options.threadName;
  }

  try {
    const res = await fetch(`${webhookUrl}?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error('Webhook POST failed:', res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Webhook POST error:', err);
    return null;
  }
}
