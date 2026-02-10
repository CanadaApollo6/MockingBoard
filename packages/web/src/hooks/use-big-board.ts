'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CustomPlayer, GradeSystem } from '@mockingboard/shared';

const SAVE_DELAY = 2000;

interface UseBigBoardOptions {
  boardId: string | null;
  initialRankings: string[];
  initialCustomPlayers?: CustomPlayer[];
  initialGrades?: Record<string, number>;
  initialPreferredGradeSystem?: GradeSystem;
}

interface UseBigBoardReturn {
  rankings: string[];
  customPlayers: CustomPlayer[];
  grades: Record<string, number>;
  preferredGradeSystem: GradeSystem;
  isSaving: boolean;
  isDirty: boolean;
  saveError: string | null;
  movePlayer: (fromIndex: number, toIndex: number) => void;
  addPlayer: (playerId: string) => void;
  removePlayer: (playerId: string) => void;
  addCustomPlayer: (player: CustomPlayer) => void;
  removeCustomPlayer: (customId: string) => void;
  setRankingsFromGenerator: (newRankings: string[]) => void;
  setGrade: (playerId: string, grade: number | undefined) => void;
  setPreferredGradeSystem: (system: GradeSystem) => void;
}

export function useBigBoard({
  boardId,
  initialRankings,
  initialCustomPlayers,
  initialGrades,
  initialPreferredGradeSystem,
}: UseBigBoardOptions): UseBigBoardReturn {
  const [rankings, setRankings] = useState(initialRankings);
  const [customPlayers, setCustomPlayers] = useState<CustomPlayer[]>(
    initialCustomPlayers ?? [],
  );
  const [grades, setGrades] = useState<Record<string, number>>(
    initialGrades ?? {},
  );
  const [preferredGradeSystem, setPreferredGradeSystemState] =
    useState<GradeSystem>(initialPreferredGradeSystem ?? 'tier');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs to always have latest values in save closure
  const rankingsRef = useRef(rankings);
  rankingsRef.current = rankings;
  const customPlayersRef = useRef(customPlayers);
  customPlayersRef.current = customPlayers;
  const gradesRef = useRef(grades);
  gradesRef.current = grades;
  const gradeSystemRef = useRef(preferredGradeSystem);
  gradeSystemRef.current = preferredGradeSystem;

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
              grades: gradesRef.current,
              preferredGradeSystem: gradeSystemRef.current,
            }),
          });
          setIsDirty(false);
          setSaveError(null);
        } catch (err) {
          console.error('Failed to save board:', err);
          setSaveError(err instanceof Error ? err.message : 'Failed to save');
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
        scheduleSave(next, customPlayersRef.current);
        return next;
      });
    },
    [scheduleSave],
  );

  const addPlayer = useCallback(
    (playerId: string) => {
      setRankings((prev) => {
        if (prev.includes(playerId)) return prev;
        const next = [...prev, playerId];
        scheduleSave(next, customPlayersRef.current);
        return next;
      });
    },
    [scheduleSave],
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      setRankings((prev) => {
        const next = prev.filter((id) => id !== playerId);
        scheduleSave(next, customPlayersRef.current);
        return next;
      });
    },
    [scheduleSave],
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

  const setRankingsFromGenerator = useCallback(
    (newRankings: string[]) => {
      setRankings(newRankings);
      scheduleSave(newRankings, customPlayersRef.current);
    },
    [scheduleSave],
  );

  const setGrade = useCallback(
    (playerId: string, grade: number | undefined) => {
      setGrades((prev) => {
        const next = { ...prev };
        if (grade === undefined) {
          delete next[playerId];
        } else {
          next[playerId] = grade;
        }
        gradesRef.current = next;
        scheduleSave(rankingsRef.current, customPlayersRef.current);
        return next;
      });
    },
    [scheduleSave],
  );

  const setPreferredGradeSystem = useCallback(
    (system: GradeSystem) => {
      setPreferredGradeSystemState(system);
      gradeSystemRef.current = system;
      scheduleSave(rankingsRef.current, customPlayersRef.current);
    },
    [scheduleSave],
  );

  return {
    rankings,
    customPlayers,
    grades,
    preferredGradeSystem,
    isSaving,
    isDirty,
    saveError,
    movePlayer,
    addPlayer,
    removePlayer,
    addCustomPlayer,
    removeCustomPlayer,
    setRankingsFromGenerator,
    setGrade,
    setPreferredGradeSystem,
  };
}
