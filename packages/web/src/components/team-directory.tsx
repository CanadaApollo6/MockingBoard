'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TeamAbbreviation, Position } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { TEAM_COLORS } from '@/lib/team-colors';
import { getPositionColor } from '@/lib/position-colors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Conference = 'All' | 'AFC' | 'NFC';
type Division = 'All' | 'North' | 'South' | 'East' | 'West';

interface TeamDirectoryProps {
  capital: Record<string, { pickCount: number; totalValue: number }>;
}

export function TeamDirectory({ capital }: TeamDirectoryProps) {
  const [conference, setConference] = useState<Conference>('All');
  const [division, setDivision] = useState<Division>('All');

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      if (conference !== 'All' && t.conference !== conference) return false;
      if (division !== 'All' && t.division !== division) return false;
      return true;
    });
  }, [conference, division]);

  // Rank teams by total capital value (descending)
  const valueRanks = useMemo(() => {
    const sorted = [...teams]
      .map((t) => ({ id: t.id, value: capital[t.id]?.totalValue ?? 0 }))
      .sort((a, b) => b.value - a.value);
    const ranks = new Map<TeamAbbreviation, number>();
    sorted.forEach((entry, i) => ranks.set(entry.id, i + 1));
    return ranks;
  }, [capital]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['All', 'AFC', 'NFC'] as Conference[]).map((c) => (
          <Button
            key={c}
            variant={conference === c ? 'default' : 'outline'}
            size="sm"
            onClick={() => setConference(c)}
          >
            {c}
          </Button>
        ))}
        <div className="mx-1" />
        {(['All', 'North', 'South', 'East', 'West'] as Division[]).map((d) => (
          <Button
            key={d}
            variant={division === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDivision(d)}
          >
            {d}
          </Button>
        ))}
      </div>

      {/* Team grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((team) => {
          const colors = TEAM_COLORS[team.id];
          const cap = capital[team.id];
          const rank = valueRanks.get(team.id) ?? 32;

          return (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-0">
                  {/* Color accent bar */}
                  <div
                    className="h-1.5 rounded-t-xl"
                    style={{
                      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                    }}
                  />
                  <div className="p-4">
                    {/* Team name and conference/division */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase leading-tight">
                          {team.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {team.conference} {team.division}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        #{rank}
                      </span>
                    </div>

                    {/* Draft capital summary */}
                    <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                      <span>
                        {cap?.pickCount ?? 0} pick
                        {(cap?.pickCount ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <span>{(cap?.totalValue ?? 0).toFixed(0)} pts</span>
                    </div>

                    {/* Top needs */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {team.needs.slice(0, 4).map((pos: Position) => (
                        <Badge
                          key={pos}
                          style={{
                            backgroundColor: getPositionColor(pos),
                            color: '#0A0A0B',
                          }}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {pos}
                        </Badge>
                      ))}
                      {team.needs.length > 4 && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          +{team.needs.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
