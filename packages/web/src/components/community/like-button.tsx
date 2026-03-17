'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  apiPath: string;
  initialLikeCount: number;
  initialIsLiked?: boolean;
}

export function LikeButton({
  apiPath,
  initialLikeCount,
  initialIsLiked = false,
}: LikeButtonProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!user || loading) return;

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLoading(true);

    try {
      const res = await fetch(apiPath, {
        method: wasLiked ? 'DELETE' : 'POST',
      });
      if (!res.ok) {
        // Revert on failure
        setIsLiked(wasLiked);
        setLikeCount((c) => c + (wasLiked ? 1 : -1));
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
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
        isLiked ? 'text-mb-accent' : 'text-muted-foreground',
      )}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <Heart className={cn('h-3.5 w-3.5', isLiked && 'fill-current')} />
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}
