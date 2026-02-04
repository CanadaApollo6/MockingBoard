import { getUserDraftsPaginated } from '@/lib/data';
import { getSessionUser } from '@/lib/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import { DraftsGrid } from '@/components/drafts-grid';
import Link from 'next/link';

const PAGE_SIZE = 10;

export default async function DraftsPage() {
  const session = await getSessionUser();

  if (!session) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Drafts</h1>
        <p className="py-12 text-center text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>{' '}
          to view your drafts.
        </p>
      </main>
    );
  }

  const user = await resolveUser(session.uid);
  const { drafts, hasMore } = await getUserDraftsPaginated(
    session.uid,
    user?.discordId,
    { limit: PAGE_SIZE },
  );

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Drafts</h1>
        <div className="flex gap-2">
          <Link
            href="/lobbies"
            className="rounded-md border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Join a Draft
          </Link>
          <Link
            href="/drafts/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + New Draft
          </Link>
        </div>
      </div>
      <DraftsGrid
        initialDrafts={drafts}
        initialHasMore={hasMore}
        userId={session.uid}
        discordId={user?.discordId}
      />
    </main>
  );
}
