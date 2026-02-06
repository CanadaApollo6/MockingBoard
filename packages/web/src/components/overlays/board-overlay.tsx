'use client';

import type { Draft, Pick, Player } from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { DraftBoard } from '@/components/draft-board';
import { BareLayout } from '@/components/bare-layout';
import { useSearchParams } from 'next/navigation';

interface BoardOverlayProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
}

export function BoardOverlay({
  draftId,
  initialDraft,
  initialPicks,
  players,
}: BoardOverlayProps) {
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const searchParams = useSearchParams();
  const condensed = searchParams.get('condensed') === 'true';
  const playerMap = new Map(Object.entries(players));

  if (!draft) return null;

  const pickOrder = condensed
    ? draft.pickOrder.slice(
        Math.max(0, draft.currentPick - 6),
        Math.min(draft.pickOrder.length, draft.currentPick + 10),
      )
    : draft.pickOrder;

  return (
    <BareLayout className="p-2">
      <DraftBoard
        picks={picks}
        playerMap={playerMap}
        pickOrder={pickOrder}
        currentPick={draft.currentPick}
        groupByRound={!condensed}
      />
    </BareLayout>
  );
}
