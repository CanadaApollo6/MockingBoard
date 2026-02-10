'use client';

import { useMemo } from 'react';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { DraftBoard } from '@/components/draft-board';
import { DraftClock } from '@/components/draft-clock';
import { DraftLayout } from '@/components/draft-layout';
import { Badge } from '@/components/ui/badge';

interface LiveDraftViewProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
}

export function LiveDraftView({
  draftId,
  initialDraft,
  initialPicks,
  players,
}: LiveDraftViewProps) {
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

  if (!draft) {
    return (
      <p className="py-8 text-center text-muted-foreground">Draft not found.</p>
    );
  }

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  const totalPicks = draft.pickOrder.length;
  const progress = totalPicks > 0 ? (picks.length / totalPicks) * 100 : 0;

  const clockNode = (
    <>
      {draft.status === 'active' && currentSlot && (
        <DraftClock
          overall={currentSlot.overall}
          picksMade={picks.length}
          total={totalPicks}
          team={currentSlot.team as TeamAbbreviation}
          round={currentSlot.round}
          pick={currentSlot.pick}
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
    </>
  );

  const boardNode = (
    <>
      <DraftBoard
        picks={picks}
        playerMap={playerMap}
        pickOrder={draft.pickOrder}
        currentPick={draft.currentPick}
        isBatch={false}
      />
      <div>
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
    </>
  );

  return <DraftLayout clock={clockNode} board={boardNode} />;
}
