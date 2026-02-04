'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import type {
  Draft,
  Player,
  TeamAbbreviation,
  TradePiece,
  Trade,
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
import { useGuestDraft } from '@/hooks/use-guest-draft';
import { usePickTimer } from '@/hooks/use-pick-timer';
import { PlayerPicker } from '@/components/player-picker';
import { DraftBoard } from '@/components/draft-board';
import { TradeModal } from '@/components/trade-modal';
import { TradeResult } from '@/components/trade-result';
import { DraftClock } from '@/components/draft-clock';
import { DraftLayout } from '@/components/draft-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const GUEST_ID = '__guest__';

const teamSeeds = new Map(teams.map((t) => [t.id, t]));

interface GuestDraftRoomProps {
  initialDraft: Draft;
  players: Record<string, Player>;
}

export function GuestDraftRoom({ initialDraft, players }: GuestDraftRoomProps) {
  const { draft, picks, isProcessing, recordPick, proposeTrade, executeTrade } =
    useGuestDraft(initialDraft, players);

  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  // Trade state
  const [showTrade, setShowTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    trade: Trade;
    evaluation: CpuTradeEvaluation;
  } | null>(null);

  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

  // Skip entry animation during CPU cascade or when many picks land at once
  const prevPickCountRef = useRef(picks.length);
  const isLargeBatch = picks.length - prevPickCountRef.current > 1;
  useEffect(() => {
    prevPickCountRef.current = picks.length;
  });
  const skipAnimation = isProcessing || isLargeBatch;

  const availablePlayers = useMemo(() => {
    const pickedSet = new Set(picks.map((p) => p.playerId));
    return Object.values(players)
      .filter((p) => !pickedSet.has(p.id))
      .sort((a, b) => a.consensusRank - b.consensusRank);
  }, [picks, players]);

  const currentSlot = draft.pickOrder[(draft.currentPick ?? 1) - 1] ?? null;
  const controller = currentSlot ? getPickController(draft, currentSlot) : null;
  const isUserTurn = controller === GUEST_ID;
  const isActive = draft.status === 'active';
  const isComplete = draft.status === 'complete';

  const userTeamCount = useMemo(
    () =>
      Object.values(draft.teamAssignments).filter((uid) => uid === GUEST_ID)
        .length,
    [draft],
  );
  const isMultiTeam = userTeamCount > 1 && userTeamCount < 32;

  // Suggested pick for the user
  const suggestion = useMemo(() => {
    if (!isUserTurn || !isActive || isProcessing || !currentSlot) return null;
    const teamSeed = teamSeeds.get(currentSlot.team);
    const draftedPositions = getTeamDraftedPositions(
      draft.pickOrder,
      draft.pickedPlayerIds ?? [],
      currentSlot.team,
      playerMap,
    );
    const effectiveNeeds = getEffectiveNeeds(
      teamSeed?.needs ?? [],
      draftedPositions,
    );
    return suggestPick(availablePlayers, effectiveNeeds, currentSlot.overall);
  }, [
    isUserTurn,
    isActive,
    isProcessing,
    currentSlot,
    draft,
    availablePlayers,
    playerMap,
  ]);

  // Trade eligibility
  const hasCpuTeams = useMemo(
    () => Object.values(draft.teamAssignments).some((uid) => uid === null),
    [draft],
  );
  const canTrade =
    isActive &&
    draft.config.tradesEnabled &&
    hasCpuTeams &&
    !showTrade &&
    !tradeResult &&
    !isProcessing;

  const clockTeam = currentSlot?.team;
  const clockRound = currentSlot?.round;
  const clockPickNum = currentSlot?.pick;
  const clockOverall = currentSlot?.overall;

  const totalPicks = draft.pickOrder.length;
  const progress = totalPicks > 0 ? (picks.length / totalPicks) * 100 : 0;

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

  // Pick timer
  const timerActive = isActive && isUserTurn && !isProcessing && !paused;

  const handleTimerExpire = useCallback(() => {
    if (!currentSlot) return;
    const teamSeed = teamSeeds.get(currentSlot.team);
    const draftedPositions = getTeamDraftedPositions(
      draft.pickOrder,
      draft.pickedPlayerIds ?? [],
      currentSlot.team,
      playerMap,
    );
    const effectiveNeeds = getEffectiveNeeds(
      teamSeed?.needs ?? [],
      draftedPositions,
    );
    const player = selectCpuPick(availablePlayers, effectiveNeeds, {
      randomness: (draft.config.cpuRandomness ?? 50) / 100,
      needsWeight: (draft.config.cpuNeedsWeight ?? 50) / 100,
      positionalWeights: POSITIONAL_VALUE,
    });
    if (!player) return;
    handlePick(player.id);
  }, [currentSlot, draft, availablePlayers, playerMap, handlePick]);

  const {
    remaining,
    isWarning,
    isCritical,
    reset: resetTimer,
  } = usePickTimer({
    secondsPerPick: draft.config.secondsPerPick ?? 0,
    isActive: timerActive,
    onExpire: handleTimerExpire,
  });
  const clockUrgency = isCritical
    ? ('critical' as const)
    : isWarning
      ? ('warning' as const)
      : ('normal' as const);

  // Reset timer when pick changes or draft unpauses
  const prevPickRef = useRef(draft.currentPick);
  const prevPausedRef = useRef(paused);
  useEffect(() => {
    const pickChanged = draft.currentPick !== prevPickRef.current;
    const resumed = prevPausedRef.current && !paused;
    prevPickRef.current = draft.currentPick;
    prevPausedRef.current = paused;
    if (pickChanged || resumed) resetTimer();
  }, [draft.currentPick, paused, resetTimer]);

  const bannerNode = (
    <div className="rounded-lg border border-mb-accent/20 bg-mb-accent-muted px-4 py-3 text-sm text-muted-foreground">
      You are drafting as a guest.{' '}
      <Link href="/auth" className="font-medium text-primary hover:underline">
        Sign in
      </Link>{' '}
      to save your draft history and resume drafts later.
    </div>
  );

  const clockNode = (
    <>
      {(isActive || paused) &&
        clockTeam &&
        clockRound &&
        clockPickNum &&
        clockOverall && (
          <>
            <DraftClock
              overall={clockOverall}
              picksMade={picks.length}
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
            {isActive && !paused && (
              <Button variant="ghost" size="sm" onClick={() => setPaused(true)}>
                Pause Draft
              </Button>
            )}
          </>
        )}
      {paused && (
        <div className="rounded-lg border border-mb-warning/20 bg-mb-warning/5 p-4">
          <Badge variant="secondary">Paused</Badge>
          <p className="mt-1 text-sm text-muted-foreground">Draft is paused.</p>
          <Button
            variant="default"
            size="sm"
            className="mt-2"
            onClick={() => setPaused(false)}
          >
            Resume Draft
          </Button>
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
      <DraftBoard
        picks={picks}
        playerMap={playerMap}
        pickOrder={draft.pickOrder}
        currentPick={draft.currentPick}
        clockUrgency={clockUrgency}
        isBatch={skipAnimation}
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
          userId={GUEST_ID}
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

      {isActive &&
        isUserTurn &&
        !isProcessing &&
        !paused &&
        !showTrade &&
        !tradeResult && (
          <PlayerPicker
            players={availablePlayers}
            onPick={handlePick}
            disabled={false}
            suggestedPlayerId={suggestion?.playerId}
            suggestionReason={suggestion?.reason}
          />
        )}

      {isActive && isProcessing && !showTrade && !tradeResult && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          CPU picks rolling in...
        </div>
      )}
    </>
  );

  const mobileLabel =
    isUserTurn && !isProcessing && !paused ? 'Make Your Pick' : 'Draft Room';

  return (
    <DraftLayout
      banner={bannerNode}
      clock={clockNode}
      board={boardNode}
      sidebar={sidebarNode}
      mobileLabel={mobileLabel}
    />
  );
}
