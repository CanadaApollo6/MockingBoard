import type { Metadata } from 'next';
import { getPublicBoards, getPublicUsers } from '@/lib/data';
import { BoardCard } from '@/components/board-card';
import { AnalystProfileCard } from '@/components/analyst-profile-card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Discover analysts, big boards, and scouting reports from the MockingBoard community.',
};

export default async function CommunityPage() {
  const [{ boards }, { users }] = await Promise.all([
    getPublicBoards({ limit: 6 }),
    getPublicUsers({ limit: 12 }),
  ]);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Community
        </h1>
        <p className="mt-2 text-muted-foreground">
          Discover analysts, big boards, and scouting reports from the
          MockingBoard community.
        </p>
      </div>

      {/* Analysts */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">Analysts</h2>
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No public profiles yet. Go to Settings to make your profile public.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <AnalystProfileCard key={user.id} user={user} />
            ))}
          </div>
        )}
      </section>

      {/* Recent boards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Boards</h2>
          <a href="/boards" className="text-sm text-mb-accent hover:underline">
            View all
          </a>
        </div>
        {boards.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No community boards yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
