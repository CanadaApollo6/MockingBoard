import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/data';
import { getSessionUser } from '@/lib/auth-session';
import { resolveUser, isUserInDraft } from '@/lib/user-resolve';
import { getDraftDisplayName } from '@/lib/format';
import { LiveDraftView } from '@/components/live-draft-view';
import { DraftRoom } from '@/components/draft-room';
import { LobbyView } from '@/components/lobby-view';

export default async function LiveDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const [{ draftId }, { invite }] = await Promise.all([params, searchParams]);
  const draft = await getDraft(draftId);
  if (!draft) notFound();

  const [picks, playerMap, session] = await Promise.all([
    getDraftPicks(draftId),
    getPlayerMap(draft.config.year),
    getSessionUser(),
  ]);

  // Serialize as plain object for the server→client boundary (Map isn't serializable)
  const players = Object.fromEntries(playerMap);
  // Lobby: show lobby view for everyone (auth handled inside)
  if (draft.status === 'lobby') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <LobbyView
          draftId={draftId}
          initialDraft={draft}
          userId={session?.uid ?? null}
          isCreator={session?.uid === draft.createdBy}
          inviteCode={invite}
        />
      </main>
    );
  }

  const user = session ? await resolveUser(session.uid) : null;
  const isParticipant =
    session && isUserInDraft(draft, session.uid, user?.discordId);

  if (isParticipant) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">
          {getDraftDisplayName(draft)}
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
    <main className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {getDraftDisplayName(draft)} — Live
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
