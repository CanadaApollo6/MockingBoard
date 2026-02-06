'use client';

import { useState } from 'react';
import type {
  TeamAbbreviation,
  KeyPlayerOverride,
  Coach,
  FrontOfficeStaff,
  FuturePickSeed,
  Position,
} from '@mockingboard/shared';
import { teams } from '@mockingboard/shared';
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

const ALL_POSITIONS: Position[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'OT',
  'OG',
  'C',
  'EDGE',
  'DL',
  'LB',
  'CB',
  'S',
];

const ALL_TEAM_IDS = teams.map((t) => t.id).sort();

interface TeamEditorProps {
  abbreviation: TeamAbbreviation;
  teamName: string;
  currentKeyPlayers: KeyPlayerOverride[];
  currentCoachingStaff: Coach[];
  currentFrontOffice: FrontOfficeStaff[];
  currentNeeds: Position[];
  currentFuturePicks: FuturePickSeed[];
}

// ---- Key Players Section ----

function KeyPlayersEditor({
  abbreviation,
  players,
  setPlayers,
}: {
  abbreviation: TeamAbbreviation;
  players: KeyPlayerOverride[];
  setPlayers: (p: KeyPlayerOverride[]) => void;
}) {
  const handleSelect = (result: PlayerSearchResult) => {
    if (players.length >= 4) return;
    if (players.some((p) => p.gsisId === result.gsisId)) return;

    setPlayers([
      ...players,
      {
        gsisId: result.gsisId,
        name: result.name,
        position: result.position,
        jersey: result.jersey,
        college: result.college,
      },
    ]);
  };

  const handleRemove = (gsisId: string) => {
    setPlayers(players.filter((p) => p.gsisId !== gsisId));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {players.map((player, i) => (
          <div
            key={player.gsisId}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{i + 1}</span>
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
              onClick={() => handleRemove(player.gsisId)}
              className="text-xs text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {players.length < 4 && (
        <PlayerSearchInput
          team={abbreviation}
          onSelect={handleSelect}
          placeholder={`Search ${abbreviation} players... (${4 - players.length} slots remaining)`}
        />
      )}

      {players.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No key players set. Search to add up to 4 featured players.
        </p>
      )}
    </div>
  );
}

// ---- Coaching Staff Section ----

