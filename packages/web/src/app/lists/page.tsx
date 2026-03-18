import type { Metadata } from 'next';
import { getPublicLists } from '@/lib/firebase/data';
import { ListCard } from '@/components/list/list-card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community Lists',
  description:
    'Browse curated collections of boards and reports created by the MockingBoard community.',
};

export default async function ListsPage() {
  const { lists } = await getPublicLists({ limit: 20 });

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Community Lists
        </h1>
        <p className="mt-2 text-muted-foreground">
          Curated collections of boards and reports from the community.
        </p>
      </div>

      {lists.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No public lists yet. Be the first to create one!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </main>
  );
}
