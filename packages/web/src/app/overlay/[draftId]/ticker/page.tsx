import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/firebase/data';
import { TickerOverlay } from '@/components/overlays/ticker-overlay';

export default async function TickerPage({
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
    <TickerOverlay
      draftId={draftId}
      initialDraft={draft}
      initialPicks={picks}
      players={Object.fromEntries(playerMap)}
    />
  );
}
