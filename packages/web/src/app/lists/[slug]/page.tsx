import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getListBySlug,
  getBoardsByIds,
  getReportsByIds,
  getComments,
  getPlayerMap,
} from '@/lib/firebase/data';
import { getCachedSeasonConfig } from '@/lib/cache';
import { Routes } from '@/routes';
import { BoardCard } from '@/components/board/board-card';
import { ReportCard } from '@/components/community/report-card';
import { CommentSection } from '@/components/comments/comment-section';
import { LikeButton } from '@/components/community/like-button';
import { BookmarkButton } from '@/components/community/bookmark-button';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = await getListBySlug(slug);

  if (!list) return {};

  const title = list.name;
  const description =
    list.description ??
    `${list.name} by ${list.authorName ?? 'Anonymous'} – a curated collection of ${list.items.length} items.`;

  return { title, description };
}

export default async function ListDetailPage({ params }: Props) {
  const { slug } = await params;
  const list = await getListBySlug(slug);

  if (!list) notFound();

  // Separate items by type
  const boardIds = list.items
    .filter((i) => i.type === 'board')
    .map((i) => i.id);
  const reportIds = list.items
    .filter((i) => i.type === 'report')
    .map((i) => i.id);

  const [boards, reports, comments] = await Promise.all([
    getBoardsByIds(boardIds),
    getReportsByIds(reportIds),
    getComments('list', list.id),
  ]);

  // Build lookup maps for ordered rendering
  const boardMap = new Map(boards.map((b) => [b.id, b]));
  const reportMap = new Map(reports.map((r) => [r.id, r]));

  // Resolve player names for reports
  const { draftYear } = await getCachedSeasonConfig();
  const playerMap = reports.length > 0 ? await getPlayerMap(draftYear) : null;

  const updated = list.updatedAt?.seconds
    ? new Date(list.updatedAt.seconds * 1000).toLocaleDateString()
    : null;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          {list.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {list.authorName && <span>by {list.authorName}</span>}
          <span>{list.items.length} items</span>
          {updated && <span>Updated {updated}</span>}
        </div>
        {list.description && (
          <p className="mt-3 text-muted-foreground">{list.description}</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <LikeButton
            apiPath={`/api/lists/${list.id}/like`}
            initialLikeCount={list.likeCount ?? 0}
          />
          <BookmarkButton targetId={list.id} targetType="list" />
        </div>
      </div>

      {/* List items in order */}
      <div className="space-y-4">
        {list.items.map((item, index) => {
          if (item.type === 'board') {
            const board = boardMap.get(item.id);
            if (!board) return null;
            return (
              <div key={`${item.type}-${item.id}`}>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-bold">{index + 1}.</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    Board
                  </span>
                  {item.note && (
                    <span className="italic">&ldquo;{item.note}&rdquo;</span>
                  )}
                </div>
                <BoardCard board={board} />
              </div>
            );
          }

          const report = reportMap.get(item.id);
          if (!report) return null;
          const player = playerMap?.get(report.playerId);
          return (
            <div key={`${item.type}-${item.id}`}>
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono font-bold">{index + 1}.</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                  Report
                </span>
                {player && (
                  <Link
                    href={Routes.prospect(report.playerId)}
                    className="text-mb-accent hover:underline"
                  >
                    {player.name}
                  </Link>
                )}
                {item.note && (
                  <span className="italic">&ldquo;{item.note}&rdquo;</span>
                )}
              </div>
              <ReportCard report={report} />
            </div>
          );
        })}
      </div>

      {list.items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          This list is empty.
        </p>
      )}

      <div className="mt-8">
        <CommentSection
          targetId={list.id}
          targetType="list"
          initialComments={comments}
          initialCount={list.commentCount ?? comments.length}
        />
      </div>
    </main>
  );
}
