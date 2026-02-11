'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { Check, Minus, Clock } from 'lucide-react';
import type { DraftResultPick } from '@mockingboard/shared';
import type { PickScore } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const DRAFT_START = new Date('2026-04-23T20:00:00-04:00').getTime();

type Mode = 'countdown' | 'live' | 'complete';

interface DraftDayConfig {
  mode: Mode;
  currentPick: number;
  clockExpiresAt: string | null;
}

interface UserPrediction {
  draftId: string;
  draftName: string;
  pickScores: PickScore[];
  percentage: number;
}

interface DraftDayClientProps {
  year: number;
  initialConfig: DraftDayConfig;
  initialResults: DraftResultPick[];
  prediction: UserPrediction | null;
}

export function DraftDayClient({
  year,
  initialConfig,
  initialResults,
  prediction,
}: DraftDayClientProps) {
  const [config, setConfig] = useState<DraftDayConfig>(initialConfig);
  const [results, setResults] = useState<DraftResultPick[]>(initialResults);

  // Real-time listener for config/draftDay
  useEffect(() => {
    const unsub = onSnapshot(
      doc(getClientDb(), 'config', 'draftDay'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setConfig({
          mode: (data.mode as Mode) ?? 'countdown',
          currentPick: (data.currentPick as number) ?? 0,
          clockExpiresAt:
            data.clockExpiresAt instanceof Timestamp
              ? data.clockExpiresAt.toDate().toISOString()
              : null,
        });
      },
    );
    return unsub;
  }, []);

  // Real-time listener for draftResults/{year}
  useEffect(() => {
    const unsub = onSnapshot(
      doc(getClientDb(), 'draftResults', `${year}`),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setResults((data.picks as DraftResultPick[]) ?? []);
      },
    );
    return unsub;
  }, [year]);

  if (config.mode === 'countdown') {
    return <CountdownView year={year} />;
  }

  if (config.mode === 'complete') {
    return (
      <CompleteView year={year} results={results} prediction={prediction} />
    );
  }

  return (
    <LiveView
      year={year}
      config={config}
      results={results}
      prediction={prediction}
    />
  );
}

// ─── Countdown Mode ──────────────────────────────────────────────────

