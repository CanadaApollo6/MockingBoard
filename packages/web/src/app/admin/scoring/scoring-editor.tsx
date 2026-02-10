'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/validate';

interface ScoringStatus {
  year: number;
  hasResults: boolean;
  hasScores: boolean;
}

interface ScoringResult {
  draftId: string;
  draftName: string;
  userId: string;
  totalScore: number;
  percentage: number;
  pickCount: number;
}

interface ScoringEditorProps {
  currentDraftYear: number;
  statsYear: number;
}

export function ScoringEditor({
  currentDraftYear,
  statsYear,
}: ScoringEditorProps) {
  const [year, setYear] = useState(statsYear);
  const [status, setStatus] = useState<ScoringStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ScoringResult[]>([]);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadStatus = async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/scoring?year=${y}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus(year);
  }, [year]);

  const handleRunScoring = async () => {
    setRunning(true);
    setMessage(null);
    setResults([]);
    try {
      const res = await fetch('/api/admin/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Scoring failed');
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setMessage({
        type: 'success',
        text: `Scored ${data.draftsScored} drafts, wrote ${data.resultsWritten} results.`,
      });
      loadStatus(year);
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Scoring failed'),
      });
    } finally {
      setRunning(false);
    }
  };

  const years = Array.from(
    { length: currentDraftYear - 2020 },
    (_, i) => currentDraftYear - 1 - i,
  );

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Year:</label>
        <Select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Scoring Status — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : status ? (
            <div className="space-y-2">
              <p className="text-sm">
                Actual results:{' '}
                <span
                  className={
                    status.hasResults ? 'text-green-500' : 'text-destructive'
                  }
                >
                  {status.hasResults ? 'Available' : 'Not entered yet'}
                </span>
              </p>
              <p className="text-sm">
                Previous scores:{' '}
                <span
                  className={
                    status.hasScores
                      ? 'text-green-500'
                      : 'text-muted-foreground'
                  }
                >
                  {status.hasScores ? 'Exists (will add new)' : 'None'}
                </span>
              </p>

              <div className="pt-2">
                <Button
                  onClick={handleRunScoring}
                  disabled={running || !status.hasResults}
                  size="sm"
                >
                  {running ? 'Running...' : 'Run Scoring'}
                </Button>
                {!status.hasResults && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Enter actual draft results first at{' '}
                    <a href="/admin/draft-results" className="underline">
                      Draft Results
                    </a>
                    .
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load status.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Scoring Results (Top 20)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-2">Draft</th>
                    <th className="pb-2 pr-2">User ID</th>
                    <th className="pb-2 pr-2">Picks</th>
                    <th className="pb-2 pr-2">Score</th>
                    <th className="pb-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={`${r.draftId}-${r.userId}-${i}`}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-1.5 pr-2 font-medium">{r.draftName}</td>
                      <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">
                        {r.userId.slice(0, 12)}...
                      </td>
                      <td className="py-1.5 pr-2">{r.pickCount}</td>
                      <td className="py-1.5 pr-2 font-mono">{r.totalScore}</td>
                      <td className="py-1.5 font-mono">{r.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
