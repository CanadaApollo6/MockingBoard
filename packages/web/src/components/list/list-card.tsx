import Link from 'next/link';
import type { UserList } from '@mockingboard/shared';
import { Routes } from '@/routes';
import { LikeButton } from '@/components/community/like-button';
import { BookmarkButton } from '@/components/community/bookmark-button';

interface ListCardProps {
  list: UserList;
  isLiked?: boolean;
}

export function ListCard({ list, isLiked }: ListCardProps) {
  const updated = list.updatedAt?.seconds
    ? new Date(list.updatedAt.seconds * 1000).toLocaleDateString()
    : null;

  const boardCount = list.items.filter((i) => i.type === 'board').length;
  const reportCount = list.items.filter((i) => i.type === 'report').length;

  return (
    <Link
      href={Routes.list(list.slug ?? list.id)}
      className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
            {list.name}
          </h3>
          {list.authorName && (
            <p className="text-sm text-muted-foreground">
              by {list.authorName}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {list.items.length} items
        </span>
      </div>

      {list.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {list.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {boardCount > 0 && <span>{boardCount} boards</span>}
          {reportCount > 0 && <span>{reportCount} reports</span>}
          {updated && <span>Updated {updated}</span>}
        </div>
        <div
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex items-center gap-2">
            <BookmarkButton targetId={list.id} targetType="list" />
            <LikeButton
              apiPath={`/api/lists/${list.id}/like`}
              initialLikeCount={list.likeCount ?? 0}
              initialIsLiked={isLiked}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
