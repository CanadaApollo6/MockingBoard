'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  Draft,
  Pick,
  Player,
  TeamAbbreviation,
  TradePiece,
  Trade,
} from '@mockingboard/shared';
import {
  prepareCpuPick,
  POSITIONAL_VALUE,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';
import { useLocalDraft } from '@/hooks/use-local-draft';
import { useDraftCore } from '@/hooks/use-draft-core';
import { useDraftTimer } from '@/hooks/use-draft-timer';
import { PlayerPicker } from '@/components/player-picker';
import { DraftBoard } from '@/components/draft-board';
import { TradeModal } from '@/components/trade-modal';
import { TradeResult } from '@/components/trade-result';
import { DraftClock } from '@/components/draft-clock';
import { DraftLayout } from '@/components/draft-layout';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/error-boundary';

const GUEST_ID = '__guest__';

interface LocalDraftRoomProps {
  initialDraft: Draft;
  players: Record<string, Player>;
  userId?: string;
  draftId?: string;
  bigBoardRankings?: string[];
  initialPicks?: Pick[];
}

export function LocalDraftRoom({
  initialDraft,
  players,
  userId,
  draftId,
  bigBoardRankings,
  initialPicks = [],
}: LocalDraftRoomProps) {
  const router = useRouter();
  const effectiveUserId = userId ?? GUEST_ID;
  const isGuest = !userId;

  const {
    draft,
    picks,
    isProcessing,
    isSyncing,
    recordPick,
    proposeTrade,
    executeTrade,
    pause,
    resume,
    cancel,
  } = useLocalDraft(initialDraft, players, { userId, draftId }, initialPicks);

  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Big Board sort mode
  const [sortMode, setSortMode] = useState<'consensus' | 'board'>('consensus');
  const boardRankMap = useMemo(() => {
    if (!bigBoardRankings) return null;
    return new Map(bigBoardRankings.map((id, i) => [id, i + 1]));
  }, [bigBoardRankings]);

  // Trade state
  const [showTrade, setShowTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    trade: Trade;
    evaluation: CpuTradeEvaluation;
  } | null>(null);

  // Skip entry animation during CPU cascade or large batch
  const prevPickCountRef = useRef(picks.length);
  const isLargeBatch = picks.length - prevPickCountRef.current > 1;
  useEffect(() => {
    prevPickCountRef.current = picks.length;
  });
  const skipAnimation = isProcessing || isLargeBatch;

  // Shared derived state
  const {
    playerMap,
    availablePlayers,
    currentSlot,
    isUserTurn,
    isActive,
    isPaused,
    isComplete,
    isMultiTeam,
    suggestion,
    clockTeam,
    clockRound,
    clockPickNum,
    clockOverall,
    totalPicks,
    displayedCount,
    progress,
  } = useDraftCore(draft, picks, players, effectiveUserId, {
    bigBoardRankings,
    sortByBoard: sortMode === 'board',
    boardRankMap,
  });

  // Redirect to recap page when authed draft completes
  useEffect(() => {
    if (isComplete && draftId) {
      router.push(`/drafts/${draftId}`);
    }
  }, [isComplete, draftId, router]);

  // Trade eligibility
  const hasCpuTeams = Object.values(draft.teamAssignments).some(
    (uid) => uid === null,
  );
  const canTrade =
    isActive &&
    draft.config.tradesEnabled &&
    hasCpuTeams &&
    !showTrade &&
    !tradeResult &&
    !isProcessing;

  const handlePick = useCallback(
    (playerId: string) => {
      setError(null);
      recordPick(playerId);
    },
    [recordPick],
  );

  const handleTradeSubmit = useCallback(
    (
      proposerTeam: TeamAbbreviation,
      recipientTeam: TeamAbbreviation,
      giving: TradePiece[],
      receiving: TradePiece[],
    ) => {
      setError(null);
      const result = proposeTrade(
        proposerTeam,
        recipientTeam,
        giving,
        receiving,
      );

      if ('error' in result) {
        setError(result.error);
        return;
      }

      setTradeResult(result);
      setShowTrade(false);
    },
    [proposeTrade],
  );

  const handleTradeAction = useCallback(
    (action: 'confirm' | 'force' | 'cancel') => {
      if (!tradeResult) return;

      if (action === 'cancel') {
        setTradeResult(null);
        return;
      }

      executeTrade(tradeResult.trade, action === 'force');
      setTradeResult(null);
    },
    [tradeResult, executeTrade],
  );

  const handlePause = useCallback(() => {
    pause();
  }, [pause]);

  const handleResume = useCallback(() => {
    resume();
  }, [resume]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await cancel();
      if (draftId) {
        router.push('/drafts');
      }
    } catch {
      setError('Failed to cancel draft');
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }, [cancel, draftId, router]);

  // Pick timer
  const timerActive = isActive && isUserTurn && !isProcessing && !isPaused;

  const handleTimerExpire = useCallback(() => {
    if (!currentSlot) return;
    const player = prepareCpuPick({
      team: currentSlot.team,
      pickOrder: draft.pickOrder,
      pickedPlayerIds: draft.pickedPlayerIds ?? [],
      playerMap,
      available: availablePlayers,
      options: {
        randomness: (draft.config.cpuRandomness ?? 50) / 100,
        needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
        boardRankings: bigBoardRankings,
        positionalWeights: POSITIONAL_VALUE,
      },
    });
    if (!player) return;
    handlePick(player.id);
  }, [
    currentSlot,
    draft,
    availablePlayers,
    playerMap,
    handlePick,
    bigBoardRankings,
  ]);

  const { remaining, clockUrgency } = useDraftTimer({
    secondsPerPick: draft.config.secondsPerPick ?? 0,
    isActive: timerActive,
    onExpire: handleTimerExpire,
    currentPick: draft.currentPick,
    status: draft.status,
  });

  const bannerNode = isGuest ? (
    <div className="rounded-lg border border-mb-accent/20 bg-mb-accent-muted px-4 py-3 text-sm text-muted-foreground">
      You are drafting as a guest.{' '}
      <Link href="/auth" className="font-medium text-primary hover:underline">
        Sign in
      </Link>{' '}
      to save your draft history and resume drafts later.
    </div>
  ) : null;

  const clockNode = (
    <>
      {(isActive || isPaused) &&
        clockTeam &&
        clockRound &&
        clockPickNum &&
        clockOverall && (
          <>
            <DraftClock
              overall={clockOverall}
              picksMade={displayedCount}
              total={totalPicks}
              team={clockTeam as TeamAbbreviation}
              round={clockRound}
              pick={clockPickNum}
              isUserTurn={isUserTurn && !isProcessing}
              remaining={
                isActive && isUserTurn && !isProcessing ? remaining : null
              }
              secondsPerPick={draft.config.secondsPerPick}
            />
            {isActive && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handlePause}>
                  Pause Draft
                </Button>
                {draftId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Draft
                  </Button>
                )}
                {isSyncing && (
                  <span className="text-xs text-muted-foreground">
                    Saving...
                  </span>
                )}
              </div>
            )}
          </>
        )}
      {isPaused && (
        <div className="rounded-lg border border-mb-warning/20 bg-mb-warning/5 p-4">
          <Badge variant="secondary">Paused</Badge>
          <p className="mt-1 text-sm text-muted-foreground">Draft is paused.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="default" size="sm" onClick={handleResume}>
              Resume Draft
            </Button>
            {draftId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Draft
              </Button>
            )}
          </div>
        </div>
      )}
      {isComplete && (
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
      <ErrorBoundary>
        <DraftBoard
          picks={picks}
          playerMap={playerMap}
          pickOrder={draft.pickOrder}
          currentPick={draft.currentPick}
          clockUrgency={clockUrgency}
          isBatch={skipAnimation}
        />
      </ErrorBoundary>
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
          userId={effectiveUserId}
          onSubmit={handleTradeSubmit}
          onCancel={() => setShowTrade(false)}
          disabled={false}
        />
      )}

      {tradeResult && (
        <TradeResult
          evaluation={tradeResult.evaluation}
          onConfirm={() => handleTradeAction('confirm')}
          onForce={() => handleTradeAction('force')}
          onCancel={() => handleTradeAction('cancel')}
          disabled={false}
        />
      )}

      {isMultiTeam && isUserTurn && currentSlot && (
        <p className="text-sm font-medium text-primary">
          Picking for {currentSlot.teamOverride ?? currentSlot.team}
        </p>
      )}

      {(isActive || isPaused) && !showTrade && !tradeResult && (
        <>
          {isActive && isProcessing && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              CPU picks rolling in...
            </div>
          )}
          {boardRankMap && (
            <div className="flex gap-1.5">
              <Button
                variant={sortMode === 'board' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSortMode('board')}
              >
                My Board
              </Button>
              <Button
                variant={sortMode === 'consensus' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSortMode('consensus')}
              >
                Consensus
              </Button>
            </div>
          )}
          <ErrorBoundary>
            <PlayerPicker
              players={availablePlayers}
              onPick={handlePick}
              disabled={!isUserTurn || isProcessing || isPaused}
              rankOverride={
                sortMode === 'board' && boardRankMap ? boardRankMap : undefined
              }
              suggestedPlayerId={suggestion?.playerId}
              suggestionReason={suggestion?.reason}
            />
          </ErrorBoundary>
        </>
      )}
    </>
  );

  const mobileLabel =
    isUserTurn && !isProcessing && !isPaused ? 'Make Your Pick' : 'Draft Room';

  return (
    <>
      <DraftLayout
        banner={bannerNode}
        clock={clockNode}
        board={boardNode}
        sidebar={sidebarNode}
        mobileLabel={mobileLabel}
      />
      {draftId && (
        <ConfirmDialog
          open={showCancelConfirm}
          onOpenChange={setShowCancelConfirm}
          title="Cancel Draft"
          description="This will permanently cancel this draft."
          confirmLabel="Cancel Draft"
          onConfirm={handleCancel}
          loading={cancelling}
          variant="destructive"
        />
      )}
    </>
  );
}
