import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getOrigin } from '@/lib/url';

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getOrigin(request);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Validate CSRF state
  const cookies = request.headers.get('cookie') ?? '';
  const stateCookie = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('discord_oauth_state='));
  const savedState = stateCookie?.split('=')[1];

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/?error=auth_failed', origin));
  }

  try {
    // Exchange code for Discord access token
    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/auth/discord/callback`,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Discord token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/?error=auth_failed', origin));
    }

    const { access_token } = await tokenRes.json();

    // Fetch Discord user profile
    const userRes = await fetch(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error('Discord user fetch failed:', await userRes.text());
      return NextResponse.redirect(new URL('/?error=auth_failed', origin));
    }

    const discordUser: DiscordUser = await userRes.json();

    // Lookup or create Firestore user by discordId
    await ensureFirestoreUser(discordUser);

    // Create Firebase custom token using Discord ID as the UID
    // This aligns with Firestore rules that check participants.values() (Discord IDs)
    const customToken = await adminAuth.createCustomToken(discordUser.id);

    // Redirect to client callback page with the token
    const callbackUrl = new URL('/auth/callback', origin);
    callbackUrl.searchParams.set('token', customToken);

    const response = NextResponse.redirect(callbackUrl);
    // Clear the state cookie
    response.cookies.delete('discord_oauth_state');
    return response;
  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', origin));
  }
}

async function ensureFirestoreUser(discordUser: DiscordUser) {
  const usersRef = adminDb.collection('users');
  const snapshot = await usersRef
    .where('discordId', '==', discordUser.id)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    // Update username/avatar and link firebaseUid if not set
    const doc = snapshot.docs[0];
    const data = doc.data();
    const updates: Record<string, unknown> = {
      discordUsername: discordUser.username,
    };
    if (discordUser.avatar) updates.discordAvatar = discordUser.avatar;
    if (!data.firebaseUid) updates.firebaseUid = discordUser.id;

    await doc.ref.update(updates);
    return;
  }

  // Create new user
  const now = new Date();
  await usersRef.add({
    discordId: discordUser.id,
    discordUsername: discordUser.username,
    ...(discordUser.avatar && { discordAvatar: discordUser.avatar }),
    firebaseUid: discordUser.id,
    createdAt: now,
    updatedAt: now,
  });
}
