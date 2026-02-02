'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

export function SignInButton() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {profile?.displayName ?? 'User'}
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Link href="/auth">
      <Button variant="outline" size="sm">
        Sign In
      </Button>
    </Link>
  );
}
