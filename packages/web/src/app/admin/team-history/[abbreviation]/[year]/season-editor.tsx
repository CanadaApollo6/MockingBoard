'use client';

import { useState } from 'react';
import type {
  TeamAbbreviation,
  Position,
  KeyPlayerOverride,
  Coach,
  FrontOfficeStaff,
} from '@mockingboard/shared';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  PlayerSearchInput,
  type PlayerSearchResult,
} from '@/components/player-search-input';

const PLAYOFF_OPTIONS = [
  '',
  'Missed Playoffs',
  'Wild Card Round',
  'Divisional Round',
  'Conference Championship',
  'Super Bowl Runner-Up',
  'Super Bowl Champion',
];

interface SeasonEditorProps {
  abbreviation: string;
  teamName: string;
  year: number;
  initialRecord: { wins: number; losses: number; ties: number } | null;
  initialPlayoffResult: string;
  initialCoachingStaff: Coach[];
  initialFrontOffice: FrontOfficeStaff[];
  initialKeyPlayers: KeyPlayerOverride[];
}

export function SeasonEditor({
  abbreviation,
  teamName,
  year,
  initialRecord,
  initialPlayoffResult,
  initialCoachingStaff,
  initialFrontOffice,
  initialKeyPlayers,
}: SeasonEditorProps) {
  const [record, setRecord] = useState(
    initialRecord ?? { wins: 0, losses: 0, ties: 0 },
  );
  const [playoffResult, setPlayoffResult] = useState(initialPlayoffResult);
  const [coaches, setCoaches] = useState<Coach[]>(initialCoachingStaff);
  const [frontOffice, setFrontOffice] =
    useState<FrontOfficeStaff[]>(initialFrontOffice);
  const [keyPlayers, setKeyPlayers] =
    useState<KeyPlayerOverride[]>(initialKeyPlayers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const save = async (section: string, data: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/team-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: abbreviation, year, ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: `${section} saved.` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  // ---- Coaching Staff handlers ----
  const updateCoach = (
    index: number,
    field: keyof Coach,
    value: string | number,
  ) => {
    const updated = [...coaches];
    updated[index] = { ...updated[index], [field]: value };
    setCoaches(updated);
  };
  const addCoach = () =>
    setCoaches([...coaches, { name: '', role: '', since: year }]);
  const removeCoach = (index: number) =>
    setCoaches(coaches.filter((_, i) => i !== index));

  // ---- Front Office handlers ----
  const updateStaff = (
    index: number,
    field: keyof FrontOfficeStaff,
    value: string,
  ) => {
    const updated = [...frontOffice];
    updated[index] = { ...updated[index], [field]: value };
    setFrontOffice(updated);
  };
  const addStaff = () =>
    setFrontOffice([...frontOffice, { name: '', title: '' }]);
  const removeStaff = (index: number) =>
    setFrontOffice(frontOffice.filter((_, i) => i !== index));

  // ---- Key Players handlers ----
  const handlePlayerSelect = (result: PlayerSearchResult) => {
    if (keyPlayers.length >= 4) return;
    if (keyPlayers.some((p) => p.gsisId === result.gsisId)) return;
    setKeyPlayers([
      ...keyPlayers,
      {
        gsisId: result.gsisId,
        name: result.name,
        position: result.position as Position,
        jersey: result.jersey,
        college: result.college,
      },
    ]);
  };
  const removePlayer = (gsisId: string) =>
    setKeyPlayers(keyPlayers.filter((p) => p.gsisId !== gsisId));

  return (
    <div>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        {teamName}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{year} Season</p>

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

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record">Record</TabsTrigger>
          <TabsTrigger value="coaches">Coaching ({coaches.length})</TabsTrigger>
          <TabsTrigger value="frontoffice">
            Front Office ({frontOffice.length})
          </TabsTrigger>
          <TabsTrigger value="players">
            Key Players ({keyPlayers.length}/4)
          </TabsTrigger>
        </TabsList>

        {/* Record Tab */}
        <TabsContent value="record" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Season Record
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">W</label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={record.wins}
                      onChange={(e) =>
                        setRecord({
                          ...record,
                          wins: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">L</label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={record.losses}
                      onChange={(e) =>
                        setRecord({
                          ...record,
                          losses: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">T</label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={record.ties}
                      onChange={(e) =>
                        setRecord({
                          ...record,
                          ties: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({record.wins}-{record.losses}
                    {record.ties > 0 ? `-${record.ties}` : ''})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Playoff Result</label>
                  <Select
                    value={playoffResult}
                    onChange={(e) => setPlayoffResult(e.target.value)}
                  >
                    {PLAYOFF_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || '(none)'}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => save('Record', { record, playoffResult })}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Record'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coaching Staff Tab */}
        <TabsContent value="coaches" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Coaching Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coaches.map((coach, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={coach.name}
                      onChange={(e) => updateCoach(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Select
                      value={coach.role}
                      onChange={(e) => updateCoach(i, 'role', e.target.value)}
                    >
                      <option value="">Select role</option>
                      <option value="Head Coach">Head Coach</option>
                      <option value="Offensive Coordinator">
                        Offensive Coordinator
                      </option>
                      <option value="Defensive Coordinator">
                        Defensive Coordinator
                      </option>
                      <option value="Special Teams Coordinator">
                        Special Teams Coordinator
                      </option>
                    </Select>
                    <Input
                      type="number"
                      value={coach.since}
                      onChange={(e) =>
                        updateCoach(i, 'since', parseInt(e.target.value) || 0)
                      }
                      placeholder="Since"
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoach(i)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addCoach}>
                  Add Coach
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() =>
                    save('Coaching staff', { coachingStaff: coaches })
                  }
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Coaching Staff'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Front Office Tab */}
        <TabsContent value="frontoffice" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Front Office
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {frontOffice.map((person, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={person.name}
                      onChange={(e) => updateStaff(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      value={person.title}
                      onChange={(e) => updateStaff(i, 'title', e.target.value)}
                      placeholder="Title (e.g., General Manager)"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStaff(i)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addStaff}>
                  Add Staff
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => save('Front office', { frontOffice })}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Front Office'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Key Players Tab */}
        <TabsContent value="players" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Key Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  {keyPlayers.map((player, i) => (
                    <div
                      key={player.gsisId}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium">{player.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {player.position}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{player.jersey}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {player.college}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayer(player.gsisId)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                {keyPlayers.length < 4 && (
                  <PlayerSearchInput
                    team={abbreviation as TeamAbbreviation}
                    onSelect={handlePlayerSelect}
                    placeholder={`Search ${abbreviation} players... (${4 - keyPlayers.length} slots remaining)`}
                  />
                )}

                {keyPlayers.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No key players set. Search to add up to 4.
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => save('Key players', { keyPlayers })}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Key Players'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
