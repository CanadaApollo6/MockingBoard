'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDollar } from '@/lib/firebase/format';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type {
  TeamAbbreviation,
  TeamContractData,
  PlayerContract,
} from '@mockingboard/shared';

const TEAMS: { value: TeamAbbreviation; label: string }[] = [
  { value: 'ARI', label: 'Arizona Cardinals' },
  { value: 'ATL', label: 'Atlanta Falcons' },
  { value: 'BAL', label: 'Baltimore Ravens' },
  { value: 'BUF', label: 'Buffalo Bills' },
  { value: 'CAR', label: 'Carolina Panthers' },
  { value: 'CHI', label: 'Chicago Bears' },
  { value: 'CIN', label: 'Cincinnati Bengals' },
  { value: 'CLE', label: 'Cleveland Browns' },
  { value: 'DAL', label: 'Dallas Cowboys' },
  { value: 'DEN', label: 'Denver Broncos' },
  { value: 'DET', label: 'Detroit Lions' },
  { value: 'GB', label: 'Green Bay Packers' },
  { value: 'HOU', label: 'Houston Texans' },
  { value: 'IND', label: 'Indianapolis Colts' },
  { value: 'JAX', label: 'Jacksonville Jaguars' },
  { value: 'KC', label: 'Kansas City Chiefs' },
  { value: 'LAC', label: 'Los Angeles Chargers' },
  { value: 'LAR', label: 'Los Angeles Rams' },
  { value: 'LV', label: 'Las Vegas Raiders' },
  { value: 'MIA', label: 'Miami Dolphins' },
  { value: 'MIN', label: 'Minnesota Vikings' },
  { value: 'NE', label: 'New England Patriots' },
  { value: 'NO', label: 'New Orleans Saints' },
  { value: 'NYG', label: 'New York Giants' },
  { value: 'NYJ', label: 'New York Jets' },
  { value: 'PHI', label: 'Philadelphia Eagles' },
  { value: 'PIT', label: 'Pittsburgh Steelers' },
  { value: 'SEA', label: 'Seattle Seahawks' },
  { value: 'SF', label: 'San Francisco 49ers' },
  { value: 'TB', label: 'Tampa Bay Buccaneers' },
  { value: 'TEN', label: 'Tennessee Titans' },
  { value: 'WAS', label: 'Washington Commanders' },
];

type SortField = 'player' | 'capNumber' | 'baseSalary';

interface ContractsEditorProps {
  initialYear: number;
}

type State = 'idle' | 'fetching' | 'previewing' | 'committing' | 'done';

