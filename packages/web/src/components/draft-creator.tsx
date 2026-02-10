'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teams, type TeamSeed } from '@mockingboard/shared';
import type {
  TeamAbbreviation,
  DraftFormat,
  DraftVisibility,
  TeamAssignmentMode,
  CpuSpeed,
  NotificationLevel,
} from '@mockingboard/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/validate';

const CONFERENCES = ['AFC', 'NFC'] as const;
const DIVISIONS = ['East', 'North', 'South', 'West'] as const;

const teamsByGroup: Record<string, TeamSeed[]> = {};
for (const team of teams) {
  const key = `${team.conference} ${team.division}`;
  if (!teamsByGroup[key]) teamsByGroup[key] = [];
  teamsByGroup[key].push(team);
}

export function DraftCreator({ defaultYear = 2026 }: { defaultYear?: number }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const isGuest = !user;
  const [multiplayer, setMultiplayer] = useState(false);
  const [visibility, setVisibility] = useState<DraftVisibility>('public');
  const [teamAssignmentMode, setTeamAssignmentMode] =
    useState<TeamAssignmentMode>('choice');
  const [year, setYear] = useState(defaultYear);
  const [rounds, setRounds] = useState(3);
  const [format, setFormat] = useState<DraftFormat>('single-team');
  const [selectedTeams, setSelectedTeams] = useState<Set<TeamAbbreviation>>(
    new Set(),
  );
  const [cpuSpeed, setCpuSpeed] = useState<CpuSpeed>('normal');
  const [cpuRandomness, setCpuRandomness] = useState(50);
  const [cpuNeedsWeight, setCpuNeedsWeight] = useState(50);
  const [secondsPerPick, setSecondsPerPick] = useState(0);
  const [tradesEnabled, setTradesEnabled] = useState(false);
  const [notificationLevel, setNotificationLevel] =
    useState<NotificationLevel>('off');
  const [useMyBoard, setUseMyBoard] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For multiplayer, format is always 'full' and team selection is required
  const effectiveFormat = multiplayer ? 'full' : format;
  const needsTeamSelect = multiplayer || effectiveFormat !== 'full';
  const hasCpuPicks = effectiveFormat !== 'full' || multiplayer;
  const isMultiTeam = effectiveFormat === 'multi-team';

  const selectedTeam = selectedTeams.size === 1 ? [...selectedTeams][0] : null;
  const selectedTeamData = selectedTeam
    ? teams.find((t) => t.id === selectedTeam)
    : null;

  const isTeamValid = isMultiTeam
    ? selectedTeams.size >= 2
    : selectedTeams.size >= 1;

  function handleFormatChange(newFormat: DraftFormat) {
    setFormat(newFormat);
    if (newFormat === 'single-team' && selectedTeams.size > 1) {
      setSelectedTeams(new Set());
    }
  }

  function handleTeamClick(teamId: TeamAbbreviation) {
    if (isMultiTeam) {
      setSelectedTeams((prev) => {
        const next = new Set(prev);
        if (next.has(teamId)) next.delete(teamId);
        else next.add(teamId);
        return next;
      });
    } else {
      setSelectedTeams(new Set([teamId]));
    }
  }

  async function handleBoardToggle(enabled: boolean) {
    setUseMyBoard(enabled);
    if (!enabled) {
      setBoardId(null);
      return;
    }
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/boards/mine?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setBoardId(data.boardId ?? null);
        if (!data.boardId) {
          setUseMyBoard(false);
          setError(
            'No board found for this year. Create one in the Board Builder first.',
          );
        }
      } else {
        setUseMyBoard(false);
      }
    } catch {
      setUseMyBoard(false);
    } finally {
      setBoardLoading(false);
    }
  }

  async function handleSubmit() {
    if (needsTeamSelect && !isTeamValid) {
      setError(
        isMultiTeam ? 'Please select at least 2 teams' : 'Please select a team',
      );
      return;
    }

    if (isGuest && !multiplayer) {
      const params = new URLSearchParams({
        year: String(year),
        rounds: String(rounds),
        format: effectiveFormat,
        cpuSpeed,
        secondsPerPick: String(secondsPerPick),
        trades: String(tradesEnabled),
        cpuRandomness: String(cpuRandomness),
        cpuNeedsWeight: String(cpuNeedsWeight),
      });
      if (isMultiTeam) {
        params.set('teams', [...selectedTeams].join(','));
      } else if (selectedTeam) {
        params.set('team', selectedTeam);
      }
      router.push(`/drafts/guest?${params}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          rounds,
          format: effectiveFormat,
          selectedTeam,
          selectedTeams: isMultiTeam ? [...selectedTeams] : undefined,
          cpuSpeed,
          cpuRandomness,
          cpuNeedsWeight,
          secondsPerPick,
          tradesEnabled,
          notificationLevel,
          multiplayer,
          ...(multiplayer && { visibility, teamAssignmentMode }),
          ...(boardId && { boardId }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create draft');
      }

      const { draftId } = await res.json();
      router.push(`/drafts/${draftId}/live`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Draft Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <OptionGroup label="Draft Year">
            {[defaultYear - 1, defaultYear].map((y) => (
              <Button
                key={y}
                variant={year === y ? 'default' : 'outline'}
                size="sm"
                onClick={() => setYear(y)}
              >
                {y}
              </Button>
            ))}
          </OptionGroup>

          {!isGuest && (
            <OptionGroup label="Mode">
              <Button
                variant={!multiplayer ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMultiplayer(false)}
              >
                Solo
              </Button>
              <Button
                variant={multiplayer ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMultiplayer(true)}
              >
                Multiplayer
              </Button>
            </OptionGroup>
          )}

          {multiplayer && (
            <>
              <OptionGroup label="Visibility">
                <Button
                  variant={visibility === 'public' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisibility('public')}
                >
                  Public
                </Button>
                <Button
                  variant={visibility === 'unlisted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisibility('unlisted')}
                >
                  Unlisted
                </Button>
                <Button
                  variant={visibility === 'private' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisibility('private')}
                >
                  Private
                </Button>
              </OptionGroup>

              <OptionGroup
                label="Team Assignment"
                subtitle="How players pick teams"
              >
                <Button
                  variant={
                    teamAssignmentMode === 'choice' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setTeamAssignmentMode('choice')}
                >
                  Player Choice
                </Button>
                <Button
                  variant={
                    teamAssignmentMode === 'random' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setTeamAssignmentMode('random')}
                >
                  Random
                </Button>
              </OptionGroup>
            </>
          )}

          <OptionGroup label="Rounds">
            {[1, 2, 3, 4, 5, 6, 7].map((r) => (
              <Button
                key={r}
                variant={rounds === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRounds(r)}
              >
                {r}
              </Button>
            ))}
          </OptionGroup>

          {!multiplayer && (
            <OptionGroup label="Format">
              <Button
                variant={format === 'single-team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('single-team')}
              >
                Single Team
              </Button>
              <Button
                variant={format === 'multi-team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('multi-team')}
              >
                Multi-Team
              </Button>
              <Button
                variant={format === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('full')}
              >
                All Teams
              </Button>
            </OptionGroup>
          )}

          <OptionGroup label="CPU Speed">
            <Button
              variant={cpuSpeed === 'instant' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCpuSpeed('instant')}
            >
              Instant
            </Button>
            <Button
              variant={cpuSpeed === 'fast' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCpuSpeed('fast')}
            >
              Fast
            </Button>
            <Button
              variant={cpuSpeed === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCpuSpeed('normal')}
            >
              Normal
            </Button>
          </OptionGroup>

          {hasCpuPicks && (
            <>
              <SliderGroup
                label="CPU Randomness"
                subtitle="How unpredictable CPU picks are"
                value={cpuRandomness}
                onChange={setCpuRandomness}
                leftLabel="Predictable"
                rightLabel="Wild"
              />
              <SliderGroup
                label="CPU Draft Strategy"
                subtitle="How CPU teams evaluate players"
                value={cpuNeedsWeight}
                onChange={setCpuNeedsWeight}
                leftLabel="Best Available"
                rightLabel="Team Needs"
              />
              {!isGuest && (
                <OptionGroup
                  label="CPU Pick Order"
                  subtitle="Use your big board rankings for CPU picks"
                >
                  <Button
                    variant={!useMyBoard ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBoardToggle(false)}
                    disabled={boardLoading}
                  >
                    Consensus
                  </Button>
                  <Button
                    variant={useMyBoard ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBoardToggle(true)}
                    disabled={boardLoading}
                  >
                    {boardLoading ? 'Loading...' : 'My Board'}
                  </Button>
                </OptionGroup>
              )}
            </>
          )}

          <OptionGroup label="Pick Timer" subtitle="Auto-pick if time runs out">
            {[
              { value: 0, label: 'Off' },
              { value: 30, label: '30s' },
              { value: 60, label: '1min' },
              { value: 120, label: '2min' },
              { value: 180, label: '3min' },
              { value: 300, label: '5min' },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={secondsPerPick === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSecondsPerPick(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </OptionGroup>

          <OptionGroup label="Trades">
            <Button
              variant={!tradesEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTradesEnabled(false)}
            >
              Off
            </Button>
            <Button
              variant={tradesEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTradesEnabled(true)}
            >
              On
            </Button>
          </OptionGroup>

          {profile?.hasWebhook && !isGuest && (
            <OptionGroup
              label="Discord Notifications"
              subtitle="Send updates to your webhook"
            >
              <Button
                variant={notificationLevel === 'off' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotificationLevel('off')}
              >
                Off
              </Button>
              <Button
                variant={
                  notificationLevel === 'link-only' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setNotificationLevel('link-only')}
              >
                Link Only
              </Button>
              <Button
                variant={notificationLevel === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotificationLevel('full')}
              >
                Pick-by-Pick
              </Button>
            </OptionGroup>
          )}
        </CardContent>
      </Card>

      {needsTeamSelect && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isMultiTeam ? 'Select Your Teams' : 'Select Your Team'}
              {isMultiTeam && selectedTeams.size > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {selectedTeams.size} selected
                </span>
              )}
              {!isMultiTeam && selectedTeamData && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {selectedTeamData.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {CONFERENCES.map((conf) => (
                <div key={conf}>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                    {conf}
                  </h3>
                  {DIVISIONS.map((div) => (
                    <div key={div} className="mb-3">
                      <p className="mb-1.5 text-xs text-muted-foreground">
                        {div}
                      </p>
                      <div className="flex gap-1.5">
                        {teamsByGroup[`${conf} ${div}`]?.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => handleTeamClick(team.id)}
                            className={cn(
                              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                              selectedTeams.has(team.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                          >
                            {team.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isGuest && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <Link
            href="/auth"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>{' '}
          to save your draft history and access your picks later.
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || (needsTeamSelect && !isTeamValid)}
      >
        {submitting
          ? 'Creating...'
          : multiplayer
            ? 'Create Lobby'
            : isGuest
              ? 'Start Guest Draft'
              : 'Start Draft'}
      </Button>
    </div>
  );
}

function OptionGroup({
  label,
  subtitle,
  children,
}: {
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
        {subtitle && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            {subtitle}
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SliderGroup({
  label,
  subtitle,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  subtitle?: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
        {subtitle && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            {subtitle}
          </span>
        )}
      </label>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
