import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getOrigin } from '@/lib/url';
import { getSessionUser } from '@/lib/auth-session';

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

function parseState(raw: string): { nonce: string; intent: 'signin' | 'link' } {
  try {
    const parsed = JSON.parse(atob(raw));
    if (parsed.intent === 'link')
      return { nonce: parsed.nonce, intent: 'link' };
    return { nonce: parsed.nonce, intent: 'signin' };
  } catch {
    // Legacy plain UUID state — treat as signin
    return { nonce: raw, intent: 'signin' };
  }
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
    const reason = !code ? 'no_code' : !state ? 'no_state' : 'state_mismatch';
    return NextResponse.redirect(new URL(`/?error=csrf_${reason}`, origin));
  }

  const { intent } = parseState(state);

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
      return NextResponse.redirect(new URL('/?error=token_exchange', origin));
    }

    const { access_token } = await tokenRes.json();

    // Fetch Discord user profile
    const userRes = await fetch(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error('Discord user fetch failed:', await userRes.text());
      return NextResponse.redirect(new URL('/?error=discord_profile', origin));
    }

    const discordUser: DiscordUser = await userRes.json();

    // --- Link intent: attach Discord to current session user ---
    if (intent === 'link') {
      const session = await getSessionUser();
      if (!session) {
        return NextResponse.redirect(
          new URL('/settings?error=not_authenticated', origin),
        );
      }

      // Check if Discord ID is already linked to another user
      const existing = await adminDb
        .collection('users')
        .where('discordId', '==', discordUser.id)
        .limit(1)
        .get();

      if (!existing.empty && existing.docs[0].id !== session.uid) {
        const response = NextResponse.redirect(
          new URL('/settings?error=discord_already_linked', origin),
        );
        response.cookies.delete('discord_oauth_state');
        return response;
      }

      // Link Discord to current user
      try {
        await adminDb
          .collection('users')
          .doc(session.uid)
          .update({
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            ...(discordUser.avatar && { discordAvatar: discordUser.avatar }),
            updatedAt: new Date(),
          });
      } catch (err) {
        console.error('Discord link DB update failed:', err);
        const response = NextResponse.redirect(
          new URL('/settings?error=discord_link_failed', origin),
        );
        response.cookies.delete('discord_oauth_state');
        return response;
      }

      const response = NextResponse.redirect(
        new URL('/settings?linked=discord', origin),
      );
      response.cookies.delete('discord_oauth_state');
      return response;
    }

    // --- Signin intent: lookup or create user ---
    const userDocId = await ensureFirestoreUser(discordUser);

    // Create Firebase custom token using Firestore doc ID as the UID
    const customToken = await adminAuth.createCustomToken(userDocId);

    // Redirect to client callback page with the token
    const callbackUrl = new URL('/auth/callback', origin);
    callbackUrl.searchParams.set('token', customToken);

    const response = NextResponse.redirect(callbackUrl);
    response.cookies.delete('discord_oauth_state');
    return response;
  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_exception', origin));
  }
}

async function ensureFirestoreUser(discordUser: DiscordUser): Promise<string> {
  const usersRef = adminDb.collection('users');
  const snapshot = await usersRef
    .where('discordId', '==', discordUser.id)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const updates: Record<string, unknown> = {
      discordUsername: discordUser.username,
      displayName: discordUser.username,
      updatedAt: new Date(),
    };
    if (discordUser.avatar) updates.discordAvatar = discordUser.avatar;
    // Migrate firebaseUid to doc ID if it was set to the Discord ID
    if (doc.data().firebaseUid !== doc.id) {
      updates.firebaseUid = doc.id;
    }
    await doc.ref.update(updates);
    return doc.id;
  }

  // Create new user
  const now = new Date();
  const docRef = await usersRef.add({
    discordId: discordUser.id,
    discordUsername: discordUser.username,
    displayName: discordUser.username,
    ...(discordUser.avatar && { discordAvatar: discordUser.avatar }),
    firebaseUid: '',
    createdAt: now,
    updatedAt: now,
  });
  // Set firebaseUid to the doc ID
  await docRef.update({ firebaseUid: docRef.id });
  return docRef.id;
}
