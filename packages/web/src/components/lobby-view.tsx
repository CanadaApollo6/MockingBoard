'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { teams, type TeamSeed } from '@mockingboard/shared';
import type { Draft, TeamAbbreviation } from '@mockingboard/shared';
import { useLiveDraft } from '@/hooks/use-live-draft';
import { useAuth } from '@/components/auth-provider';
import { GuestJoinModal } from '@/components/guest-join-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDraftDisplayName } from '@/lib/format';
import { cn } from '@/lib/utils';

const CONFERENCES = ['AFC', 'NFC'] as const;
const DIVISIONS = ['East', 'North', 'South', 'West'] as const;

const teamsByGroup: Record<string, TeamSeed[]> = {};
for (const team of teams) {
  const key = `${team.conference} ${team.division}`;
  if (!teamsByGroup[key]) teamsByGroup[key] = [];
  teamsByGroup[key].push(team);
}

const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));

interface LobbyViewProps {
  draftId: string;
  initialDraft: Draft;
  userId: string | null;
  isCreator: boolean;
  inviteCode?: string;
}

export function LobbyView({
  draftId,
  initialDraft,
  userId,
  isCreator,
  inviteCode,
}: LobbyViewProps) {
  const router = useRouter();
  const { draft } = useLiveDraft(draftId, initialDraft, []);
  const { user } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isParticipant = useMemo(
    () => (userId && draft?.participants[userId]) || false,
    [userId, draft],
  );

  const participantList = useMemo(() => {
    if (!draft?.participantNames) return [];
    return Object.entries(draft.participantNames).map(([uid, name]) => {
      const team = Object.entries(draft.teamAssignments).find(
        ([, assignedUid]) => assignedUid === uid,
      );
      return {
        uid,
        name,
        team: team ? (team[0] as TeamAbbreviation) : null,
        isCreator: uid === draft.createdBy,
      };
    });
  }, [draft]);

  const takenTeams = useMemo(() => {
    if (!draft) return new Set<string>();
    return new Set(
      Object.entries(draft.teamAssignments)
        .filter(([, uid]) => uid !== null)
        .map(([team]) => team),
    );
  }, [draft]);

  const handleJoin = useCallback(
    async (team?: TeamAbbreviation) => {
      setJoining(true);
      setError(null);
      try {
        const res = await fetch(`/api/drafts/${draftId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team, inviteCode }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to join');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join');
      } finally {
        setJoining(false);
      }
    },
    [draftId, inviteCode],
  );

  const handleStart = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}/start`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStarting(false);
    }
  }, [draftId]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      router.push('/drafts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }, [draftId, router]);

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}/leave`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to leave');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave');
    } finally {
      setLeaving(false);
    }
  }, [draftId]);

  const handleCopyLink = useCallback(() => {
    const url = new URL(window.location.href);
    if (draft?.inviteCode) {
      url.searchParams.set('invite', draft.inviteCode);
    }
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [draft]);

  if (!draft) {
    return (
      <p className="py-8 text-center text-muted-foreground">Draft not found.</p>
    );
  }

  const isChoiceMode = draft.config.teamAssignmentMode === 'choice';
  const canJoin = !isParticipant && !joining;

  return (
    <div className="space-y-6">
      {/* Settings Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{getDraftDisplayName(draft)} Lobby</CardTitle>
            <Badge variant="secondary">
              {draft.visibility === 'private'
                ? 'Private'
                : draft.visibility === 'unlisted'
                  ? 'Unlisted'
                  : 'Public'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>{draft.config.rounds} rounds</span>
            <span>CPU: {draft.config.cpuSpeed}</span>
            {draft.config.secondsPerPick > 0 && (
              <span>Timer: {draft.config.secondsPerPick}s</span>
            )}
            <span>Trades: {draft.config.tradesEnabled ? 'On' : 'Off'}</span>
            <span>
              Teams: {isChoiceMode ? 'Player choice' : 'Random assignment'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Players ({participantList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {participantList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No players yet. Be the first to join!
            </p>
          ) : (
            <div className="space-y-2">
              {participantList.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.isCreator && (
                      <Badge variant="outline" className="text-xs">
                        Host
                      </Badge>
                    )}
                  </div>
                  {p.team && (
                    <span className="text-sm text-muted-foreground">
                      {teamNameMap.get(p.team) ?? p.team}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Selection (choice mode, not yet joined) */}
      {isChoiceMode && canJoin && (
        <Card>
          <CardHeader>
            <CardTitle>Pick Your Team</CardTitle>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in or join as a guest to pick a team.
                </p>
                <Button onClick={() => setShowGuestModal(true)}>
                  Join as Guest
                </Button>
              </div>
            ) : (
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
                          {teamsByGroup[`${conf} ${div}`]?.map((team) => {
                            const taken = takenTeams.has(team.id);
                            return (
                              <button
                                key={team.id}
                                type="button"
                                onClick={() => handleJoin(team.id)}
                                disabled={taken || joining}
                                className={cn(
                                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                                  taken
                                    ? 'cursor-not-allowed bg-muted/50 text-muted-foreground/40 line-through'
                                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                              >
                                {team.id}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Random mode join button */}
      {!isChoiceMode && canJoin && (
        <Card>
          <CardContent className="pt-6">
            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in or join as a guest to enter the draft.
                </p>
                <Button onClick={() => setShowGuestModal(true)}>
                  Join as Guest
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleJoin()} disabled={joining}>
                {joining ? 'Joining...' : 'Join Draft'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isCreator && (
          <>
            <Button
              onClick={handleStart}
              disabled={starting || participantList.length < 1}
            >
              {starting ? 'Starting...' : 'Start Draft'}
            </Button>
            {showCancelConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Cancel draft?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Yes'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Draft
              </Button>
            )}
          </>
        )}

        {isParticipant && !isCreator && (
          <Button variant="outline" onClick={handleLeave} disabled={leaving}>
            {leaving ? 'Leaving...' : 'Leave Lobby'}
          </Button>
        )}

        <Button variant="outline" onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </Button>
      </div>

      {/* Guest join modal */}
      {showGuestModal && (
        <GuestJoinModal
          onComplete={() => {
            setShowGuestModal(false);
            // Page will re-render with auth state
            window.location.reload();
          }}
          onCancel={() => setShowGuestModal(false)}
        />
      )}
    </div>
  );
}
