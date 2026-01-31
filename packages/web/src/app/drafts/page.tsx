import { getDrafts, getUserDrafts } from '@/lib/data';
import { getSessionUser } from '@/lib/auth-session';
import { DraftCard } from '@/components/draft-card';

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await getSessionUser();
  const showMyDrafts = tab === 'mine' && session;

  const drafts = showMyDrafts
    ? await getUserDrafts(session.uid)
    : await getDrafts();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
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

      {drafts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {showMyDrafts
            ? "You haven't participated in any drafts yet."
            : 'No drafts found.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
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
