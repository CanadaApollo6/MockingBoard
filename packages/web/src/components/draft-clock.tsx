'use client';

import { motion } from 'framer-motion';
import type { TeamAbbreviation } from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { getTeamColor } from '@/lib/team-colors';
import { Badge } from '@/components/ui/badge';

interface DraftClockProps {
  overall: number;
  picksMade: number;
  total: number;
  team: TeamAbbreviation;
  round: number;
  pick: number;
  isUserTurn?: boolean;
}

const RADIUS = 38;
const STROKE = 4;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DraftClock({
  overall,
  picksMade,
  total,
  team,
  round,
  pick,
  isUserTurn,
}: DraftClockProps) {
  const progress = total > 0 ? picksMade / total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);
  const colors = getTeamColor(team);

  return (
    <div className="relative overflow-hidden rounded-lg border border-mb-border-strong p-4">
      {/* Team color pulse background */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{ backgroundColor: colors.primary }}
        animate={{ opacity: [0.05, 0.12, 0.05] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative flex items-center gap-4">
        {/* SVG ring */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="shrink-0"
        >
          {/* Background ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--mb-border)"
            strokeWidth={STROKE}
          />
          {/* Progress ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            className="transition-all duration-500"
          />
          {/* Center pick number */}
          <text
            x={SIZE / 2}
            y={SIZE / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground font-[family-name:var(--font-display)] text-lg font-bold"
          >
            #{overall}
          </text>
        </svg>

        {/* Pick info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge>On the Clock</Badge>
            {isUserTurn && <Badge variant="outline">Your Pick</Badge>}
          </div>
          <p className="mt-1 text-lg font-bold">{getTeamName(team)}</p>
          <p className="text-sm text-muted-foreground">
            Round {round}, Pick {pick} &mdash; {picksMade} of {total} picks
          </p>
        </div>
      </div>
    </div>
  );
}