export function ContractsEditor({ initialYear }: ContractsEditorProps) {
  const [team, setTeam] = useState<TeamAbbreviation | ''>('');
  const [year] = useState(initialYear);
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<TeamContractData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<{
    roster: number;
    freeAgents: number;
    deadCap: number;
  } | null>(null);
  const [sortField, setSortField] = useState<SortField>('capNumber');
  const [sortAsc, setSortAsc] = useState(false);

  // Bulk import state
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCurrent, setBulkCurrent] = useState('');
  const [bulkDone, setBulkDone] = useState(0);
  const [bulkFailed, setBulkFailed] = useState<string[]>([]);
  const bulkCancelRef = useRef(false);

  const handleBulkImport = async () => {
    setBulkRunning(true);
    setBulkDone(0);
    setBulkFailed([]);
    bulkCancelRef.current = false;
    setError(null);

    for (let i = 0; i < TEAMS.length; i++) {
      if (bulkCancelRef.current) break;
      const t = TEAMS[i];
      setBulkCurrent(t.label);

      try {
        // Preview
        const previewRes = await fetch('/api/admin/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'preview', team: t.value, year }),
        });
        const previewJson = await previewRes.json();
        if (!previewRes.ok)
          throw new Error(previewJson.error || 'Fetch failed');

        // Commit
        const commitRes = await fetch('/api/admin/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'commit',
            team: t.value,
            year,
            data: previewJson.data,
          }),
        });
        const commitJson = await commitRes.json();
        if (!commitRes.ok) throw new Error(commitJson.error || 'Commit failed');

        setBulkDone((prev) => prev + 1);
      } catch {
        setBulkFailed((prev) => [...prev, t.value]);
        setBulkDone((prev) => prev + 1);
      }

      // Delay between teams to avoid rate limiting
      if (i < TEAMS.length - 1 && !bulkCancelRef.current) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setBulkCurrent('');
    setBulkRunning(false);
  };

  const handleBulkCancel = () => {
    bulkCancelRef.current = true;
  };

  const handleFetch = async () => {
    if (!team) return;
    setState('fetching');
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', team, year }),
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
    if (!team || !data) return;
    setState('committing');
    setError(null);

    try {
      const res = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', team, year, data }),
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
    setTeam('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'player');
    }
  };

  const sortedRoster = data?.roster
    ? [...data.roster].sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        if (sortField === 'player')
          return dir * a.player.localeCompare(b.player);
        return dir * (a[sortField] - b[sortField]);
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={team}
          onValueChange={(v) => setTeam(v as TeamAbbreviation)}
          disabled={state === 'fetching' || state === 'committing'}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a team..." />
          </SelectTrigger>
          <SelectContent>
            {TEAMS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(state === 'idle' || state === 'fetching') && (
          <>
            <Button
              onClick={handleFetch}
              disabled={!team || state === 'fetching' || bulkRunning}
              size="sm"
            >
              {state === 'fetching' ? 'Fetching...' : 'Fetch from OTC'}
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={state === 'fetching' || bulkRunning}
              size="sm"
              variant="outline"
            >
              Import All Teams
            </Button>
          </>
        )}
      </div>

      {/* Bulk import progress */}
      {bulkRunning && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Importing <span className="font-medium">{bulkCurrent}</span>
                </span>
                <span className="text-muted-foreground">
                  {bulkDone}/{TEAMS.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(bulkDone / TEAMS.length) * 100}%`,
                  }}
                />
              </div>
              {bulkFailed.length > 0 && (
                <p className="text-xs text-destructive">
                  Failed: {bulkFailed.join(', ')}
                </p>
              )}
              <Button onClick={handleBulkCancel} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk import complete */}
      {!bulkRunning && bulkDone > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-500">
                Bulk import complete: {bulkDone - bulkFailed.length}/
                {TEAMS.length} teams imported
              </p>
              {bulkFailed.length > 0 && (
                <p className="text-sm text-destructive">
                  Failed: {bulkFailed.join(', ')}
                </p>
              )}
              <Button
                onClick={() => {
                  setBulkDone(0);
                  setBulkFailed([]);
                }}
                size="sm"
                variant="outline"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                {commitResult.roster} roster contracts,{' '}
                {commitResult.freeAgents} free agents, {commitResult.deadCap}{' '}
                dead cap entries
              </p>
              <Button onClick={handleReset} size="sm" variant="outline">
                Import Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {(state === 'previewing' || state === 'committing') && data && (
        <>
          {/* Cap summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Cap Summary
                <Badge variant="outline" className="ml-2 text-xs">
                  {year}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Cap Space:</span>{' '}
                  {fmtDollar(data.capSpace)}
                </div>
                <div>
                  <span className="text-muted-foreground">Effective:</span>{' '}
                  {fmtDollar(data.effectiveCapSpace)}
                </div>
                <div>
                  <span className="text-muted-foreground">Players:</span>{' '}
                  {data.playerCount}
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Active Spending:
                  </span>{' '}
                  {fmtDollar(data.activeCapSpending)}
                </div>
                <div>
                  <span className="text-muted-foreground">Dead Money:</span>{' '}
                  {fmtDollar(data.deadMoneyTotal)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roster */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Roster Contracts
                <Badge variant="secondary" className="ml-2 text-xs">
                  {data.roster.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <SortHeader
                        label="Player"
                        field="player"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Cap Hit"
                        field="capNumber"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Base Salary"
                        field="baseSalary"
                        current={sortField}
                        asc={sortAsc}
                        onClick={handleSort}
                      />
                      <th className="pb-2 pr-2">Bonus</th>
                      <th className="pb-2 pr-2">Dead (Cut)</th>
                      <th className="pb-2">Savings (Cut)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRoster.map((c: PlayerContract, i: number) => (
                      <tr
                        key={`${c.player}-${i}`}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-1.5 pr-2 font-medium">{c.player}</td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.capNumber)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.baseSalary)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.proratedBonus)}
                        </td>
                        <td className="py-1.5 pr-2 font-mono text-xs">
                          {fmtDollar(c.deadMoney.cutPreJune1)}
                        </td>
                        <td className="py-1.5 font-mono text-xs">
                          {fmtDollar(c.capSavings.cutPreJune1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Free Agents */}
          {data.freeAgents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Free Agents
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {data.freeAgents.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-2">Player</th>
                        <th className="pb-2 pr-2">Age</th>
                        <th className="pb-2 pr-2">Yrs</th>
                        <th className="pb-2 pr-2">Type</th>
                        <th className="pb-2 pr-2">Franchise</th>
                        <th className="pb-2">Transition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.freeAgents.map((fa, i) => (
                        <tr
                          key={`${fa.player}-${i}`}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="py-1.5 pr-2 font-medium">
                            {fa.player}
                          </td>
                          <td className="py-1.5 pr-2 text-xs">{fa.age}</td>
                          <td className="py-1.5 pr-2 text-xs">{fa.years}</td>
                          <td className="py-1.5 pr-2">
                            <Badge
                              variant={
                                fa.faType === 'UFA' ? 'default' : 'outline'
                              }
                              className="text-xs"
                            >
                              {fa.faType}
                            </Badge>
                          </td>
                          <td className="py-1.5 pr-2 font-mono text-xs">
                            {fmtDollar(fa.franchiseTender)}
                          </td>
                          <td className="py-1.5 font-mono text-xs">
                            {fmtDollar(fa.transitionTender)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dead Cap */}
          {data.deadCap.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Dead Cap
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {data.deadCap.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-2">Name</th>
                        <th className="pb-2">Cap Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deadCap.map((dc, i) => (
                        <tr
                          key={`${dc.name}-${i}`}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="py-1.5 pr-2">{dc.name}</td>
                          <td className="py-1.5 font-mono text-xs">
                            {fmtDollar(dc.capNumber)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

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
