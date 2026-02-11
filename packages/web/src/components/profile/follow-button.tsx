'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface FollowButtonProps {
  followeeId: string;
}

export function FollowButton({ followeeId }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/follows/${followeeId}`)
      .then((res) => (res.ok ? res.json() : { isFollowing: false }))
      .then((data) => setIsFollowing(data.isFollowing))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [followeeId]);

  async function toggle() {
    setLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/follows/${followeeId}`, { method: 'DELETE' });
        setIsFollowing(false);
      } else {
        await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followeeId }),
        });
        setIsFollowing(true);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
