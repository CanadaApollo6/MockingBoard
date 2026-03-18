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
  size?: 'sm' | 'md';
}

export function WatchButton({
  playerId,
  year,
  initialIsWatching = false,
  showLabel = false,
  size = 'sm',
}: WatchButtonProps) {
  const { user } = useAuth();
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
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

  const iconSize = size === 'md' ? 'h-4.5 w-4.5' : 'h-3.5 w-3.5';
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';

  const disabled = !user || loading;

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(e as unknown as React.MouseEvent);
        }
      }}
      aria-disabled={disabled || undefined}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors',
        textSize,
        disabled ? 'cursor-default' : 'cursor-pointer hover:text-mb-accent',
        isWatching ? 'text-mb-accent' : 'text-muted-foreground',
      )}
      aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Eye className={cn(iconSize, isWatching && 'fill-current')} />
      {showLabel && <span>{isWatching ? 'Watching' : 'Watch'}</span>}
    </span>
  );
}
