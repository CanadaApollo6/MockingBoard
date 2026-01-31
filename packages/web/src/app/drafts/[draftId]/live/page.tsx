import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/data';
import { LiveDraftView } from '@/components/live-draft-view';

export default async function LiveDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const draft = await getDraft(draftId);
  if (!draft) notFound();

  const [picks, playerMap] = await Promise.all([
    getDraftPicks(draftId),
    getPlayerMap(draft.config.year),
  ]);

  // Serialize as plain object for the server→client boundary (Map isn't serializable)
  const players = Object.fromEntries(playerMap);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {draft.config.year} Mock Draft — Live
      </h1>
      <LiveDraftView
        draftId={draftId}
        initialDraft={draft}
        initialPicks={picks}
        players={players}
      />
    </main>
  );
}
