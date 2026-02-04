'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth-provider';
import { deriveThemeOverrides } from '@/lib/team-colors';
import type { TeamAbbreviation } from '@mockingboard/shared';

/** CSS variables that team theming overrides — used for cleanup. */
const TEAM_VARS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--mb-accent',
  '--mb-accent-hover',
  '--mb-accent-muted',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-ring',
  '--chart-1',
  '--shadow-glow',
] as const;

function clearOverrides(el: HTMLElement) {
  for (const v of TEAM_VARS) el.style.removeProperty(v);
}

/** Applies team-colored CSS variable overrides based on the user's favorite team. */
export function useTeamTheme() {
  const { profile } = useAuth();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const team = profile?.favoriteTeam as TeamAbbreviation | undefined;
    const mode = (resolvedTheme ?? 'dark') as 'dark' | 'light';
    const el = document.documentElement;

    if (!team) {
      clearOverrides(el);
      return;
    }

    const overrides = deriveThemeOverrides(team, mode);

    if (Object.keys(overrides).length === 0) {
      clearOverrides(el);
      return;
    }

    for (const [prop, value] of Object.entries(overrides)) {
      el.style.setProperty(prop, value);
    }

    return () => clearOverrides(el);
  }, [profile?.favoriteTeam, resolvedTheme]);
}
