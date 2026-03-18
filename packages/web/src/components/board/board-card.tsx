import Link from 'next/link';
import type { BigBoard } from '@mockingboard/shared';
import { Routes } from '@/routes';
import { LikeButton } from '@/components/community/like-button';
import { BookmarkButton } from '@/components/community/bookmark-button';

interface BoardCardProps {
  board: BigBoard;
  isLiked?: boolean;
}

export function BoardCard({ board, isLiked }: BoardCardProps) {
  const updated = board.updatedAt?.seconds
    ? new Date(board.updatedAt.seconds * 1000).toLocaleDateString()
    : null;

  return (
    <Link
      href={Routes.board(board.slug ?? board.id)}
      className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
            {board.name}
          </h3>
          {board.authorName && (
            <p className="text-sm text-muted-foreground">
              by {board.authorName}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {board.rankings.length} players
        </span>
      </div>

      {board.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {board.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{board.year}</span>
          {updated && <span>Updated {updated}</span>}
        </div>
        {/* Prevent click from navigating to board page */}
        <div
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex items-center gap-2">
            <BookmarkButton targetId={board.id} targetType="board" />
            <LikeButton
              apiPath={`/api/boards/${board.id}/like`}
              initialLikeCount={board.likeCount ?? 0}
              initialIsLiked={isLiked}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
