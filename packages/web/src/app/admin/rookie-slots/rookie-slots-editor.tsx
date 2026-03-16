'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDollar } from '@/lib/firebase/format';
import type { RookieSlotData, RookieSlotEntry } from '@mockingboard/shared';

interface RookieSlotsEditorProps {
  initialYear: number;
}

type State = 'idle' | 'fetching' | 'previewing' | 'committing' | 'done';
type SortField = 'overall' | 'totalValue' | 'signingBonus';

export function RookieSlotsEditor({ initialYear }: RookieSlotsEditorProps) {
  const [year] = useState(initialYear);
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<RookieSlotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<{ slots: number } | null>(
    null,
  );
  const [sortField, setSortField] = useState<SortField>('overall');
  const [sortAsc, setSortAsc] = useState(true);

  const handleFetch = async () => {
    setState('fetching');
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/admin/rookie-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', year }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setData(json.data);
      setState('previewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch OTC data');
      setState('idle');
    }
  };

  const handleCommit = async () => {
    if (!data) return;
    setState('committing');
    setError(null);

    try {
      const res = await fetch('/api/admin/rookie-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to commit');
      setCommitResult(json);
      setState('done');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to commit to Firestore',
      );
      setState('previewing');
    }
  };

  const handleReset = () => {
    setState('idle');
    setData(null);
    setError(null);
    setCommitResult(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'overall');
    }
  };

  const sortedSlots = data?.slots
    ? [...data.slots].sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        return dir * (a[sortField] - b[sortField]);
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {(state === 'idle' || state === 'fetching') && (
          <Button
            onClick={handleFetch}
            disabled={state === 'fetching'}
            size="sm"
          >
            {state === 'fetching' ? 'Fetching...' : 'Fetch from OTC'}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Done state */}
      {state === 'done' && commitResult && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-500">
                Successfully imported to Firestore
              </p>
              <p className="text-sm text-muted-foreground">
                {commitResult.slots} rookie slot values imported for {year}
              </p>
              <Button onClick={handleReset} size="sm" variant="outline">
                Import Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {(state === 'previewing' || state === 'committing') && data && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Summary
                <Badge variant="outline" className="ml-2 text-xs">
                  {year}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Total Picks:</span>{' '}
                  {data.slots.length}
                </div>
                <div>
                  <span className="text-muted-foreground">Round 1 Picks:</span>{' '}
                  {data.slots.filter((s) => s.round === 1).length}
                </div>
                <div>
                  <span className="text-muted-foreground">#1 Total Value:</span>{' '}
                  {fmtDollar(
                    data.slots.find((s) => s.overall === 1)?.totalValue ?? 0,
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Slot values table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Slot Values
                <Badge variant="secondary" className="ml-2 text-xs">
                  {data.slots.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <SortHeader
                        label="Pick"
                        field="overall"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <th className="pb-2 pr-2">Rd</th>
                      <th className="pb-2 pr-2">Team</th>
                      <SortHeader
                        label="Total Value"
                        field="totalValue"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Signing Bonus"
                        field="signingBonus"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <th className="pb-2 pr-2">Yr 1 Cap</th>
                      <th className="pb-2 pr-2">Yr 2 Cap</th>
                      <th className="pb-2 pr-2">Yr 3 Cap</th>
                      <th className="pb-2">Yr 4 Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((s: RookieSlotEntry) => (
                      <tr
                        key={s.overall}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-1.5 pr-2 font-medium">
                          #{s.overall}
                        </td>
                        <td className="py-1.5 pr-2 text-xs">{s.round}</td>
                        <td className="py-1.5 pr-2 text-xs">{s.team}</td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(s.totalValue)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(s.signingBonus)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(s.year1Cap)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(s.year2Cap)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(s.year3Cap)}
                        </td>
                        <td className="py-1.5 font-mono text-xs">
                          {fmtDollar(s.year4Cap)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCommit}
              disabled={state === 'committing'}
              size="sm"
            >
              {state === 'committing' ? 'Importing...' : 'Import to Firestore'}
            </Button>
            <Button
              onClick={handleReset}
              disabled={state === 'committing'}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SortHeader({
  label,
  field,
  current,
  asc,
  onClick,
}: {
  label: string;
  field: SortField;
  current: SortField;
  asc: boolean;
  onClick: (f: SortField) => void;
}) {
  const indicator = current === field ? (asc ? ' \u25B2' : ' \u25BC') : '';
  return (
    <th
      className="cursor-pointer pb-2 pr-2 select-none"
      onClick={() => onClick(field)}
    >
      {label}
      {indicator}
    </th>
  );
}
