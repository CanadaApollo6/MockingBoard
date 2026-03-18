'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { cn } from '@/lib/utils';

interface WatchButtonProps {
  playerId: string;
  year: number;
  initialIsWatching?: boolean;
  showLabel?: boolean;
}

export function WatchButton({
  playerId,
  year,
  initialIsWatching = false,
  showLabel = false,
}: WatchButtonProps) {
  const { user } = useAuth();
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!user || loading) return;

    const was = isWatching;
    setIsWatching(!was);
    setLoading(true);

    try {
      const res = was
        ? await fetch(`/api/watchlist?playerId=${playerId}`, {
            method: 'DELETE',
          })
        : await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, year }),
          });

      if (!res.ok) setIsWatching(was);
    } catch {
      setIsWatching(was);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!user || loading}
      className={cn(
        'inline-flex items-center gap-1 text-xs transition-colors',
        user ? 'cursor-pointer hover:text-mb-accent' : 'cursor-default',
        isWatching ? 'text-mb-accent' : 'text-muted-foreground',
      )}
      aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Eye className={cn('h-3.5 w-3.5', isWatching && 'fill-current')} />
      {showLabel && <span>{isWatching ? 'Watching' : 'Watch'}</span>}
    </button>
  );
}
