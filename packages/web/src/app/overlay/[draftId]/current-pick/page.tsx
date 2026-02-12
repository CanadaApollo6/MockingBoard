import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/firebase/data';
import { CurrentPickOverlay } from '@/components/overlays/current-pick-overlay';

export default async function CurrentPickPage({
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
    <CurrentPickOverlay
      draftId={draftId}
      initialDraft={draft}
      initialPicks={picks}
      players={Object.fromEntries(playerMap)}
    />
  );
}
