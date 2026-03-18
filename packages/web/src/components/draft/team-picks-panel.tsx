'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Pick, Player, TeamAbbreviation } from '@mockingboard/shared';
import { teams as teamSeeds } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { getPositionColor } from '@/lib/colors/position-colors';
import { getTeamName } from '@/lib/teams';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeamPicksPanelProps {
  picks: Pick[];
  playerMap: Map<string, Player>;
  teams: TeamAbbreviation[];
  defaultTeam?: TeamAbbreviation;
}

export function TeamPicksPanel({
  picks,
  playerMap,
  teams,
  defaultTeam,
}: TeamPicksPanelProps) {
  const [selectedTeam, setSelectedTeam] = useState<
    TeamAbbreviation | undefined
  >(defaultTeam);
  const [open, setOpen] = useState(true);

  // Sync with defaultTeam when it changes (e.g. user's turn switches teams)
  useEffect(() => {
    if (defaultTeam) setSelectedTeam(defaultTeam);
  }, [defaultTeam]);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.localeCompare(b)),
    [teams],
  );

  const teamPicks = useMemo(
    () => (selectedTeam ? picks.filter((p) => p.team === selectedTeam) : []),
    [picks, selectedTeam],
  );

  const teamColor = selectedTeam
    ? TEAM_COLORS[selectedTeam]?.primary
    : undefined;

  const teamSeed = useMemo(
    () =>
      selectedTeam ? teamSeeds.find((t) => t.id === selectedTeam) : undefined,
    [selectedTeam],
  );

  const filledPositions = useMemo(() => {
    const filled = new Set<string>();
    for (const pick of teamPicks) {
      const player = playerMap.get(pick.playerId);
      if (player) filled.add(player.position);
    }
    return filled;
  }, [teamPicks, playerMap]);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span>
          Team Picks
          {teamPicks.length > 0 && (
            <span className="ml-1 text-muted-foreground">
              ({teamPicks.length})
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2">
          <select
            value={selectedTeam ?? ''}
            onChange={(e) =>
              setSelectedTeam(e.target.value as TeamAbbreviation)
            }
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: teamColor ?? 'transparent',
            }}
          >
            {sortedTeams.map((team) => (
              <option key={team} value={team}>
                {getTeamName(team)}
              </option>
            ))}
          </select>

          {teamSeed && teamSeed.needs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Needs
              </p>
              <div className="flex flex-wrap gap-1">
                {teamSeed.needs.map((pos) => {
                  const isFilled = filledPositions.has(pos);
                  return (
                    <Badge
                      key={pos}
                      style={{
                        backgroundColor: getPositionColor(pos),
                        color: '#0A0A0B',
                      }}
                      className={cn(
                        'px-1.5 py-0 text-[10px]',
                        isFilled && 'opacity-40 line-through',
                      )}
                    >
                      {pos}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {teamPicks.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No picks yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {teamPicks.map((pick) => {
                const player = playerMap.get(pick.playerId);
                const posColor = player?.position
                  ? getPositionColor(player.position)
                  : undefined;

                return (
                  <div
                    key={pick.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50"
                    style={{
                      borderLeft: `3px solid ${teamColor ?? 'transparent'}`,
                    }}
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {pick.round}.{String(pick.pick).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {player?.name ?? 'Unknown'}
                    </span>
                    {posColor ? (
                      <Badge
                        style={{ backgroundColor: posColor, color: '#0A0A0B' }}
                        className="shrink-0 text-[10px]"
                      >
                        {player?.position}
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        &mdash;
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
