'use client';

import { useState, useMemo, useCallback } from 'react';
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
  type CpuTradeEvaluation,
} from '@mockingboard/shared';
import { useGuestDraft } from '@/hooks/use-guest-draft';
import { getTeamName } from '@/lib/teams';
import { PlayerPicker } from '@/components/player-picker';
import { DraftBoard } from '@/components/draft-board';
import { TradeModal } from '@/components/trade-modal';
import { TradeResult } from '@/components/trade-result';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const GUEST_ID = '__guest__';

interface GuestDraftRoomProps {
  initialDraft: Draft;
  players: Record<string, Player>;
}

export function GuestDraftRoom({ initialDraft, players }: GuestDraftRoomProps) {
  const { draft, picks, isProcessing, recordPick, proposeTrade, executeTrade } =
    useGuestDraft(initialDraft, players);

  const [error, setError] = useState<string | null>(null);

  // Trade state
  const [showTrade, setShowTrade] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    trade: Trade;
    evaluation: CpuTradeEvaluation;
  } | null>(null);

  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

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
      recipientTeam: TeamAbbreviation,
      giving: TradePiece[],
      receiving: TradePiece[],
    ) => {
      setError(null);
      const result = proposeTrade(recipientTeam, giving, receiving);

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

  return (
    <div className="space-y-6">
      {/* Sign-up encouragement banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        You are drafting as a guest.{' '}
        <Link href="/auth" className="font-medium text-primary hover:underline">
          Sign in
        </Link>{' '}
        to save your draft history and resume drafts later.
      </div>

      {/* On the Clock */}
      {isActive && clockTeam && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Badge>On the Clock</Badge>
            <span className="text-lg font-bold">
              {getTeamName(clockTeam as TeamAbbreviation)}
            </span>
            {isUserTurn && !isProcessing && (
              <Badge variant="outline">Your Pick</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Round {clockRound}, Pick {clockPickNum} (Overall #{clockOverall})
          </p>
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Trade controls */}
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

      {/* Player Picker */}
      {isActive &&
        isUserTurn &&
        !isProcessing &&
        !showTrade &&
        !tradeResult && (
          <PlayerPicker
            players={availablePlayers}
            onPick={handlePick}
            disabled={false}
          />
        )}

      {/* Waiting for CPU */}
      {isActive && isProcessing && !showTrade && !tradeResult && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          CPU picks rolling in...
        </div>
      )}

      {/* Pick Board */}
      <DraftBoard picks={picks} playerMap={playerMap} />
    </div>
  );
}
