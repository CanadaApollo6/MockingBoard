'use client';

import { useState, useEffect } from 'react';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { DraftClock } from '@/components/draft/draft-clock';
import { BareLayout } from '@/components/layout/bare-layout';
import { timestampToDate } from '@/lib/format';

function useClockRemaining(draft: Draft | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (
      !draft ||
      draft.status !== 'active' ||
      !draft.clockExpiresAt ||
      draft.config.secondsPerPick <= 0
    ) {
      setRemaining(null);
      return;
    }

    function tick() {
      const expiresAt = timestampToDate(draft!.clockExpiresAt!).getTime();
      const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemaining(diff);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [draft?.status, draft?.currentPick, draft?.clockExpiresAt]);

  return remaining;
}

interface CurrentPickOverlayProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
}

export function CurrentPickOverlay({
  draftId,
  initialDraft,
  initialPicks,
}: CurrentPickOverlayProps) {
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const remaining = useClockRemaining(draft);

  if (!draft || draft.status !== 'active') return null;

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  if (!currentSlot) return null;

  return (
    <BareLayout className="p-2">
      <DraftClock
        overall={currentSlot.overall}
        picksMade={picks.length}
        total={draft.pickOrder.length}
        team={currentSlot.team as TeamAbbreviation}
        round={currentSlot.round}
        pick={currentSlot.pick}
        remaining={remaining}
        secondsPerPick={draft.config.secondsPerPick}
      />
    </BareLayout>
  );
}
