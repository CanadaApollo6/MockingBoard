import { notFound } from 'next/navigation';
import { getDraft, getDraftPicks, getPlayerMap } from '@/lib/data';
import { SpectatorView } from '@/components/draft/spectator-view';

export default async function SpectatePage({
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
    <SpectatorView
      draftId={draftId}
      initialDraft={draft}
      initialPicks={picks}
      players={Object.fromEntries(playerMap)}
    />
  );
}
