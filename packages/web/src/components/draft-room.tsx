'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
  TradePiece,
  Trade,
  CpuSpeed,
} from '@mockingboard/shared';
import {
  getPickController,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { PlayerPicker } from '@/components/player-picker';
import { DraftBoard } from '@/components/draft-board';
import { TradeModal } from '@/components/trade-modal';
import { TradeResult } from '@/components/trade-result';
import { DraftClock } from '@/components/draft-clock';
import { DraftLayout } from '@/components/draft-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SPEED_DELAY: Record<CpuSpeed, number> = {
  instant: 0,
  fast: 300,
  normal: 1500,
};

interface DraftRoomProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
  userId: string;
}

export function DraftRoom({
  draftId,
  initialDraft,
  initialPicks,
  players,
  userId,
}: DraftRoomProps) {
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trade state
  const [showTrade, setShowTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    trade: Trade;
    evaluation: CpuTradeEvaluation;
  } | null>(null);
  const [tradeProcessing, setTradeProcessing] = useState(false);

  // Animation: stagger reveal of CPU picks
  const [revealedCount, setRevealedCount] = useState(initialPicks.length);
  const revealedRef = useRef(initialPicks.length);
  const cpuSpeed = draft?.config.cpuSpeed ?? 'instant';
  const animating = revealedCount < picks.length;

  useEffect(() => {
    const target = picks.length;
    const current = revealedRef.current;

    if (target <= current) return;

    if (cpuSpeed === 'instant' || target - current === 1) {
      revealedRef.current = target;
      setRevealedCount(target);
      return;
    }

    revealedRef.current = current + 1;
    setRevealedCount(current + 1);

    const delay = SPEED_DELAY[cpuSpeed];
    const interval = setInterval(() => {
      if (revealedRef.current >= target) {
        clearInterval(interval);
        return;
      }
      revealedRef.current++;
      setRevealedCount(revealedRef.current);
    }, delay);

    return () => clearInterval(interval);
  }, [picks.length, cpuSpeed]);

  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

  const visiblePicks = animating ? picks.slice(0, revealedCount) : picks;

  const availablePlayers = useMemo(() => {
    if (!draft) return [];
    const pickedSet = new Set(picks.map((p) => p.playerId));
    return Object.values(players)
      .filter((p) => !pickedSet.has(p.id))
      .sort((a, b) => a.consensusRank - b.consensusRank);
  }, [draft, picks, players]);

  // Real draft state
  const currentSlot = draft?.pickOrder[(draft?.currentPick ?? 1) - 1] ?? null;
  const controller =
    draft && currentSlot ? getPickController(draft, currentSlot) : null;
  const isUserTurn = controller === userId;
  const isActive = draft?.status === 'active';
  const isComplete = draft?.status === 'complete';

  // Trade eligibility
  const hasCpuTeams = useMemo(
    () =>
      draft
        ? Object.values(draft.teamAssignments).some((uid) => uid === null)
        : false,
    [draft],
  );
  const canTrade =
    isActive &&
    draft?.config.tradesEnabled &&
    hasCpuTeams &&
    !showTrade &&
    !tradeResult &&
    !animating;

  // During animation: show the next pick being "made" on the clock
  const animatingPick = animating ? picks[revealedCount] : null;
  const clockTeam = animating ? animatingPick?.team : currentSlot?.team;
  const clockRound = animating ? animatingPick?.round : currentSlot?.round;
  const clockPickNum = animating ? animatingPick?.pick : currentSlot?.pick;
  const clockOverall = animating
    ? animatingPick?.overall
    : currentSlot?.overall;

  const totalPicks = draft?.pickOrder.length ?? 0;
  const displayedCount = visiblePicks.length;
  const progress = totalPicks > 0 ? (displayedCount / totalPicks) * 100 : 0;

  const handlePick = useCallback(
    async (playerId: string) => {
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/drafts/${draftId}/pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to record pick');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setSubmitting(false);
      }
    },
    [draftId],
  );

  const handleTradeSubmit = useCallback(
    async (
      recipientTeam: TeamAbbreviation,
      giving: TradePiece[],
      receiving: TradePiece[],
    ) => {
      setTradeProcessing(true);
      setError(null);

      try {
        const res = await fetch(`/api/drafts/${draftId}/trade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientTeam,
            proposerGives: giving,
            proposerReceives: receiving,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create trade');
        }

        const data = await res.json();
        setTradeResult(data);
        setShowTrade(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Trade failed');
      } finally {
        setTradeProcessing(false);
      }
    },
    [draftId],
  );

  const handleTradeAction = useCallback(
    async (action: 'confirm' | 'force' | 'cancel') => {
      if (!tradeResult) return;
      setTradeProcessing(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/drafts/${draftId}/trade/${tradeResult.trade.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          },
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to process trade');
        }

        setTradeResult(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Trade action failed');
      } finally {
        setTradeProcessing(false);
      }
    },
    [draftId, tradeResult],
  );

  if (!draft) {
    return (
      <p className="py-8 text-center text-muted-foreground">Draft not found.</p>
    );
  }

  const clockNode = (
    <>
      {(isActive || animating) &&
        clockTeam &&
        clockRound &&
        clockPickNum &&
        clockOverall && (
          <DraftClock
            overall={clockOverall}
            picksMade={displayedCount}
            total={totalPicks}
            team={clockTeam as TeamAbbreviation}
            round={clockRound}
            pick={clockPickNum}
            isUserTurn={!animating && isUserTurn}
          />
        )}
      {isComplete && !animating && (
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
      <DraftBoard picks={visiblePicks} playerMap={playerMap} />
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>
            {displayedCount} of {totalPicks} picks
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

  const sidebarNode = (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {canTrade && (
        <Button variant="outline" size="sm" onClick={() => setShowTrade(true)}>
          Propose Trade
        </Button>
      )}

      {showTrade && (
        <TradeModal
          draft={draft}
          userId={userId}
          onSubmit={handleTradeSubmit}
          onCancel={() => setShowTrade(false)}
          disabled={tradeProcessing}
        />
      )}

      {tradeResult && (
        <TradeResult
          evaluation={tradeResult.evaluation}
          onConfirm={() => handleTradeAction('confirm')}
          onForce={() => handleTradeAction('force')}
          onCancel={() => handleTradeAction('cancel')}
          disabled={tradeProcessing}
        />
      )}

      {isActive && isUserTurn && !animating && !showTrade && !tradeResult && (
        <PlayerPicker
          players={availablePlayers}
          onPick={handlePick}
          disabled={submitting}
        />
      )}

      {isActive &&
        !showTrade &&
        !tradeResult &&
        (animating || (!isUserTurn && currentSlot)) && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {animating ? 'CPU picks rolling in...' : 'Waiting for CPU picks...'}
          </div>
        )}
    </>
  );

  return (
    <DraftLayout clock={clockNode} board={boardNode} sidebar={sidebarNode} />
  );
}