function CountdownView({ year }: { year: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, DRAFT_START - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return (
    <div className="flex items-start justify-center">
      <div className="relative min-h-[calc(100vh-9rem)] w-full overflow-hidden rounded-xl border shadow-lg">
        {/* Background image */}
        <img
          src="/pittsburgh.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Content */}
        <div className="relative flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-6 py-16 text-center text-white">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight sm:text-5xl">
            {year} NFL Draft
          </h1>
          <p className="mt-2 text-white/70">
            April 23, 2026 &middot; 8:00 PM ET
          </p>

          {diff > 0 ? (
            <div className="mt-10 grid grid-cols-4 gap-4 sm:gap-6">
              <TimeBlock value={days} label="Days" />
              <TimeBlock value={hours} label="Hours" />
              <TimeBlock value={minutes} label="Minutes" />
              <TimeBlock value={seconds} label="Seconds" />
            </div>
          ) : (
            <p className="mt-10 text-xl font-semibold">
              The draft has started!
            </p>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/drafts">
              <Button>Create Mock Draft</Button>
            </Link>
            <Link href="/companion">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                View Companion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-5 backdrop-blur-sm sm:px-6">
      <p className="font-mono text-4xl font-bold tabular-nums text-white sm:text-5xl">
        {String(value).padStart(2, '0')}
      </p>
      <p className="mt-1 text-xs text-white/60">{label}</p>
    </div>
  );
}

// ─── Live Mode ───────────────────────────────────────────────────────

function LiveView({
  year,
  config,
  results,
  prediction,
}: {
  year: number;
  config: DraftDayConfig;
  results: DraftResultPick[];
  prediction: UserPrediction | null;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
          {year} NFL Draft — Live
        </h1>
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mb-success opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-mb-success" />
        </span>
      </div>

      {/* Pick clock */}
      <PickClock config={config} results={results} />

      {/* Two column: feed + prediction */}
      <div className={cn('mt-6 grid gap-6', prediction && 'lg:grid-cols-2')}>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Picks</h2>
          <PickFeed results={results} />
        </div>

        {prediction && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Predictions</h2>
              <span className="font-mono text-sm font-medium">
                {prediction.percentage}% accuracy
              </span>
            </div>
            <PredictionComparison
              results={results}
              pickScores={prediction.pickScores}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PickClock({
  config,
  results,
}: {
  config: DraftDayConfig;
  results: DraftResultPick[];
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!config.clockExpiresAt) {
      setRemaining(null);
      return;
    }
    const expiresAt = new Date(config.clockExpiresAt).getTime();

    function tick() {
      setRemaining(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config.clockExpiresAt]);

  // Find team on the clock
  const currentResult = results.find((r) => r.overall === config.currentPick);
  const nextPick = config.currentPick;
  const round =
    nextPick <= 32 ? 1 : nextPick <= 64 ? 2 : Math.ceil(nextPick / 32);

  const urgency =
    remaining === null
      ? 'idle'
      : remaining <= 10
        ? 'critical'
        : remaining <= 30
          ? 'warning'
          : 'normal';

  const formatClock = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (!nextPick) return null;

  return (
    <div
      className={cn(
        'rounded-lg border p-5 transition-colors',
        urgency === 'critical' && 'border-mb-danger/50 bg-mb-danger/5',
        urgency === 'warning' && 'border-mb-warning/50 bg-mb-warning/5',
        urgency === 'normal' && 'bg-card',
        urgency === 'idle' && 'bg-card',
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Round {round} &middot; Pick #{nextPick}
          </p>
          <p className="text-lg font-semibold">
            {currentResult
              ? `${currentResult.playerName} picked`
              : 'On the Clock'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span
            className={cn(
              'font-mono text-3xl font-bold tabular-nums',
              urgency === 'critical' && 'text-mb-danger',
              urgency === 'warning' && 'text-mb-warning',
            )}
          >
            {remaining !== null ? formatClock(remaining) : '--:--'}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {results.length} pick{results.length !== 1 ? 's' : ''} in
      </p>
    </div>
  );
}

function PickFeed({ results }: { results: DraftResultPick[] }) {
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.overall - a.overall),
    [results],
  );

  if (results.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Waiting for the first pick...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="max-h-[600px] overflow-y-auto">
        {sortedResults.map((pick, i) => (
          <div
            key={pick.overall}
            className={cn(
              'flex items-center gap-3 border-b px-4 py-3 last:border-b-0',
              i === 0 && 'bg-mb-accent/5',
            )}
          >
            <span className="w-10 font-mono text-sm text-muted-foreground">
              #{pick.overall}
            </span>
            <span className="w-12 text-xs font-medium uppercase text-muted-foreground">
              {pick.team}
            </span>
            <span className="flex-1 font-medium">{pick.playerName}</span>
            <span className="text-sm text-muted-foreground">
              {pick.position}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionComparison({
  results,
  pickScores,
}: {
  results: DraftResultPick[];
  pickScores: PickScore[];
}) {
  // Only show picks that have actual results
  const scoredPicks = pickScores.filter((ps) =>
    results.some((r) => r.overall === ps.overall),
  );

  if (scoredPicks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Scores will appear as picks are made.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="max-h-[600px] overflow-y-auto">
        {scoredPicks.map((ps) => (
          <div
            key={ps.overall}
            className={cn(
              'flex items-center gap-3 border-b px-4 py-3 last:border-b-0',
              ps.playerMatch
                ? 'bg-mb-success/10'
                : ps.teamMatch
                  ? 'bg-mb-warning/5'
                  : '',
            )}
          >
            <span className="w-10 font-mono text-sm text-muted-foreground">
              #{ps.overall}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{ps.playerPicked}</p>
              <p className="text-xs text-muted-foreground">
                Actual: {ps.actualPlayer}
              </p>
            </div>
            <div className="flex gap-2">
              <MatchIcon match={ps.teamMatch} title="Team" />
              <MatchIcon match={ps.playerMatch} title="Player" />
              <MatchIcon match={ps.positionMatch} title="Position" />
            </div>
            <span className="w-10 text-right font-mono text-sm font-semibold">
              {ps.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Complete Mode ───────────────────────────────────────────────────

function CompleteView({
  year,
  results,
  prediction,
}: {
  year: number;
  results: DraftResultPick[];
  prediction: UserPrediction | null;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight">
        {year} NFL Draft Complete
      </h1>
      <p className="mt-2 text-muted-foreground">{results.length} picks made</p>

      {prediction && (
        <div className="mt-6 rounded-lg border bg-card px-6 py-4">
          <p className="text-sm text-muted-foreground">Your Accuracy</p>
          <p className="font-mono text-4xl font-bold">
            {prediction.percentage}%
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/companion">
          <Button>View Full Scoring</Button>
        </Link>
        <Link href="/leaderboard">
          <Button variant="outline">Leaderboard</Button>
        </Link>
      </div>

      {results.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <h2 className="mb-3 text-left text-lg font-semibold">All Picks</h2>
          <PickFeed results={results} />
        </div>
      )}
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────

function MatchIcon({ match, title }: { match: boolean; title: string }) {
  return match ? (
    <span title={title}>
      <Check className="h-4 w-4 text-mb-success" />
    </span>
  ) : (
    <span title={title}>
      <Minus className="h-4 w-4 text-muted-foreground/40" />
    </span>
  );
}
