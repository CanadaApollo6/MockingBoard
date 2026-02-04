'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  teams,
  selectCpuPick,
  getEffectiveNeeds,
  getTeamDraftedPositions,
  getPickController,
  evaluateCpuTrade,
  computeTradeExecution,
  validateTradePicksAvailable,
  validateUserOwnsPicks,
  POSITIONAL_VALUE,
  type CpuTradeEvaluation,
} from '@mockingboard/shared';

const GUEST_ID = '__guest__';

const SPEED_DELAY: Record<CpuSpeed, number> = {
  instant: 0,
  fast: 300,
  normal: 1500,
};

const teamSeeds = new Map(teams.map((t) => [t.id, t]));

export interface UseGuestDraftReturn {
  draft: Draft;
  picks: Pick[];
  isProcessing: boolean;
  recordPick: (playerId: string) => void;
  proposeTrade: (
    proposerTeam: TeamAbbreviation,
    recipientTeam: TeamAbbreviation,
    giving: TradePiece[],
    receiving: TradePiece[],
  ) => { trade: Trade; evaluation: CpuTradeEvaluation } | { error: string };
  executeTrade: (trade: Trade, force: boolean) => void;
}

export function useGuestDraft(
  initialDraft: Draft,
  players: Record<string, Player>,
): UseGuestDraftReturn {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playerMap = useMemo(
    () => new Map(Object.values(players).map((p) => [p.id, p])),
    [players],
  );

  // Cancel pending CPU timeouts on unmount
  useEffect(() => {
    return () => {
      for (const t of timeoutRef.current) clearTimeout(t);
    };
  }, []);

  const getAvailable = useCallback(
    (pickedIds: string[]) => {
      const pickedSet = new Set(pickedIds);
      return Object.values(players)
        .filter((p) => !pickedSet.has(p.id))
        .sort((a, b) => a.consensusRank - b.consensusRank);
    },
    [players],
  );

  const makePick = useCallback(
    (
      currentDraft: Draft,
      currentPicks: Pick[],
      playerId: string,
      userId: string | null,
    ): { draft: Draft; picks: Pick[]; pick: Pick; isComplete: boolean } => {
      const slot = currentDraft.pickOrder[currentDraft.currentPick - 1];
      const pick: Pick = {
        id: `pick-${currentDraft.currentPick}`,
        draftId: 'guest',
        overall: slot.overall,
        round: slot.round,
        pick: slot.pick,
        team: slot.team,
        userId,
        playerId,
        createdAt: { seconds: 0, nanoseconds: 0 },
      };

      const nextPick = currentDraft.currentPick + 1;
      const isComplete = nextPick > currentDraft.pickOrder.length;
      const nextSlot = isComplete ? null : currentDraft.pickOrder[nextPick - 1];

      const updatedDraft: Draft = {
        ...currentDraft,
        currentPick: nextPick,
        currentRound: nextSlot?.round ?? slot.round,
        status: isComplete ? 'complete' : 'active',
        pickedPlayerIds: [...currentDraft.pickedPlayerIds, playerId],
      };

      return {
        draft: updatedDraft,
        picks: [...currentPicks, pick],
        pick,
        isComplete,
      };
    },
    [],
  );

  const runCpuCascade = useCallback(
    (startDraft: Draft, startPicks: Pick[]) => {
      const delay = SPEED_DELAY[startDraft.config.cpuSpeed];

      function step(currentDraft: Draft, currentPicks: Pick[]) {
        if (currentDraft.status !== 'active') {
          setDraft(currentDraft);
          setPicks(currentPicks);
          setIsProcessing(false);
          return;
        }

        const slot = currentDraft.pickOrder[currentDraft.currentPick - 1];
        if (!slot) {
          setIsProcessing(false);
          return;
        }

        const controller = getPickController(currentDraft, slot);
        if (controller !== null) {
          // Next pick is human — stop cascading
          setDraft(currentDraft);
          setPicks(currentPicks);
          setIsProcessing(false);
          return;
        }

        // CPU pick
        const available = getAvailable(currentDraft.pickedPlayerIds);
        if (available.length === 0) {
          setIsProcessing(false);
          return;
        }

        const teamSeed = teamSeeds.get(slot.team);
        const draftedPositions = getTeamDraftedPositions(
          currentDraft.pickOrder,
          currentDraft.pickedPlayerIds ?? [],
          slot.team,
          playerMap,
        );
        const effectiveNeeds = getEffectiveNeeds(
          teamSeed?.needs ?? [],
          draftedPositions,
        );
        const player = selectCpuPick(available, effectiveNeeds, {
          randomness: (currentDraft.config.cpuRandomness ?? 50) / 100,
          needsWeight: (currentDraft.config.cpuNeedsWeight ?? 50) / 100,
          positionalWeights: POSITIONAL_VALUE,
        });

        const result = makePick(currentDraft, currentPicks, player.id, null);

        if (delay === 0) {
          // Instant: recurse synchronously
          step(result.draft, result.picks);
        } else {
          // Animated: update state then schedule next step
          setDraft(result.draft);
          setPicks(result.picks);

          if (result.isComplete) {
            setIsProcessing(false);
            return;
          }

          const t = setTimeout(() => step(result.draft, result.picks), delay);
          timeoutRef.current.push(t);
        }
      }

      // For instant speed, run synchronously and set state once at the end
      if (delay === 0) {
        let d = startDraft;
        let p = startPicks;

        while (d.status === 'active') {
          const slot = d.pickOrder[d.currentPick - 1];
          if (!slot) break;
          const controller = getPickController(d, slot);
          if (controller !== null) break;

          const available = getAvailable(d.pickedPlayerIds);
          if (available.length === 0) break;

          const teamSeed = teamSeeds.get(slot.team);
          const draftedPositions = getTeamDraftedPositions(
            d.pickOrder,
            d.pickedPlayerIds ?? [],
            slot.team,
            playerMap,
          );
          const effectiveNeeds = getEffectiveNeeds(
            teamSeed?.needs ?? [],
            draftedPositions,
          );
          const player = selectCpuPick(available, effectiveNeeds, {
            randomness: (d.config.cpuRandomness ?? 50) / 100,
            needsWeight: (d.config.cpuNeedsWeight ?? 50) / 100,
            positionalWeights: POSITIONAL_VALUE,
          });
          const result = makePick(d, p, player.id, null);
          d = result.draft;
          p = result.picks;
        }

        setDraft(d);
        setPicks(p);
        setIsProcessing(false);
      } else {
        step(startDraft, startPicks);
      }
    },
    [getAvailable, makePick],
  );

  const recordPick = useCallback(
    (playerId: string) => {
      const result = makePick(draft, picks, playerId, GUEST_ID);
      setDraft(result.draft);
      setPicks(result.picks);

      if (!result.isComplete) {
        const nextSlot = result.draft.pickOrder[result.draft.currentPick - 1];
        if (nextSlot) {
          const controller = getPickController(result.draft, nextSlot);
          if (controller === null) {
            setIsProcessing(true);
            // Small delay before CPU cascade starts so the user's pick renders
            const t = setTimeout(
              () => runCpuCascade(result.draft, result.picks),
              50,
            );
            timeoutRef.current.push(t);
          }
        }
      }
    },
    [draft, picks, makePick, runCpuCascade],
  );

  const proposeTrade = useCallback(
    (
      proposerTeam: TeamAbbreviation,
      recipientTeam: TeamAbbreviation,
      giving: TradePiece[],
      receiving: TradePiece[],
    ) => {
      if (draft.teamAssignments[proposerTeam] !== GUEST_ID) {
        return { error: 'You do not control that team' };
      }

      const trade: Trade = {
        id: `trade-${Date.now()}`,
        draftId: 'guest',
        status: 'pending',
        proposerId: GUEST_ID,
        proposerTeam,
        recipientId: null,
        recipientTeam,
        proposerGives: giving,
        proposerReceives: receiving,
        proposedAt: { seconds: 0, nanoseconds: 0 },
        isForceTrade: false,
      };

      const picksAvail = validateTradePicksAvailable(trade, draft);
      if (!picksAvail.valid) return { error: picksAvail.error! };

      const ownsGiving = validateUserOwnsPicks(GUEST_ID, giving, draft);
      if (!ownsGiving.valid) return { error: ownsGiving.error! };

      const evaluation = evaluateCpuTrade(trade, draft);
      return { trade, evaluation };
    },
    [draft],
  );

  const executeTrade = useCallback(
    (trade: Trade, force: boolean) => {
      const tradeToExecute = force ? { ...trade, isForceTrade: true } : trade;
      const { pickOrder, futurePicks } = computeTradeExecution(
        tradeToExecute,
        draft,
      );
      setDraft((prev) => ({
        ...prev,
        pickOrder,
        futurePicks,
      }));
    },
    [draft],
  );

  // Trigger CPU cascade on mount if first pick is CPU
  const initialCascadeRef = useRef(false);
  useEffect(() => {
    if (initialCascadeRef.current) return;
    const slot = draft.pickOrder[(draft.currentPick ?? 1) - 1];
    if (!slot) return;
    const ctrl = getPickController(draft, slot);
    if (ctrl === null && draft.status === 'active') {
      initialCascadeRef.current = true;
      setIsProcessing(true);
      const t = setTimeout(() => runCpuCascade(draft, picks), 50);
      timeoutRef.current.push(t);
    }
  }, []);

  return {
    draft,
    picks,
    isProcessing,
    recordPick,
    proposeTrade,
    executeTrade,
  };
}
