'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  teams,
  type DraftSlot,
  type TeamAbbreviation,
} from '@mockingboard/shared';
import { getErrorMessage } from '@/lib/validate';

const ALL_TEAMS = teams.map((t) => t.id).sort();
const ROUNDS = 7;
const PICKS_PER_ROUND = 32;

function generateDefaultOrder(): DraftSlot[] {
  const slots: DraftSlot[] = [];
  let overall = 1;
  for (let round = 1; round <= ROUNDS; round++) {
    for (let pick = 1; pick <= PICKS_PER_ROUND; pick++) {
      slots.push({
        overall,
        round,
        pick,
        team: ALL_TEAMS[(pick - 1) % ALL_TEAMS.length] as TeamAbbreviation,
      });
      overall++;
    }
  }
  return slots;
}

interface DraftOrderEditorProps {
  initialYear: number;
  initialSlots: DraftSlot[];
}

export function DraftOrderEditor({
  initialYear,
  initialSlots,
}: DraftOrderEditorProps) {
  const [year, setYear] = useState(initialYear);
  const [slots, setSlots] = useState<DraftSlot[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  const slotsByRound = useMemo(() => {
    const grouped = new Map<number, DraftSlot[]>();
    for (const slot of slots) {
      const arr = grouped.get(slot.round) ?? [];
      arr.push(slot);
      grouped.set(slot.round, arr);
    }
    return grouped;
  }, [slots]);

  const loadYear = async (y: number) => {
    setYear(y);
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/draft-order?year=${y}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load draft order.' });
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = () => {
    setSlots(generateDefaultOrder());
    setMessage({
      type: 'success',
      text: 'Generated default 7-round order. Assign teams and save.',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/draft-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, slots }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: 'Draft order saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Save failed'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTeamChange = (
    overall: number,
    newTeam: TeamAbbreviation,
    isOverride: boolean,
  ) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.overall !== overall) return s;
        if (isOverride) {
          return {
            ...s,
            teamOverride: newTeam === s.team ? undefined : newTeam,
          };
        }
        return { ...s, team: newTeam };
      }),
    );
    setEditingSlot(null);
  };

  const clearOverride = (overall: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.overall === overall ? { ...s, teamOverride: undefined } : s,
      ),
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Year:</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v) setYear(v);
            }}
            className="w-24"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadYear(year)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleSeed}>
          Seed Default Order
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || slots.length === 0}
          size="sm"
        >
          {saving ? 'Saving...' : 'Save All'}
        </Button>
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

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No draft order for {year}. Click &quot;Seed Default Order&quot; to
              generate a 7-round template, or change the year and load.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(slotsByRound.entries())
          .sort(([a], [b]) => a - b)
          .map(([round, roundSlots]) => (
            <Card key={round}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Round {round}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="w-16 pb-2 pr-2">#</th>
                        <th className="w-16 pb-2 pr-2">Pick</th>
                        <th className="pb-2 pr-2">Original Team</th>
                        <th className="pb-2">Traded To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundSlots
                        .sort((a, b) => a.pick - b.pick)
                        .map((slot) => (
                          <tr
                            key={slot.overall}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">
                              {slot.overall}
                            </td>
                            <td className="py-1.5 pr-2 font-mono text-xs">
                              {slot.round}.{String(slot.pick).padStart(2, '0')}
                            </td>
                            <td className="py-1.5 pr-2">
                              {editingSlot === slot.overall ? (
                                <Select
                                  value={slot.team}
                                  onChange={(e) =>
                                    handleTeamChange(
                                      slot.overall,
                                      e.target.value as TeamAbbreviation,
                                      false,
                                    )
                                  }
                                  onBlur={() => setEditingSlot(null)}
                                  autoFocus
                                  className="text-xs"
                                >
                                  {ALL_TEAMS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                <button
                                  className="rounded px-1 py-0.5 text-xs font-medium hover:bg-muted"
                                  onClick={() => setEditingSlot(slot.overall)}
                                >
                                  {slot.team}
                                </button>
                              )}
                            </td>
                            <td className="py-1.5">
                              {slot.teamOverride ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {slot.teamOverride}
                                  </Badge>
                                  <button
                                    onClick={() => clearOverride(slot.overall)}
                                    className="text-xs text-destructive hover:underline"
                                  >
                                    clear
                                  </button>
                                </div>
                              ) : (
                                <Select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleTeamChange(
                                        slot.overall,
                                        e.target.value as TeamAbbreviation,
                                        true,
                                      );
                                    }
                                  }}
                                  className="text-xs text-muted-foreground"
                                >
                                  <option value="">— no trade —</option>
                                  {ALL_TEAMS.filter((t) => t !== slot.team).map(
                                    (t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    ),
                                  )}
                                </Select>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
}
