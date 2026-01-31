'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get('token');
    if (!token) {
      router.replace('/?error=no_token');
      return;
    }

    async function authenticate() {
      try {
        const credential = await signInWithCustomToken(getClientAuth(), token!);
        const idToken = await credential.user.getIdToken();

        const sessionRes = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (!sessionRes.ok) {
          router.replace('/?error=session_create');
          return;
        }

        router.replace('/drafts');
      } catch (error) {
        console.error('Auth callback failed:', error);
        router.replace('/?error=client_auth');
      }
    }

    authenticate();
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in...</p>
    </main>
  );
}
