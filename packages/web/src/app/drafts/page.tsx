import { getDraftsPaginated, getUserDraftsPaginated } from '@/lib/data';
import { getSessionUser } from '@/lib/auth-session';
import { resolveUser } from '@/lib/user-resolve';
import { DraftsGrid } from '@/components/drafts-grid';

const PAGE_SIZE = 20;

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await getSessionUser();
  const showMyDrafts = tab === 'mine' && session;

  const user = showMyDrafts ? await resolveUser(session.uid) : null;
  const { drafts, hasMore } = showMyDrafts
    ? await getUserDraftsPaginated(session.uid, user?.discordId, {
        limit: PAGE_SIZE,
      })
    : await getDraftsPaginated({
        limit: PAGE_SIZE,
        excludePrivate: true,
      });

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Drafts</h1>

      {session && (
        <div className="mb-6 flex gap-2">
          <TabLink href="/drafts" active={!showMyDrafts}>
            All Drafts
          </TabLink>
          <TabLink href="/drafts?tab=mine" active={!!showMyDrafts}>
            My Drafts
          </TabLink>
        </div>
      )}

      <DraftsGrid
        initialDrafts={drafts}
        initialHasMore={hasMore}
        tab={showMyDrafts ? 'mine' : 'all'}
      />
    </main>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </a>
  );
}
