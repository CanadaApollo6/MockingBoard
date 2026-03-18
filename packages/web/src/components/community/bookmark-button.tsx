'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  targetId: string;
  targetType: 'board' | 'report';
  initialIsBookmarked?: boolean;
}

export function BookmarkButton({
  targetId,
  targetType,
  initialIsBookmarked = false,
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!user || loading) return;

    const was = isBookmarked;
    setIsBookmarked(!was);
    setLoading(true);

    try {
      const params = new URLSearchParams({ targetId, targetType });
      const res = was
        ? await fetch(`/api/bookmarks?${params}`, { method: 'DELETE' })
        : await fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, targetType }),
          });

      if (!res.ok) setIsBookmarked(was);
    } catch {
      setIsBookmarked(was);
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
        'inline-flex items-center text-xs transition-colors',
        user ? 'cursor-pointer hover:text-mb-accent' : 'cursor-default',
        isBookmarked ? 'text-mb-accent' : 'text-muted-foreground',
      )}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
    >
      <Bookmark className={cn('h-3.5 w-3.5', isBookmarked && 'fill-current')} />
    </button>
  );
}
