'use client';

import { useState } from 'react';
import type { BigBoard } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { BoardCard } from '@/components/board/board-card';

interface BoardBrowseProps {
  initialBoards: BigBoard[];
  initialHasMore: boolean;
}

export function BoardBrowse({
  initialBoards,
  initialHasMore,
}: BoardBrowseProps) {
  const [boards, setBoards] = useState(initialBoards);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);

    try {
      const last = boards[boards.length - 1];
      const cursor = last?.updatedAt?.seconds;
      const url = `/api/boards/public?limit=20${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      setBoards((prev) => [...prev, ...data.boards]);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? boards.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.authorName?.toLowerCase().includes(search.toLowerCase()) ||
          b.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : boards;

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search boards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No community boards yet. Make your board public to be the first!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}

      {hasMore && !search && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
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