function CoachingStaffEditor({
  coaches,
  setCoaches,
}: {
  coaches: Coach[];
  setCoaches: (c: Coach[]) => void;
}) {
  const handleUpdate = (
    index: number,
    field: keyof Coach,
    value: string | number,
  ) => {
    const updated = [...coaches];
    updated[index] = { ...updated[index], [field]: value };
    setCoaches(updated);
  };

  const handleAdd = () => {
    setCoaches([
      ...coaches,
      { name: '', role: '', since: new Date().getFullYear() },
    ]);
  };

  const handleRemove = (index: number) => {
    setCoaches(coaches.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {coaches.map((coach, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="text"
            value={coach.name}
            onChange={(e) => handleUpdate(i, 'name', e.target.value)}
            placeholder="Name"
            className="flex-1"
          />
          <Select
            value={coach.role}
            onChange={(e) => handleUpdate(i, 'role', e.target.value)}
          >
            <option value="">Select role</option>
            <option value="Head Coach">Head Coach</option>
            <option value="Offensive Coordinator">Offensive Coordinator</option>
            <option value="Defensive Coordinator">Defensive Coordinator</option>
            <option value="Special Teams Coordinator">
              Special Teams Coordinator
            </option>
          </Select>
          <Input
            type="number"
            value={coach.since}
            onChange={(e) =>
              handleUpdate(i, 'since', parseInt(e.target.value) || 0)
            }
            placeholder="Since"
            className="w-20"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(i)}
            className="text-xs text-destructive hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={handleAdd}>
        Add Coach
      </Button>
    </div>
  );
}

// ---- Front Office Section ----

function FrontOfficeEditor({
  staff,
  setStaff,
}: {
  staff: FrontOfficeStaff[];
  setStaff: (s: FrontOfficeStaff[]) => void;
}) {
  const handleUpdate = (
    index: number,
    field: keyof FrontOfficeStaff,
    value: string,
  ) => {
    const updated = [...staff];
    updated[index] = { ...updated[index], [field]: value };
    setStaff(updated);
  };

  const handleAdd = () => {
    setStaff([...staff, { name: '', title: '' }]);
  };

  const handleRemove = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {staff.map((person, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="text"
            value={person.name}
            onChange={(e) => handleUpdate(i, 'name', e.target.value)}
            placeholder="Name"
            className="flex-1"
          />
          <Input
            type="text"
            value={person.title}
            onChange={(e) => handleUpdate(i, 'title', e.target.value)}
            placeholder="Title (e.g., General Manager)"
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(i)}
            className="text-xs text-destructive hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={handleAdd}>
        Add Staff
      </Button>
    </div>
  );
}

// ---- Team Needs Section ----

function NeedsEditor({
  needs,
  setNeeds,
}: {
  needs: Position[];
  setNeeds: (n: Position[]) => void;
}) {
  const available = ALL_POSITIONS.filter((p) => !needs.includes(p));

  const handleAdd = (pos: Position) => {
    setNeeds([...needs, pos]);
  };

  const handleRemove = (index: number) => {
    setNeeds(needs.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...needs];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setNeeds(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === needs.length - 1) return;
    const updated = [...needs];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setNeeds(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Order matters: position #1 is the highest priority need for CPU
        drafting.
      </p>

      <div className="space-y-1">
        {needs.map((pos, i) => (
          <div
            key={pos}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5"
          >
            <span className="w-6 text-right font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <Badge variant="outline" className="text-xs">
              {pos}
            </Badge>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMoveUp(i)}
                disabled={i === 0}
                className="h-6 w-6 p-0 text-xs"
              >
                &uarr;
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMoveDown(i)}
                disabled={i === needs.length - 1}
                className="h-6 w-6 p-0 text-xs"
              >
                &darr;
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(i)}
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              >
                X
              </Button>
            </div>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {available.map((pos) => (
            <Button
              key={pos}
              variant="outline"
              size="sm"
              onClick={() => handleAdd(pos)}
              className="text-xs"
            >
              + {pos}
            </Button>
          ))}
        </div>
      )}

      {needs.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No needs set. Click positions above to add them in priority order.
        </p>
      )}
    </div>
  );
}

// ---- Future Picks Section ----

function FuturePicksEditor({
  picks,
  setPicks,
}: {
  picks: FuturePickSeed[];
  setPicks: (p: FuturePickSeed[]) => void;
}) {
  const currentYear = new Date().getFullYear();
  const futureYears = Array.from({ length: 4 }, (_, i) => currentYear + 1 + i);

  const handleAdd = () => {
    setPicks([
      ...picks,
      {
        year: futureYears[0],
        round: 1,
        originalTeam: ALL_TEAM_IDS[0] as TeamAbbreviation,
      },
    ]);
  };

  const handleUpdate = (
    index: number,
    field: keyof FuturePickSeed,
    value: string | number,
  ) => {
    const updated = [...picks];
    updated[index] = { ...updated[index], [field]: value };
    setPicks(updated);
  };

  const handleRemove = (index: number) => {
    setPicks(picks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Track future draft picks this team owns (or has traded away). Each entry
        represents a pick: the year, round, and which team originally owned it.
      </p>

      {picks.map((pick, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select
            value={pick.year}
            onChange={(e) => handleUpdate(i, 'year', parseInt(e.target.value))}
          >
            {futureYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Select
            value={pick.round}
            onChange={(e) => handleUpdate(i, 'round', parseInt(e.target.value))}
            className="w-20"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((r) => (
              <option key={r} value={r}>
                Rd {r}
              </option>
            ))}
          </Select>
          <Select
            value={pick.originalTeam}
            onChange={(e) => handleUpdate(i, 'originalTeam', e.target.value)}
          >
            {ALL_TEAM_IDS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(i)}
            className="text-xs text-destructive hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={handleAdd}>
        Add Pick
      </Button>

      {picks.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No future picks tracked. Click &quot;Add Pick&quot; to add one.
        </p>
      )}
    </div>
  );
}

// ---- Main Editor ----

export function TeamEditor({
  abbreviation,
  teamName,
  currentKeyPlayers,
  currentCoachingStaff,
  currentFrontOffice,
  currentNeeds,
  currentFuturePicks,
}: TeamEditorProps) {
  const [keyPlayers, setKeyPlayers] =
    useState<KeyPlayerOverride[]>(currentKeyPlayers);
  const [coachingStaff, setCoachingStaff] =
    useState<Coach[]>(currentCoachingStaff);
  const [frontOffice, setFrontOffice] =
    useState<FrontOfficeStaff[]>(currentFrontOffice);
  const [needs, setNeeds] = useState<Position[]>(currentNeeds);
  const [futurePicks, setFuturePicks] =
    useState<FuturePickSeed[]>(currentFuturePicks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const save = async (section: string, data: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/teams/${abbreviation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: `${section} saved successfully.` });
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
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
        {teamName}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{abbreviation}</p>

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

      <Tabs defaultValue="needs">
        <TabsList>
          <TabsTrigger value="needs">Needs ({needs.length})</TabsTrigger>
          <TabsTrigger value="players">
            Key Players ({keyPlayers.length}/4)
          </TabsTrigger>
          <TabsTrigger value="coaches">
            Coaching Staff ({coachingStaff.length})
          </TabsTrigger>
          <TabsTrigger value="frontoffice">
            Front Office ({frontOffice.length})
          </TabsTrigger>
          <TabsTrigger value="futurepicks">
            Future Picks ({futurePicks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Positional Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NeedsEditor needs={needs} setNeeds={setNeeds} />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => save('Team needs', { needs })}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Needs'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Featured Key Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KeyPlayersEditor
                abbreviation={abbreviation}
                players={keyPlayers}
                setPlayers={setKeyPlayers}
              />
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

        <TabsContent value="coaches" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Coaching Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CoachingStaffEditor
                coaches={coachingStaff}
                setCoaches={setCoachingStaff}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => save('Coaching staff', { coachingStaff })}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Coaching Staff'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frontoffice" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Front Office
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FrontOfficeEditor
                staff={frontOffice}
                setStaff={setFrontOffice}
              />
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
        <TabsContent value="futurepicks" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Future Draft Picks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FuturePicksEditor
                picks={futurePicks}
                setPicks={setFuturePicks}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => save('Future picks', { futurePicks })}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Saving...' : 'Save Future Picks'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
