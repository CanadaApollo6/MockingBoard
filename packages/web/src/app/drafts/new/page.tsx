import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth-session';
import { DraftCreator } from '@/components/draft-creator';

export default async function NewDraftPage() {
  const session = await getSessionUser();
  if (!session) redirect('/');

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">New Mock Draft</h1>
      <DraftCreator />
    </main>
  );
}
