'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type {
  TeamAbbreviation,
  Coach,
  FrontOfficeStaff,
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

interface StaffPreview {
  coachingStaff: Coach[];
  frontOffice: FrontOfficeStaff[];
}

type State = 'idle' | 'fetching' | 'previewing' | 'committing' | 'done';

export function StaffEditor() {
  const [team, setTeam] = useState<TeamAbbreviation | ''>('');
  const [state, setState] = useState<State>('idle');
  const [preview, setPreview] = useState<StaffPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<{
    coaches: number;
    frontOffice: number;
  } | null>(null);

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
        const previewRes = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'preview', team: t.value }),
        });
        const previewJson = await previewRes.json();
        if (!previewRes.ok)
          throw new Error(previewJson.error || 'Fetch failed');

        const commitRes = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'commit',
            team: t.value,
            coachingStaff: previewJson.coachingStaff,
            frontOffice: previewJson.frontOffice,
          }),
        });
        const commitJson = await commitRes.json();
        if (!commitRes.ok) throw new Error(commitJson.error || 'Commit failed');

        setBulkDone((prev) => prev + 1);
      } catch {
        setBulkFailed((prev) => [...prev, t.value]);
        setBulkDone((prev) => prev + 1);
      }

      // Delay between teams to respect Wikipedia rate limits
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
    setPreview(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', team }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setPreview(json);
      setState('previewing');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch Wikipedia data',
      );
      setState('idle');
    }
  };

  const handleCommit = async () => {
    if (!team || !preview) return;
    setState('committing');
    setError(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          team,
          coachingStaff: preview.coachingStaff,
          frontOffice: preview.frontOffice,
        }),
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
    setPreview(null);
    setError(null);
    setCommitResult(null);
    setTeam('');
  };

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
              {state === 'fetching' ? 'Fetching...' : 'Fetch from Wikipedia'}
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
                {commitResult.coaches} coaches, {commitResult.frontOffice} front
                office staff
              </p>
              <Button onClick={handleReset} size="sm" variant="outline">
                Import Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {(state === 'previewing' || state === 'committing') && preview && (
        <>
          {/* Coaching Staff */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Coaching Staff
                <Badge variant="secondary" className="ml-2 text-xs">
                  {preview.coachingStaff.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {preview.coachingStaff.map((coach, i) => (
                  <div
                    key={`${coach.name}-${i}`}
                    className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{coach.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {coach.role}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Front Office */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Front Office
                <Badge variant="secondary" className="ml-2 text-xs">
                  {preview.frontOffice.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {preview.frontOffice.map((staff, i) => (
                  <div
                    key={`${staff.name}-${i}`}
                    className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{staff.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {staff.title}
                    </span>
                  </div>
                ))}
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
