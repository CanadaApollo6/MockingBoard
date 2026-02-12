import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/firebase/data';
import { BoardOverlay } from '@/components/overlays/board-overlay';

export default async function BoardOverlayPage({
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

  return (
    <BoardOverlay
      draftId={draftId}
      initialDraft={draft}
      initialPicks={picks}
      players={Object.fromEntries(playerMap)}
    />
  );
}
