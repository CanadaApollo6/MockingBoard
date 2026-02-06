'use client';

import { useState, useEffect } from 'react';
import type { DraftResultPick, TeamAbbreviation } from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CsvImport } from './csv-import';

const teamOptions = teams.map((t) => t.id).sort();

interface DraftResultsEditorProps {
  initialYear: number;
  initialPicks: DraftResultPick[];
}

export function DraftResultsEditor({
  initialYear,
  initialPicks,
}: DraftResultsEditorProps) {
  const [year, setYear] = useState(initialYear);
  const [picks, setPicks] = useState<DraftResultPick[]>(initialPicks);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Reload when year changes
  useEffect(() => {
    if (year === initialYear) return;
    setLoading(true);
    fetch(`/api/admin/draft-results?year=${year}`)
      .then((res) => res.json())
      .then((data) => setPicks(data.picks ?? []))
      .catch(() => setPicks([]))
      .finally(() => setLoading(false));
  }, [year, initialYear]);

  const addPick = () => {
    const nextOverall =
      picks.length > 0 ? picks[picks.length - 1].overall + 1 : 1;
    const round = Math.ceil(nextOverall / 32);
    const pick = nextOverall - (round - 1) * 32;
    setPicks([
      ...picks,
      {
        overall: nextOverall,
        round,
        pick,
        team: 'ARI' as TeamAbbreviation,
        playerName: '',
        position: '',
        school: '',
      },
    ]);
  };

  const updatePick = (index: number, field: string, value: string | number) => {
    const updated = [...picks];
    updated[index] = { ...updated[index], [field]: value };
    setPicks(updated);
  };

  const toggleTrade = (index: number) => {
    const updated = [...picks];
    if (updated[index].trade) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { trade: _, ...rest } = updated[index];
      updated[index] = rest;
    } else {
      updated[index] = {
        ...updated[index],
        trade: {
          tradedTo: updated[index].team,
          tradedFrom: 'ARI' as TeamAbbreviation,
          details: '',
        },
      };
    }
    setPicks(updated);
  };

  const updateTrade = (index: number, field: string, value: string) => {
    const updated = [...picks];
    if (updated[index].trade) {
      updated[index] = {
        ...updated[index],
        trade: { ...updated[index].trade!, [field]: value },
      };
    }
    setPicks(updated);
  };

  const removePick = (index: number) => {
    setPicks(picks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/draft-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, picks }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: `Draft results for ${year} saved.` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium">Year</label>
        <Select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          {picks.length} picks entered
        </span>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {year} Draft Picks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {picks.map((pick, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                      {pick.overall}
                    </span>
                    <span className="w-12 text-xs text-muted-foreground">
                      R{pick.round}P{pick.pick}
                    </span>
                    <Select
                      value={pick.team}
                      onChange={(e) => updatePick(i, 'team', e.target.value)}
                      className="w-20"
                    >
                      {teamOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="text"
                      value={pick.playerName}
                      onChange={(e) =>
                        updatePick(i, 'playerName', e.target.value)
                      }
                      placeholder="Player name"
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      value={pick.position}
                      onChange={(e) =>
                        updatePick(i, 'position', e.target.value)
                      }
                      placeholder="Pos"
                      className="w-16"
                    />
                    <Input
                      type="text"
                      value={pick.school}
                      onChange={(e) => updatePick(i, 'school', e.target.value)}
                      placeholder="School"
                      className="w-32"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTrade(i)}
                      className="text-xs"
                    >
                      {pick.trade ? 'Remove Trade' : 'Trade'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePick(i)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      X
                    </Button>
                  </div>

                  {pick.trade && (
                    <div className="ml-20 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                      <span className="text-xs text-muted-foreground">
                        Trade:
                      </span>
                      <Select
                        value={pick.trade.tradedFrom}
                        onChange={(e) =>
                          updateTrade(i, 'tradedFrom', e.target.value)
                        }
                        className="w-20 text-xs"
                      >
                        {teamOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                      <span className="text-xs text-muted-foreground">to</span>
                      <Select
                        value={pick.trade.tradedTo}
                        onChange={(e) =>
                          updateTrade(i, 'tradedTo', e.target.value)
                        }
                        className="w-20 text-xs"
                      >
                        {teamOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="text"
                        value={pick.trade.details}
                        onChange={(e) =>
                          updateTrade(i, 'details', e.target.value)
                        }
                        placeholder="Trade details"
                        className="flex-1 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showCsvImport && (
              <div className="mt-4">
                <CsvImport
                  onImport={(imported) => {
                    setPicks(imported);
                    setShowCsvImport(false);
                    setMessage({
                      type: 'success',
                      text: `Imported ${imported.length} picks from CSV. Review and Save All when ready.`,
                    });
                  }}
                  onCancel={() => setShowCsvImport(false)}
                />
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addPick}>
                  Add Pick
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCsvImport(!showCsvImport)}
                >
                  {showCsvImport ? 'Hide CSV Import' : 'Import CSV'}
                </Button>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
