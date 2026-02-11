'use client';

import { useRouter } from 'next/navigation';
import { Check, Minus, RefreshCw } from 'lucide-react';
import type { DraftResultPick, Pick } from '@mockingboard/shared';
import type { PickScore } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface ScoredDraftData {
  draftId: string;
  draftName: string;
  picks: Pick[];
  pickScores: PickScore[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

interface CompanionClientProps {
  year: number;
  scoredDrafts: ScoredDraftData[];
  actualResults: DraftResultPick[];
}

export function CompanionClient({
  year,
  scoredDrafts,
  actualResults,
}: CompanionClientProps) {
  const router = useRouter();
  const [selectedDraftId, setSelectedDraftId] = useState(
    scoredDrafts[0]?.draftId ?? '',
  );

  const selectedDraft = scoredDrafts.find((d) => d.draftId === selectedDraftId);
  const resultsEntered = actualResults.length;

  if (scoredDrafts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          You don&apos;t have any locked predictions for the {year} draft yet.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete a mock draft and lock it as a prediction to use the
          companion.
        </p>
      </div>
    );
  }

  if (actualResults.length === 0) {
    return (
      <div className="space-y-4">
        {scoredDrafts.length > 1 && (
          <DraftSelector
            drafts={scoredDrafts}
            value={selectedDraftId}
            onChange={setSelectedDraftId}
          />
        )}
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-lg font-medium">
            Waiting for NFL Draft results...
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Results will appear here as picks are made during the {year} NFL
            Draft.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {scoredDrafts.length > 1 && (
            <DraftSelector
              drafts={scoredDrafts}
              value={selectedDraftId}
              onChange={setSelectedDraftId}
            />
          )}
          <span className="text-sm text-muted-foreground">
            {resultsEntered} of {selectedDraft?.picks.length ?? 0} picks entered
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Running score */}
      {selectedDraft && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="font-mono text-2xl font-bold">
              {selectedDraft.percentage}%
            </p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="font-mono text-2xl font-bold">
              {selectedDraft.pickScores.filter((p) => p.playerMatch).length}
            </p>
            <p className="text-xs text-muted-foreground">Player Hits</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="font-mono text-2xl font-bold">
              {selectedDraft.pickScores.filter((p) => p.teamMatch).length}
            </p>
            <p className="text-xs text-muted-foreground">Team Matches</p>
          </div>
        </div>
      )}

      {/* Side-by-side comparison */}
      {selectedDraft && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2 w-12">#</th>
                <th className="px-3 py-2">Your Prediction</th>
                <th className="px-3 py-2">Actual Pick</th>
                <th className="px-3 py-2 text-center w-16">Team</th>
                <th className="px-3 py-2 text-center w-16">Player</th>
                <th className="px-3 py-2 text-center w-16">Pos</th>
                <th className="px-3 py-2 text-right w-16">Score</th>
              </tr>
            </thead>
            <tbody>
              {selectedDraft.pickScores.map((ps) => {
                const actual = actualResults.find(
                  (r) => r.overall === ps.overall,
                );
                const hasResult = !!actual;

                return (
                  <tr
                    key={ps.overall}
                    className={cn(
                      'border-b last:border-b-0 transition-colors',
                      !hasResult
                        ? 'opacity-40'
                        : ps.score >= 70
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
                      {hasResult ? ps.actualPlayer : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {hasResult ? (
                        <MatchIcon match={ps.teamMatch} />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {hasResult ? (
                        <MatchIcon match={ps.playerMatch} />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {hasResult ? (
                        <MatchIcon match={ps.positionMatch} />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {hasResult ? ps.score : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DraftSelector({
  drafts,
  value,
  onChange,
}: {
  drafts: ScoredDraftData[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select draft" />
      </SelectTrigger>
      <SelectContent>
        {drafts.map((d) => (
          <SelectItem key={d.draftId} value={d.draftId}>
            {d.draftName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MatchIcon({ match }: { match: boolean }) {
  return match ? (
    <Check className="mx-auto h-4 w-4 text-mb-success" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
}
