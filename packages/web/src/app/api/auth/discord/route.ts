import { NextResponse } from 'next/server';
import { getOrigin } from '@/lib/url';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';

export async function GET(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Discord OAuth not configured' },
      { status: 500 },
    );
  }

  const origin = getOrigin(request);
  const redirectUri = `${origin}/api/auth/discord/callback`;

  const url = new URL(request.url);
  const isLink = url.searchParams.get('link') === 'true';

  // Encode intent + CSRF nonce in state
  const state = btoa(
    JSON.stringify({
      nonce: crypto.randomUUID(),
      intent: isLink ? 'link' : 'signin',
    }),
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
  });

  const response = NextResponse.redirect(
    `${DISCORD_AUTH_URL}?${params.toString()}`,
  );

  // Store state in cookie for validation in callback
  response.cookies.set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  });

  return response;
}
