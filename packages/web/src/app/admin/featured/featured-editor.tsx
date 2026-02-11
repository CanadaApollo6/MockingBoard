'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/validate';

interface PlayerOption {
  id: string;
  name: string;
  position: string;
  school: string;
}

interface FeaturedEditorProps {
  initialProspect: { playerId: string; overrideUntil: number } | null;
  initialDraft: { draftId: string; overrideUntil: number } | null;
  players: PlayerOption[];
}

function toDateInputValue(ms: number | undefined): string {
  if (!ms) return '';
  return new Date(ms).toISOString().slice(0, 10);
}

function fromDateInput(val: string): number {
  if (!val) return 0;
  return new Date(val + 'T23:59:59').getTime();
}

export function FeaturedEditor({
  initialProspect,
  initialDraft,
  players,
}: FeaturedEditorProps) {
  const [prospectId, setProspectId] = useState(initialProspect?.playerId ?? '');
  const [prospectUntil, setProspectUntil] = useState(
    toDateInputValue(initialProspect?.overrideUntil),
  );
  const [draftId, setDraftId] = useState(initialDraft?.draftId ?? '');
  const [draftUntil, setDraftUntil] = useState(
    toDateInputValue(initialDraft?.overrideUntil),
  );
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredPlayers =
    search.length >= 2
      ? players.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.position.toLowerCase().includes(search.toLowerCase()),
        )
      : [];

  const selectedPlayer = players.find((p) => p.id === prospectId);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {};
      if (prospectId && prospectUntil) {
        body.prospectOfTheDay = {
          playerId: prospectId,
          overrideUntil: fromDateInput(prospectUntil),
        };
      } else {
        body.prospectOfTheDay = null;
      }
      if (draftId && draftUntil) {
        body.draftOfTheWeek = {
          draftId,
          overrideUntil: fromDateInput(draftUntil),
        };
      } else {
        body.draftOfTheWeek = null;
      }

      const res = await fetch('/api/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: 'Featured content saved.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Save failed'),
      });
    } finally {
      setSaving(false);
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

      {/* Prospect of the Day */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Prospect of the Day Override
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Override the daily rotation with a specific prospect. Leave empty to
            use the automatic rotation.
          </p>
          <div className="space-y-3">
            {selectedPlayer ? (
              <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                <span className="font-medium">{selectedPlayer.name}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedPlayer.position} — {selectedPlayer.school}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProspectId('')}
                  className="ml-auto text-xs text-destructive"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <div>
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search prospects..."
                  className="w-full"
                />
                {filteredPlayers.length > 0 && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-md border">
                    {filteredPlayers.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setProspectId(p.id);
                          setSearch('');
                        }}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.position} — {p.school}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Override until:</label>
              <Input
                type="date"
                value={prospectUntil}
                onChange={(e) => setProspectUntil(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draft of the Week */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Mock Draft of the Week Override
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Override with a specific draft ID. Leave empty to use the most
            recent completed public draft.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-20 text-sm font-medium">Draft ID:</label>
              <Input
                type="text"
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                placeholder="Enter draft document ID"
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-20 text-sm font-medium">Until:</label>
              <Input
                type="date"
                value={draftUntil}
                onChange={(e) => setDraftUntil(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save Featured Content'}
        </Button>
      </div>
    </div>
  );
}
