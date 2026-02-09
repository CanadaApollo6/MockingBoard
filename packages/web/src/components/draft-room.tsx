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

  // CPU advancement state
  const [advancingCpu, setAdvancingCpu] = useState(false);
  const cpuSpeed = draft?.config.cpuSpeed ?? 'instant';
  const tradesEnabled = draft?.config.tradesEnabled ?? false;

  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

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

  // Redirect to recap page when draft completes
  useEffect(() => {
    if (isComplete && !advancingCpu) {
      router.push(`/drafts/${draftId}`);
    }
  }, [isComplete, advancingCpu, draftId, router]);

  const userTeamCount = useMemo(() => {
    if (!draft) return 0;
    return Object.values(draft.teamAssignments).filter((uid) => uid === userId)
      .length;
  }, [draft, userId]);
  const isMultiTeam = userTeamCount > 1 && userTeamCount < 32;

  // Suggested pick for the user
  const suggestion = useMemo(() => {
    if (!isUserTurn || !isActive || advancingCpu || !currentSlot) return null;
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
    advancingCpu,
    currentSlot,
    draft,
    availablePlayers,
    playerMap,
    bigBoardRankings,
  ]);

  // Unified CPU advancement: drives picks at the configured speed
  useEffect(() => {
    const isCpuTurn =
      isActive &&
      controller === null &&
      !submitting &&
      (!tradesEnabled || (!showTrade && !tradeResult));
    if (!isCpuTurn) {
      setAdvancingCpu(false);
      return;
    }

    setAdvancingCpu(true);
    let cancelled = false;

    if (cpuSpeed === 'instant') {
      // Full cascade — server writes all CPU picks, Firestore delivers them at once
      fetch(`/api/drafts/${draftId}/advance`, { method: 'POST' })
        .catch((err: Error) => setError(err.message))
        .finally(() => {
          if (!cancelled) setAdvancingCpu(false);
        });
    } else {
      // Paced loop — advance one pick at a time with a delay between each
      (async () => {
        while (!cancelled) {
          try {
            const res = await fetch(
              `/api/drafts/${draftId}/advance?mode=single`,
              { method: 'POST' },
            );
            const data = await res.json();
            if (!data.pick || data.isComplete || cancelled) break;
            await new Promise((r) => setTimeout(r, SPEED_DELAY[cpuSpeed]));
          } catch {
            break;
          }
        }
        if (!cancelled) setAdvancingCpu(false);
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [
    isActive,
    controller,
    submitting,
    tradesEnabled,
    showTrade,
    tradeResult,
    cpuSpeed,
    draftId,
  ]);

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
    !advancingCpu;

  const clockTeam = currentSlot?.teamOverride ?? currentSlot?.team;
  const clockRound = currentSlot?.round;
  const clockPickNum = currentSlot?.pick;
  const clockOverall = currentSlot?.overall;

  const totalPicks = draft?.pickOrder.length ?? 0;
  const displayedCount = picks.length;
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
  const timerActive = isActive && isUserTurn && !advancingCpu && !submitting;

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
      {(isActive || isPaused || advancingCpu) &&
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
              isUserTurn={!advancingCpu && isUserTurn}
              remaining={
                isActive && isUserTurn && !advancingCpu ? remaining : null
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
      {isComplete && !advancingCpu && (
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
        pickOrder={draft?.pickOrder}
        currentPick={draft?.currentPick}
        clockUrgency={clockUrgency}
        isBatch={advancingCpu}
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
          {advancingCpu && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              CPU picks rolling in...
            </div>
          )}
          {isUserTurn && isMultiTeam && currentSlot && (
            <p className="text-sm font-medium text-primary">
              Picking for {currentSlot.teamOverride ?? currentSlot.team}
            </p>
          )}
          {!advancingCpu && !isUserTurn && currentSlot && (
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
    isUserTurn && !advancingCpu ? 'Make Your Pick' : 'Draft Room';

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
