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
  remaining?: number | null;
  secondsPerPick?: number;
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return `${seconds}`;
}

type Urgency = 'normal' | 'warning' | 'critical';

function getUrgency(remaining: number | null | undefined): Urgency {
  if (remaining === null || remaining === undefined || remaining > 30)
    return 'normal';
  if (remaining > 10) return 'warning';
  return 'critical';
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
  remaining,
  secondsPerPick,
}: DraftClockProps) {
  const progress = total > 0 ? picksMade / total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);
  const colors = getTeamColor(team);
  const urgency = getUrgency(remaining);
  const hasTimer = remaining !== null && remaining !== undefined;

  // Ring color shifts to urgency color
  const ringColor =
    urgency === 'critical'
      ? 'var(--mb-danger)'
      : urgency === 'warning'
        ? 'var(--mb-warning)'
        : colors.primary;

  // Pulse color and speed shift with urgency
  const pulseColor =
    urgency === 'critical'
      ? 'var(--mb-danger)'
      : urgency === 'warning'
        ? 'var(--mb-warning)'
        : colors.primary;
  const pulseDuration =
    urgency === 'critical' ? 0.75 : urgency === 'warning' ? 1.5 : 3;

  // Vertically shift pick number when countdown is present
  const centerY = hasTimer ? SIZE / 2 - 6 : SIZE / 2;

  return (
    <div className="relative overflow-hidden rounded-lg border border-mb-border-strong bg-card p-4">
      {/* Pulse background */}
      <motion.div
        key={`pulse-${urgency}`}
        className="absolute inset-0 rounded-lg"
        style={{ backgroundColor: pulseColor }}
        animate={{ opacity: [0.05, 0.12, 0.05] }}
        transition={{
          duration: pulseDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
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
            stroke={ringColor}
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
            y={centerY}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground font-[family-name:var(--font-display)] text-lg font-bold"
          >
            #{overall}
          </text>
          {/* Countdown timer text */}
          {hasTimer && (
            <text
              x={SIZE / 2}
              y={SIZE / 2 + 10}
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono text-xs ${
                urgency === 'critical'
                  ? 'fill-[var(--mb-danger)]'
                  : urgency === 'warning'
                    ? 'fill-[var(--mb-warning)]'
                    : 'fill-muted-foreground'
              }`}
            >
              {formatTime(remaining)}
            </text>
          )}
        </svg>

        {/* Pick info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={urgency === 'critical' ? 'destructive' : 'default'}>
              {urgency === 'critical' ? 'Time Running Out' : 'On the Clock'}
            </Badge>
            {isUserTurn && <Badge variant="outline">Your Pick</Badge>}
          </div>
          <p className="mt-1 text-lg font-bold">{getTeamName(team)}</p>
          <p className="text-sm text-muted-foreground">
            Round {round}, Pick {pick} &mdash; {picksMade} of {total} picks
            {hasTimer && secondsPerPick && secondsPerPick > 0 && (
              <> &mdash; {formatTime(remaining)} left</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
