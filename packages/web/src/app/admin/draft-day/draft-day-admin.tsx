'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Pause, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Mode = 'countdown' | 'live' | 'complete';

interface DraftDayAdminProps {
  initial: {
    mode: string;
    currentPick: number;
    clockExpiresAt: string | null;
  };
}

export function DraftDayAdmin({ initial }: DraftDayAdminProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial.mode as Mode);
  const [currentPick, setCurrentPick] = useState(initial.currentPick || 1);
  const [clockActive, setClockActive] = useState(!!initial.clockExpiresAt);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleModeChange(newMode: Mode) {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/draft-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      if (!res.ok) throw new Error('Failed to update mode');
      setMode(newMode);
      setMessage(`Mode set to ${newMode}`);
      router.refresh();
    } catch {
      setMessage('Error updating mode');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartClock() {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/draft-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startClock: true, pick: currentPick }),
      });
      if (!res.ok) throw new Error('Failed to start clock');
      const data = await res.json();
      setClockActive(true);
      setMessage(`Clock started for pick #${currentPick} (${data.seconds}s)`);
    } catch {
      setMessage('Error starting clock');
    } finally {
      setLoading(false);
    }
  }

  async function handlePauseClock() {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/draft-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pauseClock: true }),
      });
      if (!res.ok) throw new Error('Failed to pause clock');
      setClockActive(false);
      setMessage('Clock paused');
    } catch {
      setMessage('Error pausing clock');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">Page Mode</h2>
        <div className="flex gap-2">
          {(['countdown', 'live', 'complete'] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              disabled={loading}
              onClick={() => handleModeChange(m)}
              className={cn('capitalize', mode === m && 'pointer-events-none')}
            >
              {m}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {mode === 'countdown' &&
            'Visitors see a countdown timer to draft night.'}
          {mode === 'live' &&
            'Visitors see live picks, pick clock, and prediction comparisons.'}
          {mode === 'complete' && 'Visitors see a completed draft summary.'}
        </p>
      </div>

      {/* Clock controls — only in live mode */}
      {mode === 'live' && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 font-semibold">Pick Clock</h2>
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Current Pick #
              </label>
              <input
                type="number"
                min={1}
                max={262}
                value={currentPick}
                onChange={(e) => setCurrentPick(Number(e.target.value))}
                className="w-24 rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              size="sm"
              disabled={loading}
              onClick={handleStartClock}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start Clock
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || !clockActive}
              onClick={handlePauseClock}
              className="gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Round 1: 10 min &middot; Round 2: 7 min &middot; Rounds 3-7: 5 min
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/draft-results">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Enter Draft Results
            </Button>
          </Link>
          <Link href="/draft-day" target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              View Draft Day Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Status message */}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
