import { getCachedSeasonConfig } from '@/lib/cache';
import { DraftCreator } from '@/components/draft/draft-creator';

export default async function NewDraftPage() {
  const { draftYear } = await getCachedSeasonConfig();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">New Mock Draft</h1>
      <DraftCreator defaultYear={draftYear} />
    </main>
  );
}
