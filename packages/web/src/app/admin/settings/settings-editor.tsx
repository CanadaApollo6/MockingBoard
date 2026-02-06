'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Announcement } from '@/lib/cache';

interface SettingsEditorProps {
  initialDraftYear: number;
  initialStatsYear: number;
  initialAnnouncement: Announcement;
  initialDraftNames: { adjectives: string[]; nouns: string[] };
}

export function SettingsEditor({
  initialDraftYear,
  initialStatsYear,
  initialAnnouncement,
  initialDraftNames,
}: SettingsEditorProps) {
  const [draftYear, setDraftYear] = useState(initialDraftYear);
  const [statsYear, setStatsYear] = useState(initialStatsYear);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Announcement state
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Draft names state
  const [adjectives, setAdjectives] = useState(
    initialDraftNames.adjectives.join('\n'),
  );
  const [nouns, setNouns] = useState(initialDraftNames.nouns.join('\n'));
  const [savingNames, setSavingNames] = useState(false);

  // Cache flush state
  const [flushing, setFlushing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftYear, statsYear }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: 'Season config saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: 'Announcement saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleSaveDraftNames = async () => {
    setSavingNames(true);
    setMessage(null);
    try {
      const parsed = {
        adjectives: adjectives
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        nouns: nouns
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftNames: parsed }),
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: 'Draft names saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSavingNames(false);
    }
  };

  const handleFlush = async () => {
    setFlushing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', { method: 'DELETE' });
      if (!res.ok) throw new Error('Flush failed');
      setMessage({ type: 'success', text: 'All caches flushed.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Flush failed',
      });
    } finally {
      setFlushing(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Season Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Season Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm font-medium">Draft Year</label>
              <Input
                type="number"
                value={draftYear}
                onChange={(e) => setDraftYear(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                The upcoming draft class year (e.g. 2026)
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-32 text-sm font-medium">Stats Year</label>
              <Input
                type="number"
                value={statsYear}
                onChange={(e) => setStatsYear(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                The NFL season for player stats and rosters (e.g. 2025)
              </span>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save Config'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcement Banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Announcement Banner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm font-medium">Active</label>
              <button
                type="button"
                role="switch"
                aria-checked={announcement.active}
                onClick={() =>
                  setAnnouncement((a) => ({ ...a, active: !a.active }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  announcement.active ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    announcement.active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-32 text-sm font-medium">Variant</label>
              <Select
                value={announcement.variant}
                onChange={(e) =>
                  setAnnouncement((a) => ({
                    ...a,
                    variant: e.target.value as 'info' | 'warning' | 'success',
                  }))
                }
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="success">Success (Green)</option>
              </Select>
            </div>

            <div className="flex items-start gap-4">
              <label className="w-32 pt-1.5 text-sm font-medium">Text</label>
              <Textarea
                value={announcement.text}
                onChange={(e) =>
                  setAnnouncement((a) => ({ ...a, text: e.target.value }))
                }
                rows={3}
                placeholder="Enter announcement text..."
                className="flex-1"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveAnnouncement}
                disabled={savingAnnouncement}
                size="sm"
              >
                {savingAnnouncement ? 'Saving...' : 'Save Announcement'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draft Names */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Draft Name Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Customize the adjectives and nouns used to generate random draft
            names. One word per line. Leave empty to use built-in defaults.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Adjectives
              </label>
              <Textarea
                value={adjectives}
                onChange={(e) => setAdjectives(e.target.value)}
                rows={8}
                placeholder="Iron\nPhantom\nThunder\n..."
                className="w-full font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nouns</label>
              <Textarea
                value={nouns}
                onChange={(e) => setNouns(e.target.value)}
                rows={8}
                placeholder="Blitz\nDrive\nRush\n..."
                className="w-full font-mono text-xs"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSaveDraftNames}
              disabled={savingNames}
              size="sm"
            >
              {savingNames ? 'Saving...' : 'Save Draft Names'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Cache Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Flush all server-side caches. This forces fresh data to be loaded
            from Firestore on the next request. Use this after making direct
            database changes or if data appears stale.
          </p>
          <Button
            onClick={handleFlush}
            disabled={flushing}
            variant="destructive"
            size="sm"
          >
            {flushing ? 'Flushing...' : 'Flush All Caches'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
