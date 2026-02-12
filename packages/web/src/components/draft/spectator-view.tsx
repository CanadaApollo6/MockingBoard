'use client';

import { useState, useEffect } from 'react';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { DraftBoard } from '@/components/draft/draft-board';
import { DraftClock } from '@/components/draft/draft-clock';
import { BareLayout } from '@/components/layout/bare-layout';
import { Badge } from '@/components/ui/badge';
import { timestampToDate } from '@/lib/firebase/format';

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

interface SpectatorViewProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
}

export function SpectatorView({
  draftId,
  initialDraft,
  initialPicks,
  players,
}: SpectatorViewProps) {
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const playerMap = new Map(Object.entries(players));
  const remaining = useClockRemaining(draft);

  if (!draft) {
    return (
      <p className="py-8 text-center text-muted-foreground">Draft not found.</p>
    );
  }

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  const totalPicks = draft.pickOrder.length;
  const progress = totalPicks > 0 ? (picks.length / totalPicks) * 100 : 0;

  return (
    <BareLayout className="mx-auto max-w-screen-xl px-4 py-6">
      {draft.status === 'active' && currentSlot && (
        <DraftClock
          overall={currentSlot.overall}
          picksMade={picks.length}
          total={totalPicks}
          team={currentSlot.team as TeamAbbreviation}
          round={currentSlot.round}
          pick={currentSlot.pick}
          remaining={remaining}
          secondsPerPick={draft.config.secondsPerPick}
        />
      )}
      {draft.status === 'paused' && (
        <div className="rounded-lg border border-mb-warning/30 bg-mb-warning/5 p-4">
          <Badge variant="outline">Paused</Badge>
          <p className="mt-1 text-sm text-muted-foreground">
            This draft is currently paused.
          </p>
        </div>
      )}
      {draft.status === 'complete' && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <Badge variant="secondary">Complete</Badge>
          <p className="mt-1 text-sm text-muted-foreground">
            This draft is complete.
          </p>
        </div>
      )}

      <div className="mt-4">
        <DraftBoard
          picks={picks}
          playerMap={playerMap}
          pickOrder={draft.pickOrder}
          currentPick={draft.currentPick}
        />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>
            {picks.length} of {totalPicks} picks
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        MockingBoard
      </div>
    </BareLayout>
  );
}
