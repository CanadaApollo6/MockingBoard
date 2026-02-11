'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/auth-provider';
import { TEAM_COLORS, deriveThemeOverrides } from '@/lib/team-colors';
import { getSchoolColor } from '@/lib/school-colors';
import type { TeamAbbreviation } from '@mockingboard/shared';

/** CSS variables that team theming overrides — used for cleanup. */
const THEME_VARS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--mb-accent',
  '--mb-accent-hover',
  '--mb-accent-muted',
  '--mb-secondary',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-ring',
  '--chart-1',
  '--chart-2',
  '--shadow-glow',
] as const;

function clearOverrides(el: HTMLElement) {
  for (const v of THEME_VARS) el.style.removeProperty(v);
}

/** Applies team- or school-colored CSS variable overrides based on the user's preference. */
export function useTeamTheme() {
  const { profile } = useAuth();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const mode = (resolvedTheme ?? 'dark') as 'dark' | 'light';
    const el = document.documentElement;

    // Resolve color pair from team or school
    const team = profile?.favoriteTeam as TeamAbbreviation | undefined;
    const school = profile?.favoriteSchool;

    let colors: { primary: string; secondary: string } | null = null;
    if (team) {
      colors = TEAM_COLORS[team];
    } else if (school) {
      colors = getSchoolColor(school);
    }

    if (!colors) {
      clearOverrides(el);
      return;
    }

    const overrides = deriveThemeOverrides(colors, mode);

    if (Object.keys(overrides).length === 0) {
      clearOverrides(el);
      return;
    }

    for (const [prop, value] of Object.entries(overrides)) {
      el.style.setProperty(prop, value);
    }

    return () => clearOverrides(el);
  }, [profile?.favoriteTeam, profile?.favoriteSchool, resolvedTheme]);
}
