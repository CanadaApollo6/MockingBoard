'use client';

import { useState, useRef } from 'react';
import type { Position } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/validate';

interface ScoutOption {
  id: string;
  name: string;
}

interface PreviewMatch {
  key: string;
  csvName: string;
  existingName: string;
  school: string;
  position: Position;
  statsCount: number;
  hasHeight: boolean;
  hasWeight: boolean;
}

interface PreviewNew {
  key: string;
  name: string;
  school: string;
  position: Position;
  statsCount: number;
}

interface PreviewUnmatched {
  name: string;
  school: string;
}

interface PreviewResult {
  matched: PreviewMatch[];
  newPlayers: PreviewNew[];
  unmatched: PreviewUnmatched[];
  totalParsed: number;
}

type UploadState = 'idle' | 'previewing' | 'committing' | 'done';

const POSITIONS: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'OT',
  'OG',
  'EDGE',
  'DL',
  'LB',
  'CB',
  'S',
];

export function CsvUploadPage({
  scoutProfiles,
}: {
  scoutProfiles: ScoutOption[];
}) {
  const [state, setState] = useState<UploadState>('idle');
  const [position, setPosition] = useState<Position>('QB');
  const [scoutProfileId, setScoutProfileId] = useState(
    scoutProfiles[0]?.id ?? '',
  );
  const [year, setYear] = useState(2026);
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [excludeKeys, setExcludeKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [commitResult, setCommitResult] = useState<{
    updated: number;
    created: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvContent(reader.result as string);
    reader.readAsText(file);
  }

  async function handlePreview() {
    setError('');
    setState('previewing');
    try {
      const res = await fetch('/api/scouting/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          position,
          scoutProfileId,
          year,
          dryRun: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Preview failed');
      }
      const data: PreviewResult = await res.json();
      setPreview(data);
      setExcludeKeys(new Set());
    } catch (err) {
      setError(getErrorMessage(err, 'Preview failed'));
      setState('idle');
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setError('');
    setState('committing');
    try {
      const res = await fetch('/api/scouting/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          position,
          scoutProfileId,
          year,
          dryRun: false,
          excludeKeys: Array.from(excludeKeys),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Commit failed');
      }
      const data = await res.json();
      setCommitResult(data);
      setState('done');
    } catch (err) {
      setError(getErrorMessage(err, 'Commit failed'));
      setState('previewing');
    }
  }

  function handleCancel() {
    setPreview(null);
    setState('idle');
  }

  function toggleExclude(key: string) {
    setExcludeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleReset() {
    setState('idle');
    setPreview(null);
    setCommitResult(null);
    setCsvContent('');
    setFileName('');
    setExcludeKeys(new Set());
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  // Done state
  if (state === 'done' && commitResult) {
    return (
      <div className="space-y-4 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold text-green-500">
          Upload Complete
        </h2>
        <p className="text-sm text-muted-foreground">
          Updated {commitResult.updated} players, created {commitResult.created}{' '}
          new players.
        </p>
        <Button onClick={handleReset}>Upload Another</Button>
      </div>
    );
  }

  // Preview state
  if ((state === 'previewing' || state === 'committing') && preview) {
    const includedMatched = preview.matched.filter(
      (m) => !excludeKeys.has(m.key),
    ).length;
    const includedNew = preview.newPlayers.filter(
      (n) => !excludeKeys.has(n.key),
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="text-sm text-muted-foreground">
              Parsed {preview.totalParsed} rows from {fileName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={state === 'committing'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              disabled={
                state === 'committing' ||
                (includedMatched === 0 && includedNew === 0)
              }
            >
              {state === 'committing'
                ? 'Committing...'
                : `Commit (${includedMatched + includedNew} players)`}
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Matched Players */}
        {preview.matched.length > 0 && (
          <Section
            title={`Matched Players (${preview.matched.length})`}
            color="text-green-500"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-10 p-2" />
                  <th className="p-2">CSV Name</th>
                  <th className="p-2">Existing Name</th>
                  <th className="p-2">School</th>
                  <th className="w-16 p-2">Stats</th>
                </tr>
              </thead>
              <tbody>
                {preview.matched.map((m) => (
                  <tr key={m.key} className="border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={!excludeKeys.has(m.key)}
                        onChange={() => toggleExclude(m.key)}
                      />
                    </td>
                    <td className="p-2">{m.csvName}</td>
                    <td className="p-2 text-muted-foreground">
                      {m.existingName}
                    </td>
                    <td className="p-2">{m.school}</td>
                    <td className="p-2 font-mono">{m.statsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* New Players */}
        {preview.newPlayers.length > 0 && (
          <Section
            title={`New Players (${preview.newPlayers.length})`}
            color="text-blue-500"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-10 p-2" />
                  <th className="p-2">Name</th>
                  <th className="p-2">School</th>
                  <th className="w-14 p-2">Pos</th>
                  <th className="w-16 p-2">Stats</th>
                </tr>
              </thead>
              <tbody>
                {preview.newPlayers.map((n) => (
                  <tr key={n.key} className="border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={!excludeKeys.has(n.key)}
                        onChange={() => toggleExclude(n.key)}
                      />
                    </td>
                    <td className="p-2">{n.name}</td>
                    <td className="p-2">{n.school}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {n.position}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono">{n.statsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Unmatched in Firestore */}
        {preview.unmatched.length > 0 && (
          <Section
            title={`Not in CSV (${preview.unmatched.length})`}
            color="text-muted-foreground"
          >
            <div className="max-h-48 overflow-y-auto p-2 text-sm text-muted-foreground">
              {preview.unmatched.map((u, i) => (
                <span key={i}>
                  {u.name} ({u.school})
                  {i < preview.unmatched.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  // Idle state — upload form
  return (
    <div className="space-y-4 rounded-md border bg-card p-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Position</label>
          <Select
            value={position}
            onValueChange={(v) => setPosition(v as Position)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Scout Profile
          </label>
          <Select value={scoutProfileId} onValueChange={setScoutProfileId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scoutProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Year</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">CSV File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {fileName && (
          <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>
        )}
      </div>

      <Button onClick={handlePreview} disabled={!csvContent || !scoutProfileId}>
        Preview Upload
      </Button>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border">
      <h3 className={`border-b px-4 py-2 text-sm font-semibold ${color}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}
