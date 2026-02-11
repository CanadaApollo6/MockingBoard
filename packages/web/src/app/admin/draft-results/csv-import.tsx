'use client';

import { useState, useRef } from 'react';
import type { DraftResultPick, TeamAbbreviation } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/validate';

const validTeams = new Set<string>(teams.map((t) => t.id));

interface CsvImportProps {
  onImport: (picks: DraftResultPick[]) => void;
  onCancel: () => void;
}

function parseCsv(text: string): DraftResultPick[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0]
    .toLowerCase()
    .split(',')
    .map((h) => h.trim());
  const colIdx = (name: string) => header.indexOf(name);

  // Required columns
  const overallIdx = colIdx('overall');
  const roundIdx = colIdx('round');
  const pickIdx = colIdx('pick');
  const teamIdx = colIdx('team');
  const playerIdx =
    colIdx('playername') >= 0 ? colIdx('playername') : colIdx('player');
  const posIdx = colIdx('position') >= 0 ? colIdx('position') : colIdx('pos');
  const schoolIdx =
    colIdx('school') >= 0 ? colIdx('school') : colIdx('college');

  // Optional trade columns
  const tradedFromIdx = colIdx('tradedfrom');
  const tradedToIdx = colIdx('tradedto');
  const tradeDetailsIdx = colIdx('tradedetails');

  if (teamIdx < 0 || playerIdx < 0)
    throw new Error(
      'CSV must have "team" and "playerName" (or "player") columns',
    );

  const picks: DraftResultPick[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 2 || !cols[teamIdx]) continue;

    const overall = overallIdx >= 0 ? parseInt(cols[overallIdx]) || i : i;
    const round =
      roundIdx >= 0
        ? parseInt(cols[roundIdx]) || Math.ceil(overall / 32)
        : Math.ceil(overall / 32);
    const pick =
      pickIdx >= 0
        ? parseInt(cols[pickIdx]) || overall - (round - 1) * 32
        : overall - (round - 1) * 32;

    const entry: DraftResultPick = {
      overall,
      round,
      pick,
      team: cols[teamIdx].toUpperCase() as TeamAbbreviation,
      playerName: cols[playerIdx] || '',
      position: posIdx >= 0 ? cols[posIdx] || '' : '',
      school: schoolIdx >= 0 ? cols[schoolIdx] || '' : '',
    };

    // Add trade info if present
    if (
      tradedFromIdx >= 0 &&
      tradedToIdx >= 0 &&
      cols[tradedFromIdx] &&
      cols[tradedToIdx]
    ) {
      entry.trade = {
        tradedFrom: cols[tradedFromIdx].toUpperCase() as TeamAbbreviation,
        tradedTo: cols[tradedToIdx].toUpperCase() as TeamAbbreviation,
        details: tradeDetailsIdx >= 0 ? cols[tradeDetailsIdx] || '' : '',
      };
    }

    picks.push(entry);
  }

  return picks;
}

export function CsvImport({ onImport, onCancel }: CsvImportProps) {
  const [parsed, setParsed] = useState<DraftResultPick[] | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const picks = parseCsv(text);
        if (picks.length === 0) {
          setError('No valid picks found in CSV');
          setParsed(null);
          return;
        }
        setError('');
        setParsed(picks);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to parse CSV'));
        setParsed(null);
      }
    };
    reader.readAsText(file);
  };

  const invalidTeams = parsed
    ? [...new Set(parsed.map((p) => p.team).filter((t) => !validTeams.has(t)))]
    : [];

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Import from CSV</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV columns: overall, round, pick, team, playerName, position, school.
        Optional: tradedFrom, tradedTo, tradeDetails.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFile}
        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span>{parsed.length} picks parsed</span>
            {invalidTeams.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {invalidTeams.length} unknown team(s): {invalidTeams.join(', ')}
              </Badge>
            )}
          </div>

          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Rd</th>
                  <th className="px-2 py-1">Team</th>
                  <th className="px-2 py-1">Player</th>
                  <th className="px-2 py-1">Pos</th>
                  <th className="px-2 py-1">School</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr
                    key={i}
                    className={`border-b ${!validTeams.has(p.team) ? 'bg-destructive/10' : ''}`}
                  >
                    <td className="px-2 py-1 font-mono">{p.overall}</td>
                    <td className="px-2 py-1">
                      R{p.round}P{p.pick}
                    </td>
                    <td className="px-2 py-1 font-mono">{p.team}</td>
                    <td className="px-2 py-1">{p.playerName}</td>
                    <td className="px-2 py-1">{p.position}</td>
                    <td className="px-2 py-1">{p.school}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => onImport(parsed)}>
              Import {parsed.length} Picks
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
