import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import type { NotificationType } from '@mockingboard/shared';

const MB_BLUE = 0x3b82f6;

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  actorId?: string;
  actorName?: string;
}

/**
 * Create an in-app notification and optionally cross-notify to Discord.
 * Runs server-side only (uses admin SDK).
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const { userId, type, title, body, link, actorId, actorName } = params;

  // Write notification to Firestore
  await adminDb.collection('notifications').add({
    userId,
    type,
    title,
    body,
    link: link ?? null,
    read: false,
    actorId: actorId ?? null,
    actorName: actorName ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Check if user has Discord webhook for cross-notification
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData?.discordWebhookUrl) return;
    if (userData.notificationPreferences?.discord === false) return;

    const embed: Record<string, unknown> = {
      title,
      description: body,
      color: MB_BLUE,
    };
    if (link) {
      embed.description = `${body}\n[View on MockingBoard](${link})`;
    }

    await fetch(`${userData.discordWebhookUrl}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    }).catch(() => {
      // Swallow webhook errors — notification was already saved
    });
  } catch {
    // Don't let Discord errors block the notification
  }
}

// ---- Convenience Functions ----

export async function notifyNewFollower(
  followeeId: string,
  followerName: string,
  followerSlug?: string,
): Promise<void> {
  await createNotification({
    userId: followeeId,
    type: 'new-follower',
    title: 'New Follower',
    body: `${followerName} started following you.`,
    link: followerSlug ? `/profile/${followerSlug}` : undefined,
    actorName: followerName,
  });
}

export async function notifyYourTurn(
  userId: string,
  draftId: string,
  draftName: string,
): Promise<void> {
  await createNotification({
    userId,
    type: 'your-turn',
    title: "You're On the Clock",
    body: `It's your turn to pick in ${draftName}.`,
    link: `/drafts/${draftId}/live`,
  });
}

export async function notifyTradeAccepted(
  userId: string,
  draftId: string,
  draftName: string,
  tradePartnerName: string,
): Promise<void> {
  await createNotification({
    userId,
    type: 'trade-accepted',
    title: 'Trade Accepted',
    body: `Your trade with ${tradePartnerName} in ${draftName} was accepted.`,
    link: `/drafts/${draftId}/live`,
  });
}

export async function notifyNewBoard(
  followerId: string,
  authorName: string,
  boardName: string,
  boardSlug: string,
): Promise<void> {
  await createNotification({
    userId: followerId,
    type: 'new-board',
    title: 'New Board Published',
    body: `${authorName} published "${boardName}".`,
    link: `/boards/${boardSlug}`,
    actorName: authorName,
  });
}
