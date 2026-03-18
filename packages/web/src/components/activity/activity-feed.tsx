'use client';

import { useState, useEffect } from 'react';
import type { ActivityEvent } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { ActivityEventCard } from '@/components/activity/activity-event-card';
import { useAuth } from '@/components/auth/auth-provider';

export function ActivityFeed() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    fetch('/api/feed?limit=10')
      .then((res) => (res.ok ? res.json() : { events: [], hasMore: false }))
      .then((data: { events: ActivityEvent[]; hasMore: boolean }) => {
        setEvents(data.events);
        setHasMore(data.hasMore);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setInitialLoaded(true);
      });
  }, [user]);

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);

    try {
      const last = events[events.length - 1];
      const cursor = (last?.createdAt as { seconds: number } | undefined)
        ?.seconds;
      const url = `/api/feed?limit=10${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      setEvents((prev) => [...prev, ...data.events]);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  if (!user || (!initialLoaded && loading)) return null;

  if (events.length === 0 && initialLoaded) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Follow scouts to see their activity here.
      </p>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {events.map((event) => (
          <ActivityEventCard key={event.id} event={event} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
