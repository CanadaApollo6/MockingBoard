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
      router.replace('/?error=auth_failed');
      return;
    }

    async function authenticate() {
      try {
        const credential = await signInWithCustomToken(getClientAuth(), token!);
        const idToken = await credential.user.getIdToken();

        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        router.replace('/drafts');
      } catch (error) {
        console.error('Auth callback failed:', error);
        router.replace('/?error=auth_failed');
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
