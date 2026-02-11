import { Check, Minus } from 'lucide-react';
import type { PickScore } from '@/lib/scoring';
import { cn } from '@/lib/utils';

interface PredictionBreakdownProps {
  pickScores: PickScore[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

export function PredictionBreakdown({
  pickScores,
  totalScore,
  maxScore,
  percentage,
}: PredictionBreakdownProps) {
  const playerMatches = pickScores.filter((p) => p.playerMatch).length;
  const teamMatches = pickScores.filter((p) => p.teamMatch).length;
  const positionMatches = pickScores.filter((p) => p.positionMatch).length;

  return (
    <div>
      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-2xl font-bold">{percentage}%</p>
          <p className="text-xs text-muted-foreground">Accuracy</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-2xl font-bold">{playerMatches}</p>
          <p className="text-xs text-muted-foreground">Player Matches</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-2xl font-bold">{teamMatches}</p>
          <p className="text-xs text-muted-foreground">Team Matches</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-2xl font-bold">{positionMatches}</p>
          <p className="text-xs text-muted-foreground">Position Matches</p>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {totalScore} / {maxScore} points across {pickScores.length} picks
      </p>

      {/* Pick-by-pick table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 w-12">#</th>
              <th className="px-3 py-2">Your Pick</th>
              <th className="px-3 py-2">Actual Pick</th>
              <th className="px-3 py-2 text-center w-16">Team</th>
              <th className="px-3 py-2 text-center w-16">Player</th>
              <th className="px-3 py-2 text-center w-16">Pos</th>
              <th className="px-3 py-2 text-right w-16">Score</th>
            </tr>
          </thead>
          <tbody>
            {pickScores.map((ps) => (
              <tr
                key={ps.overall}
                className={cn(
                  'border-b last:border-b-0 transition-colors',
                  ps.score >= 70
                    ? 'bg-mb-success/10'
                    : ps.score >= 30
                      ? 'bg-mb-warning/5'
                      : '',
                )}
              >
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {ps.overall}
                </td>
                <td className="px-3 py-2 font-medium">{ps.playerPicked}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {ps.actualPlayer}
                </td>
                <td className="px-3 py-2 text-center">
                  <MatchIcon match={ps.teamMatch} />
                </td>
                <td className="px-3 py-2 text-center">
                  <MatchIcon match={ps.playerMatch} />
                </td>
                <td className="px-3 py-2 text-center">
                  <MatchIcon match={ps.positionMatch} />
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">
                  {ps.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchIcon({ match }: { match: boolean }) {
  return match ? (
    <Check className="mx-auto h-4 w-4 text-mb-success" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
}
