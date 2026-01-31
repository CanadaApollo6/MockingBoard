'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

export function SignInButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Button variant="ghost" size="sm" onClick={signOut}>
        Sign Out
      </Button>
    );
  }

  return (
    <a href="/api/auth/discord">
      <Button variant="outline" size="sm">
        Sign in with Discord
      </Button>
    </a>
  );
}
