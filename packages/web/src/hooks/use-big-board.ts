'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CustomPlayer } from '@mockingboard/shared';

const SAVE_DELAY = 2000;

interface UseBigBoardOptions {
  boardId: string | null;
  initialRankings: string[];
  initialCustomPlayers?: CustomPlayer[];
}

interface UseBigBoardReturn {
  rankings: string[];
  customPlayers: CustomPlayer[];
  isSaving: boolean;
  isDirty: boolean;
  movePlayer: (fromIndex: number, toIndex: number) => void;
  addPlayer: (playerId: string) => void;
  removePlayer: (playerId: string) => void;
  addCustomPlayer: (player: CustomPlayer) => void;
  removeCustomPlayer: (customId: string) => void;
}

export function useBigBoard({
  boardId,
  initialRankings,
  initialCustomPlayers,
}: UseBigBoardOptions): UseBigBoardReturn {
  const [rankings, setRankings] = useState(initialRankings);
  const [customPlayers, setCustomPlayers] = useState<CustomPlayer[]>(
    initialCustomPlayers ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save
  const scheduleSave = useCallback(
    (newRankings: string[], newCustomPlayers: CustomPlayer[]) => {
      if (!boardId) return;
      setIsDirty(true);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await fetch(`/api/boards/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rankings: newRankings,
              customPlayers: newCustomPlayers,
            }),
          });
          setIsDirty(false);
        } catch (err) {
          console.error('Failed to save board:', err);
        } finally {
          setIsSaving(false);
        }
      }, SAVE_DELAY);
    },
    [boardId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const movePlayer = useCallback(
    (fromIndex: number, toIndex: number) => {
      setRankings((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        scheduleSave(next, customPlayers);
        return next;
      });
    },
    [scheduleSave, customPlayers],
  );

  const addPlayer = useCallback(
    (playerId: string) => {
      setRankings((prev) => {
        if (prev.includes(playerId)) return prev;
        const next = [...prev, playerId];
        scheduleSave(next, customPlayers);
        return next;
      });
    },
    [scheduleSave, customPlayers],
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      setRankings((prev) => {
        const next = prev.filter((id) => id !== playerId);
        scheduleSave(next, customPlayers);
        return next;
      });
    },
    [scheduleSave, customPlayers],
  );

  const addCustomPlayer = useCallback(
    (player: CustomPlayer) => {
      setCustomPlayers((prev) => {
        const next = [...prev, player];
        setRankings((prevRankings) => {
          const nextRankings = [...prevRankings, player.id];
          scheduleSave(nextRankings, next);
          return nextRankings;
        });
        return next;
      });
    },
    [scheduleSave],
  );

  const removeCustomPlayer = useCallback(
    (customId: string) => {
      setCustomPlayers((prev) => {
        const next = prev.filter((p) => p.id !== customId);
        setRankings((prevRankings) => {
          const nextRankings = prevRankings.filter((id) => id !== customId);
          scheduleSave(nextRankings, next);
          return nextRankings;
        });
        return next;
      });
    },
    [scheduleSave],
  );

  return {
    rankings,
    customPlayers,
    isSaving,
    isDirty,
    movePlayer,
    addPlayer,
    removePlayer,
    addCustomPlayer,
    removeCustomPlayer,
  };
}
