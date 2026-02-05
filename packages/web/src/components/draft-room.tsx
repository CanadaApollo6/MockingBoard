'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  selectCpuPick,
  getEffectiveNeeds,
  getTeamDraftedPositions,
  teams,
  suggestPick,
  POSITIONAL_VALUE,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { useLiveTrades } from '@/hooks/use-live-trades';
import { usePickTimer } from '@/hooks/use-pick-timer';
import { PlayerPicker } from '@/components/player-picker';
import { DraftBoard } from '@/components/draft-board';
import { TradeModal } from '@/components/trade-modal';
import { TradeResult } from '@/components/trade-result';
import { IncomingTrade } from '@/components/incoming-trade';
import { DraftClock } from '@/components/draft-clock';
import { DraftLayout } from '@/components/draft-layout';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SPEED_DELAY: Record<CpuSpeed, number> = {
  instant: 0,
  fast: 300,
  normal: 1500,
};

const teamSeeds = new Map(teams.map((t) => [t.id, t]));

interface DraftRoomProps {
  draftId: string;
  initialDraft: Draft;
  initialPicks: Pick[];
  players: Record<string, Player>;
  userId: string;
  bigBoardRankings?: string[];
}

export function DraftRoom({
  draftId,
  initialDraft,
  initialPicks,
  players,
  userId,
  bigBoardRankings,
}: DraftRoomProps) {
  const router = useRouter();
  const { draft, picks } = useLiveDraft(draftId, initialDraft, initialPicks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Big Board sort mode
  const [sortMode, setSortMode] = useState<'consensus' | 'board'>(
    bigBoardRankings ? 'board' : 'consensus',
  );
  const boardRankMap = useMemo(() => {
    if (!bigBoardRankings) return null;
    return new Map(bigBoardRankings.map((id, i) => [id, i + 1]));
  }, [bigBoardRankings]);

  // Trade state
  const [showTrade, setShowTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    trade: Trade;
    evaluation: CpuTradeEvaluation | null;
  } | null>(null);
  const [tradeProcessing, setTradeProcessing] = useState(false);

  // Live trades: real-time pending trades for this draft
  const liveTrades = useLiveTrades(draftId);
  const incomingTrades = useMemo(
    () => liveTrades.filter((t) => t.recipientId === userId),
    [liveTrades, userId],
  );

  // Auto-clear user trade result when recipient responds
  const seenInLiveRef = useRef(false);
  useEffect(() => {
    if (!tradeResult || tradeResult.evaluation) {
      seenInLiveRef.current = false;
      return;
    }
    const inList = liveTrades.some((t) => t.id === tradeResult.trade.id);
    if (inList) {
      seenInLiveRef.current = true;
    } else if (seenInLiveRef.current) {
      setTradeResult(null);
    }
  }, [liveTrades, tradeResult]);

  // Animation: stagger reveal of CPU picks
  const [revealedCount, setRevealedCount] = useState(initialPicks.length);
  const revealedRef = useRef(initialPicks.length);
  const cpuSpeed = draft?.config.cpuSpeed ?? 'instant';
  const tradesEnabled = draft?.config.tradesEnabled ?? false;
  const animating = revealedCount < picks.length;

  // Ref for latest picks count so the stagger interval avoids stale closures
  const picksLengthRef = useRef(picks.length);
  picksLengthRef.current = picks.length;

  // Persistent interval ref — survives effect re-runs so the stagger keeps its pace
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step loop for single-pick CPU advancement when trades are enabled
  const stepLoopRef = useRef(false);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stepTick, setStepTick] = useState(0);

  useEffect(() => {
    const target = picks.length;
    const current = revealedRef.current;
    if (target <= current) return;

    // Instant speed: always reveal all immediately
    if (cpuSpeed === 'instant') {
      revealedRef.current = target;
      setRevealedCount(target);
      return;
    }

    // Single new pick while not in a CPU cascade: reveal immediately (user pick)
    if (target - current === 1 && !advancingRef.current) {
      revealedRef.current = target;
      setRevealedCount(target);
      return;
    }

    // CPU cascade with non-instant speed: stagger reveal
    // If interval already running, let it continue — it reads picksLengthRef
    if (revealIntervalRef.current) return;

    const delay = SPEED_DELAY[cpuSpeed];
    revealIntervalRef.current = setInterval(() => {
      if (revealedRef.current >= picksLengthRef.current) {
        clearInterval(revealIntervalRef.current!);
        revealIntervalRef.current = null;
        return;
      }
      revealedRef.current++;
      setRevealedCount(revealedRef.current);
    }, delay);
  }, [picks.length, cpuSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    };
  }, []);

  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

  const visiblePicks = animating ? picks.slice(0, revealedCount) : picks;

  const availablePlayers = useMemo(() => {
    if (!draft) return [];
    const pickedSet = new Set(picks.map((p) => p.playerId));
    const available = Object.values(players).filter(
      (p) => !pickedSet.has(p.id),
    );

    if (sortMode === 'board' && boardRankMap) {
      const onBoard = available.filter((p) => boardRankMap.has(p.id));
      const offBoard = available.filter((p) => !boardRankMap.has(p.id));
      onBoard.sort((a, b) => boardRankMap.get(a.id)! - boardRankMap.get(b.id)!);
      offBoard.sort((a, b) => a.consensusRank - b.consensusRank);
      return [...onBoard, ...offBoard];
    }

    return available.sort((a, b) => a.consensusRank - b.consensusRank);
  }, [draft, picks, players, sortMode, boardRankMap]);

  // Real draft state
  const currentSlot = draft?.pickOrder[(draft?.currentPick ?? 1) - 1] ?? null;
  const controller =
    draft && currentSlot ? getPickController(draft, currentSlot) : null;
  const isUserTurn = controller === userId;
  const isActive = draft?.status === 'active';
  const isPaused = draft?.status === 'paused';
  const isComplete = draft?.status === 'complete';

  // Stop stagger animation on pause so it doesn't look like CPU is still picking
  useEffect(() => {
    if (isPaused && revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
      revealedRef.current = picksLengthRef.current;
      setRevealedCount(picksLengthRef.current);
    }
  }, [isPaused]);

  // Redirect to recap page when draft completes and animation finishes
  useEffect(() => {
    if (isComplete && !animating) {
      router.push(`/drafts/${draftId}`);
    }
  }, [isComplete, animating, draftId, router]);

  const userTeamCount = useMemo(() => {
    if (!draft) return 0;
    return Object.values(draft.teamAssignments).filter((uid) => uid === userId)
      .length;
  }, [draft, userId]);
  const isMultiTeam = userTeamCount > 1 && userTeamCount < 32;

  // Suggested pick for the user
  const suggestion = useMemo(() => {
    if (!isUserTurn || !isActive || animating || !currentSlot) return null;
    const teamSeed = teamSeeds.get(currentSlot.team);
    const draftedPositions = getTeamDraftedPositions(
      draft!.pickOrder,
      draft!.pickedPlayerIds ?? [],
      currentSlot.team,
      playerMap,
    );
    const effectiveNeeds = getEffectiveNeeds(
      teamSeed?.needs ?? [],
      draftedPositions,
    );
    return suggestPick(
      availablePlayers,
      effectiveNeeds,
      currentSlot.overall,
      bigBoardRankings,
    );
  }, [
    isUserTurn,
    isActive,
    animating,
    currentSlot,
    draft,
    availablePlayers,
    playerMap,
    bigBoardRankings,
  ]);

  // Auto-trigger CPU advancement when current pick is CPU-controlled
  const needsCpuAdvance =
    isActive &&
    !animating &&
    controller === null &&
    !submitting &&
    (!tradesEnabled || (!showTrade && !tradeResult));
  const advancingRef = useRef(false);

  useEffect(() => {
    if (!needsCpuAdvance) return;

    if (tradesEnabled) {
      // Single-pick mode: advance one CPU pick at a time with speed delay
      if (stepLoopRef.current) return;
      stepLoopRef.current = true;

      fetch(`/api/drafts/${draftId}/advance?mode=single`, { method: 'POST' })
        .then((res) => res.json())
        .then(() => {
          if (!stepLoopRef.current) return;
          const delay = SPEED_DELAY[cpuSpeed];
          stepTimeoutRef.current = setTimeout(() => {
            stepTimeoutRef.current = null;
            stepLoopRef.current = false;
            setStepTick((n) => n + 1);
          }, delay);
        })
        .catch((err: Error) => {
          setError(err.message);
          stepLoopRef.current = false;
        });
    } else {
      // Full cascade mode
      if (advancingRef.current) return;
      advancingRef.current = true;

      fetch(`/api/drafts/${draftId}/advance`, { method: 'POST' })
        .catch((err: Error) => setError(err.message))
        .finally(() => {
          advancingRef.current = false;
        });
    }
  }, [needsCpuAdvance, draftId, tradesEnabled, cpuSpeed, stepTick]);

  // Reset step loop when CPU advancement stops (pause, trade UI open, etc.)
  useEffect(() => {
    if (!needsCpuAdvance) {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
        stepTimeoutRef.current = null;
      }
      stepLoopRef.current = false;
    }
  }, [needsCpuAdvance]);

  // Trade eligibility: any team not owned by the current user is a valid target
  const hasTradeTargets = useMemo(
    () =>
      draft
        ? Object.values(draft.teamAssignments).some((uid) => uid !== userId)
        : false,
    [draft, userId],
  );
  const canTrade =
    (isActive || isPaused) &&
    draft?.config.tradesEnabled &&
    hasTradeTargets &&
    !showTrade &&
    !tradeResult &&
    !animating;

  // During animation: show the next pick being "made" on the clock
  const animatingPick = animating ? picks[revealedCount] : null;
  const clockTeam = animating
    ? animatingPick?.team
    : (currentSlot?.teamOverride ?? currentSlot?.team);
  const clockRound = animating ? animatingPick?.round : currentSlot?.round;
  const clockPickNum = animating ? animatingPick?.pick : currentSlot?.pick;
  const clockOverall = animating
    ? animatingPick?.overall
    : currentSlot?.overall;

  // During stagger, OTC indicator tracks the reveal position, not the real Firestore value
  const visualCurrentPick = animating
    ? (draft?.pickOrder[revealedCount]?.overall ?? draft?.currentPick)
    : draft?.currentPick;

  const totalPicks = draft?.pickOrder.length ?? 0;
  const displayedCount = visiblePicks.length;
  const progress = totalPicks > 0 ? (displayedCount / totalPicks) * 100 : 0;

  const handlePick = useCallback(
    async (playerId: string) => {
      setSubmitting(true);
      setError(null);

      // Fast-forward stagger so the next cascade can start immediately
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
      const latest = picksLengthRef.current;
      if (revealedRef.current < latest) {
        revealedRef.current = latest;
        setRevealedCount(latest);
      }

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
      proposerTeam: TeamAbbreviation,
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
            proposerTeam,
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

  const handleIncomingTradeAction = useCallback(
    async (tradeId: string, action: 'accept' | 'reject') => {
      setTradeProcessing(true);
      setError(null);

      try {
        const res = await fetch(`/api/drafts/${draftId}/trade/${tradeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to process trade');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Trade action failed');
      } finally {
        setTradeProcessing(false);
      }
    },
    [draftId],
  );

  // Pick timer
  const timerActive = isActive && isUserTurn && !animating && !submitting;

  const handleTimerExpire = useCallback(() => {
    if (!draft || submitting) return;
    const slot = draft.pickOrder[(draft.currentPick ?? 1) - 1];
    if (!slot) return;
    const teamSeed = teamSeeds.get(slot.team);
    const draftedPositions = getTeamDraftedPositions(
      draft.pickOrder,
      draft.pickedPlayerIds ?? [],
      slot.team,
      playerMap,
    );
    const effectiveNeeds = getEffectiveNeeds(
      teamSeed?.needs ?? [],
      draftedPositions,
    );
    const player = selectCpuPick(availablePlayers, effectiveNeeds, {
      randomness: (draft.config.cpuRandomness ?? 50) / 100,
      needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
      boardRankings: bigBoardRankings,
      positionalWeights: POSITIONAL_VALUE,
    });
    if (!player) return;
    handlePick(player.id);
  }, [
    draft,
    submitting,
    availablePlayers,
    playerMap,
    handlePick,
    bigBoardRankings,
  ]);

  const {
    remaining,
    isWarning,
    isCritical,
    reset: resetTimer,
  } = usePickTimer({
    secondsPerPick: draft?.config.secondsPerPick ?? 0,
    isActive: timerActive,
    onExpire: handleTimerExpire,
  });
  const clockUrgency = isCritical
    ? ('critical' as const)
    : isWarning
      ? ('warning' as const)
      : ('normal' as const);

  // Reset timer when pick changes or draft resumes from pause
  const prevPickRef = useRef(draft?.currentPick);
  const prevStatusRef = useRef(draft?.status);
  useEffect(() => {
    const pickChanged = draft?.currentPick !== prevPickRef.current;
    const resumed =
      prevStatusRef.current === 'paused' && draft?.status === 'active';
    prevPickRef.current = draft?.currentPick;
    prevStatusRef.current = draft?.status;
    if (pickChanged || resumed) resetTimer();
  }, [draft?.currentPick, draft?.status, resetTimer]);

  // Pause / resume
  const handlePause = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/pause`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to pause');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause');
    }
  }, [draftId]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      router.push('/drafts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }, [draftId, router]);

  const handleResume = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/resume`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resume');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume');
    }
  }, [draftId]);

  if (!draft) {
    return (
      <p className="py-8 text-center text-muted-foreground">Draft not found.</p>
    );
  }

  const clockNode = (
    <>
      {(isActive || isPaused || animating) &&
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
              isUserTurn={!animating && isUserTurn}
              remaining={
                isActive && isUserTurn && !animating ? remaining : null
              }
              secondsPerPick={draft?.config.secondsPerPick}
            />
            {isActive && userId === draft?.createdBy && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handlePause}>
                  Pause Draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Draft
                </Button>
              </div>
            )}
          </>
        )}
      {isPaused && (
        <div className="rounded-lg border border-mb-warning/20 bg-mb-warning/5 p-4">
          <Badge variant="secondary">Paused</Badge>
          <p className="mt-1 text-sm text-muted-foreground">Draft is paused.</p>
          {userId === draft?.createdBy && (
            <div className="mt-2 flex gap-2">
              <Button variant="default" size="sm" onClick={handleResume}>
                Resume Draft
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Draft
              </Button>
            </div>
          )}
        </div>
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
      <DraftBoard
        picks={visiblePicks}
        playerMap={playerMap}
        pickOrder={draft?.pickOrder}
        currentPick={visualCurrentPick}
        clockUrgency={clockUrgency}
        isBatch={animating}
      />
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

      {/* Incoming trade proposals from other players */}
      {incomingTrades.map((trade) => (
        <IncomingTrade
          key={trade.id}
          trade={trade}
          draft={draft}
          onAccept={() => handleIncomingTradeAction(trade.id, 'accept')}
          onReject={() => handleIncomingTradeAction(trade.id, 'reject')}
          disabled={tradeProcessing}
        />
      ))}

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

      {tradeResult && tradeResult.evaluation && (
        <TradeResult
          evaluation={tradeResult.evaluation}
          onConfirm={() => handleTradeAction('confirm')}
          onForce={() => handleTradeAction('force')}
          onCancel={() => handleTradeAction('cancel')}
          disabled={tradeProcessing}
        />
      )}

      {tradeResult && !tradeResult.evaluation && (
        <TradeResult
          trade={tradeResult.trade}
          recipientName={
            draft.participantNames?.[
              draft.teamAssignments[tradeResult.trade.recipientTeam] ?? ''
            ] ?? 'Unknown'
          }
          onCancel={() => handleTradeAction('cancel')}
          disabled={tradeProcessing}
        />
      )}

      {(isActive || isPaused) && !showTrade && !tradeResult && (
        <>
          {animating && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              CPU picks rolling in...
            </div>
          )}
          {isUserTurn && isMultiTeam && currentSlot && (
            <p className="text-sm font-medium text-primary">
              Picking for {currentSlot.teamOverride ?? currentSlot.team}
            </p>
          )}
          {!animating && !isUserTurn && currentSlot && (
            <p className="text-sm text-muted-foreground">
              {controller && draft?.participantNames?.[controller]
                ? `Waiting for ${draft.participantNames[controller]}'s pick...`
                : 'CPU picks incoming...'}
            </p>
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
          <PlayerPicker
            players={availablePlayers}
            onPick={handlePick}
            disabled={submitting || !isUserTurn}
            rankOverride={
              sortMode === 'board' && boardRankMap ? boardRankMap : undefined
            }
            suggestedPlayerId={suggestion?.playerId}
            suggestionReason={suggestion?.reason}
          />
        </>
      )}
    </>
  );

  const mobileLabel =
    isUserTurn && !animating ? 'Make Your Pick' : 'Draft Room';

  return (
    <>
      <DraftLayout
        clock={clockNode}
        board={boardNode}
        sidebar={sidebarNode}
        mobileLabel={mobileLabel}
      />
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel Draft"
        description="This will permanently cancel the draft for all participants."
        confirmLabel="Cancel Draft"
        onConfirm={handleCancel}
        loading={cancelling}
        variant="destructive"
      />
    </>
  );
}
