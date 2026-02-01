'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teams, type TeamSeed } from '@mockingboard/shared';
import type {
  TeamAbbreviation,
  DraftFormat,
  CpuSpeed,
} from '@mockingboard/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CONFERENCES = ['AFC', 'NFC'] as const;
const DIVISIONS = ['East', 'North', 'South', 'West'] as const;

const teamsByGroup: Record<string, TeamSeed[]> = {};
for (const team of teams) {
  const key = `${team.conference} ${team.division}`;
  if (!teamsByGroup[key]) teamsByGroup[key] = [];
  teamsByGroup[key].push(team);
}

export function DraftCreator() {
  const router = useRouter();
  const { user } = useAuth();
  const isGuest = !user;
  const [year, setYear] = useState(2026);
  const [rounds, setRounds] = useState(3);
  const [format, setFormat] = useState<DraftFormat>('single-team');
  const [selectedTeam, setSelectedTeam] = useState<TeamAbbreviation | null>(
    null,
  );
  const [cpuSpeed, setCpuSpeed] = useState<CpuSpeed>('normal');
  const [tradesEnabled, setTradesEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeamData = selectedTeam
    ? teams.find((t) => t.id === selectedTeam)
    : null;

  async function handleSubmit() {
    if (format === 'single-team' && !selectedTeam) {
      setError('Please select a team');
      return;
    }

    if (isGuest) {
      const params = new URLSearchParams({
        year: String(year),
        rounds: String(rounds),
        format,
        cpuSpeed,
        trades: String(tradesEnabled),
      });
      if (selectedTeam) params.set('team', selectedTeam);
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
          format,
          selectedTeam,
          cpuSpeed,
          tradesEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create draft');
      }

      const { draftId } = await res.json();
      router.push(`/drafts/${draftId}/live`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
            {[2025, 2026].map((y) => (
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

          <OptionGroup label="Format">
            <Button
              variant={format === 'single-team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('single-team')}
            >
              Single Team
            </Button>
            <Button
              variant={format === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('full')}
            >
              All Teams
            </Button>
          </OptionGroup>

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
        </CardContent>
      </Card>

      {format === 'single-team' && (
        <Card>
          <CardHeader>
            <CardTitle>
              Select Your Team
              {selectedTeamData && (
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
                            onClick={() => setSelectedTeam(team.id)}
                            className={cn(
                              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                              selectedTeam === team.id
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
        disabled={submitting || (format === 'single-team' && !selectedTeam)}
      >
        {submitting
          ? 'Creating Draft...'
          : isGuest
            ? 'Start Guest Draft'
            : 'Start Draft'}
      </Button>
    </div>
  );
}

function OptionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
