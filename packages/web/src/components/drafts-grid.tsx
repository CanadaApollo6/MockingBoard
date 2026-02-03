'use client';

import { useState } from 'react';
import type { Draft } from '@mockingboard/shared';
import { DraftCard } from '@/components/draft-card';
import { Button } from '@/components/ui/button';
import { loadMoreDrafts } from '@/app/drafts/actions';

interface DraftsGridProps {
  initialDrafts: Draft[];
  initialHasMore: boolean;
  tab: 'all' | 'mine';
}

export function DraftsGrid({
  initialDrafts,
  initialHasMore,
  tab,
}: DraftsGridProps) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function handleLoadMore() {
    const lastDraft = drafts[drafts.length - 1];
    if (!lastDraft) return;

    setLoading(true);
    try {
      const afterSeconds = lastDraft.createdAt?.seconds ?? 0;
      const result = await loadMoreDrafts({ tab, afterSeconds });
      setDrafts((prev) => [...prev, ...result.drafts]);
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }

  if (drafts.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {tab === 'mine'
          ? "You haven't participated in any drafts yet."
          : 'No drafts found.'}
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </>
  );
}
