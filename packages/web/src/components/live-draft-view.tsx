'use client';

import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { getTeamName } from '@/lib/teams';
import { DraftBoard } from '@/components/draft-board';
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
  const playerMap = new Map(Object.entries(players));

  if (!draft) {
    return (
      <p className="py-8 text-center text-muted-foreground">Draft not found.</p>
    );
  }

  const currentSlot = draft.pickOrder[draft.currentPick - 1];
  const totalPicks = draft.pickOrder.length;
  const progress = totalPicks > 0 ? (picks.length / totalPicks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* On the Clock */}
      {draft.status === 'active' && currentSlot && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Badge>On the Clock</Badge>
            <span className="text-lg font-bold">
              {getTeamName(currentSlot.team as TeamAbbreviation)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Round {currentSlot.round}, Pick {currentSlot.pick} (Overall #
            {currentSlot.overall})
          </p>
        </div>
      )}

      {draft.status === 'paused' && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
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

      {/* Progress Bar */}
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

      {/* Pick Board */}
      <DraftBoard picks={picks} playerMap={playerMap} />
    </div>
  );
}
