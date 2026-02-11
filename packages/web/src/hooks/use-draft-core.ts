'use client';

import { useMemo } from 'react';
import type {
  Draft,
  Pick,
  Player,
  DraftSlot,
  TeamAbbreviation,
} from '@mockingboard/shared';
import {
  getPickController,
  getEffectiveNeeds,
  getTeamDraftedPositions,
  teamSeeds,
  suggestPick,
} from '@mockingboard/shared';

interface DraftCoreOptions {
  bigBoardRankings?: string[];
  sortByBoard?: boolean;
  boardRankMap?: Map<string, number> | null;
}

export interface DraftCoreState {
  playerMap: Map<string, Player>;
  availablePlayers: Player[];
  currentSlot: DraftSlot | null;
  controller: string | null;
  isUserTurn: boolean;
  isActive: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isMultiTeam: boolean;
  suggestion: { playerId: string; reason: string } | null;
  clockTeam: TeamAbbreviation | undefined;
  clockRound: number | undefined;
  clockPickNum: number | undefined;
  clockOverall: number | undefined;
  totalPicks: number;
  displayedCount: number;
  progress: number;
}

export function useDraftCore(
  draft: Draft | null,
  picks: Pick[],
  players: Record<string, Player>,
  userId: string,
  options: DraftCoreOptions = {},
): DraftCoreState {
  const { bigBoardRankings, sortByBoard, boardRankMap } = options;

  const playerMap = useMemo(() => new Map(Object.entries(players)), [players]);

  const availablePlayers = useMemo(() => {
    if (!draft) return [];
    const pickedSet = new Set(picks.map((p) => p.playerId));
    const available = Object.values(players).filter(
      (p) => !pickedSet.has(p.id),
    );

    if (sortByBoard && boardRankMap) {
      const onBoard = available.filter((p) => boardRankMap.has(p.id));
      const offBoard = available.filter((p) => !boardRankMap.has(p.id));
      onBoard.sort((a, b) => boardRankMap.get(a.id)! - boardRankMap.get(b.id)!);
      offBoard.sort((a, b) => a.consensusRank - b.consensusRank);
      return [...onBoard, ...offBoard];
    }

    return available.sort((a, b) => a.consensusRank - b.consensusRank);
  }, [draft, picks, players, sortByBoard, boardRankMap]);

  const currentSlot = draft?.pickOrder[(draft?.currentPick ?? 1) - 1] ?? null;
  const controller =
    draft && currentSlot ? getPickController(draft, currentSlot) : null;
  const isUserTurn = controller === userId;
  const isActive = draft?.status === 'active';
  const isPaused = draft?.status === 'paused';
  const isComplete = draft?.status === 'complete';

  const userTeamCount = useMemo(() => {
    if (!draft) return 0;
    return Object.values(draft.teamAssignments).filter((uid) => uid === userId)
      .length;
  }, [draft, userId]);
  const isMultiTeam = userTeamCount > 1 && userTeamCount < 32;

  const suggestion = useMemo(() => {
    if (!isUserTurn || !isActive || !currentSlot) return null;
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
    currentSlot,
    draft,
    availablePlayers,
    playerMap,
    bigBoardRankings,
  ]);

  const clockTeam = currentSlot?.teamOverride ?? currentSlot?.team;
  const clockRound = currentSlot?.round;
  const clockPickNum = currentSlot?.pick;
  const clockOverall = currentSlot?.overall;

  const totalPicks = draft?.pickOrder.length ?? 0;
  const displayedCount = picks.length;
  const progress = totalPicks > 0 ? (displayedCount / totalPicks) * 100 : 0;

  return {
    playerMap,
    availablePlayers,
    currentSlot,
    controller,
    isUserTurn,
    isActive: isActive ?? false,
    isPaused: isPaused ?? false,
    isComplete: isComplete ?? false,
    isMultiTeam,
    suggestion,
    clockTeam,
    clockRound,
    clockPickNum,
    clockOverall,
    totalPicks,
    displayedCount,
    progress,
  };
}
