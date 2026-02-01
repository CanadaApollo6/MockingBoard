import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/data';
import { getSessionUser } from '@/lib/auth-session';
import { LiveDraftView } from '@/components/live-draft-view';
import { DraftRoom } from '@/components/draft-room';

export default async function LiveDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const draft = await getDraft(draftId);
  if (!draft) notFound();

  const [picks, playerMap, session] = await Promise.all([
    getDraftPicks(draftId),
    getPlayerMap(draft.config.year),
    getSessionUser(),
  ]);

  // Serialize as plain object for the server→client boundary (Map isn't serializable)
  const players = Object.fromEntries(playerMap);
  const isParticipant = session && draft.participants[session.uid];

  if (isParticipant) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">
          {draft.config.year} Mock Draft
        </h1>
        <DraftRoom
          draftId={draftId}
          initialDraft={draft}
          initialPicks={picks}
          players={players}
          userId={session.uid}
        />
      </main>
    );
  }

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
