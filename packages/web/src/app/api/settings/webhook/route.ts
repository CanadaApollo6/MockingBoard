import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-session';
import { DISCORD_WEBHOOK_RE } from '@/lib/discord-webhook';

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { url: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { url } = body;

  // Allow null to clear the webhook
  if (url !== null && !DISCORD_WEBHOOK_RE.test(url)) {
    return NextResponse.json(
      { error: 'Invalid Discord webhook URL' },
      { status: 400 },
    );
  }

  try {
    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (url === null) {
      // Use FieldValue.delete() for Firestore field removal
      const { FieldValue } = await import('firebase-admin/firestore');
      update.discordWebhookUrl = FieldValue.delete();
    } else {
      update.discordWebhookUrl = url;
    }

    await adminDb.collection('users').doc(session.uid).update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to save webhook:', err);
    return NextResponse.json(
      { error: 'Failed to save webhook' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { url } = body;

  if (!DISCORD_WEBHOOK_RE.test(url)) {
    return NextResponse.json(
      { error: 'Invalid Discord webhook URL' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${url}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: 'MockingBoard Connected',
            description:
              'This webhook is working. Draft notifications will appear here when enabled.',
            color: 0x3b82f6,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Webhook test failed:', text);
      return NextResponse.json(
        { error: 'Discord rejected the webhook request' },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook test error:', err);
    return NextResponse.json(
      { error: 'Failed to reach Discord' },
      { status: 502 },
    );
  }
}
