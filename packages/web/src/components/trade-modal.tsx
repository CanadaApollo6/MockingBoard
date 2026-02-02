'use client';

import { useState, useMemo } from 'react';
import type {
  Draft,
  DraftSlot,
  FutureDraftPick,
  TradePiece,
  TeamAbbreviation,
} from '@mockingboard/shared';
import {
  getAvailableCurrentPicks,
  getAvailableFuturePicks,
  getTeamFuturePicks,
  getPickValue,
  getFuturePickValue,
} from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTeamName } from '@/lib/teams';
import { cn } from '@/lib/utils';

interface TradeModalProps {
  draft: Draft;
  userId: string;
  onSubmit: (
    recipientTeam: TeamAbbreviation,
    giving: TradePiece[],
    receiving: TradePiece[],
  ) => void;
  onCancel: () => void;
  disabled: boolean;
}

function getTeamUnmadePicks(draft: Draft, team: TeamAbbreviation): DraftSlot[] {
  return draft.pickOrder.filter(
    (slot) =>
      slot.overall >= draft.currentPick &&
      slot.team === team &&
      slot.ownerOverride === undefined,
  );
}

function currentPickKey(slot: DraftSlot): string {
  return `current-${slot.overall}`;
}

function futurePickKey(fp: FutureDraftPick): string {
  return `future-${fp.year}-${fp.round}-${fp.originalTeam}`;
}

export function TradeModal({
  draft,
  userId,
  onSubmit,
  onCancel,
  disabled,
}: TradeModalProps) {
  const [targetTeam, setTargetTeam] = useState<TeamAbbreviation | null>(null);
  const [selectedGiving, setSelectedGiving] = useState<Set<string>>(new Set());
  const [selectedReceiving, setSelectedReceiving] = useState<Set<string>>(
    new Set(),
  );

  const { userTeams, cpuTeams } = useMemo(() => {
    const user: TeamAbbreviation[] = [];
    const cpu: TeamAbbreviation[] = [];
    for (const [team, uid] of Object.entries(draft.teamAssignments)) {
      if (uid === null) cpu.push(team as TeamAbbreviation);
      else if (uid !== userId) user.push(team as TeamAbbreviation);
    }
    return { userTeams: user, cpuTeams: cpu };
  }, [draft, userId]);

  const userCurrentPicks = useMemo(
    () => getAvailableCurrentPicks(draft, userId),
    [draft, userId],
  );
  const userFuturePicks = useMemo(
    () => getAvailableFuturePicks(draft, userId),
    [draft, userId],
  );

  const targetCurrentPicks = useMemo(
    () => (targetTeam ? getTeamUnmadePicks(draft, targetTeam) : []),
    [draft, targetTeam],
  );
  const targetFuturePicks = useMemo(
    () => (targetTeam ? getTeamFuturePicks(draft, targetTeam) : []),
    [draft, targetTeam],
  );

  const givingPieces = useMemo((): TradePiece[] => {
    const pieces: TradePiece[] = [];
    for (const slot of userCurrentPicks) {
      if (selectedGiving.has(currentPickKey(slot))) {
        pieces.push({ type: 'current-pick', overall: slot.overall });
      }
    }
    for (const fp of userFuturePicks) {
      if (selectedGiving.has(futurePickKey(fp))) {
        pieces.push({
          type: 'future-pick',
          year: fp.year,
          round: fp.round,
          originalTeam: fp.originalTeam,
        });
      }
    }
    return pieces;
  }, [selectedGiving, userCurrentPicks, userFuturePicks]);

  const receivingPieces = useMemo((): TradePiece[] => {
    const pieces: TradePiece[] = [];
    for (const slot of targetCurrentPicks) {
      if (selectedReceiving.has(currentPickKey(slot))) {
        pieces.push({ type: 'current-pick', overall: slot.overall });
      }
    }
    for (const fp of targetFuturePicks) {
      if (selectedReceiving.has(futurePickKey(fp))) {
        pieces.push({
          type: 'future-pick',
          year: fp.year,
          round: fp.round,
          originalTeam: fp.originalTeam,
        });
      }
    }
    return pieces;
  }, [selectedReceiving, targetCurrentPicks, targetFuturePicks]);

  const givingValue = useMemo(() => {
    let total = 0;
    for (const p of givingPieces) {
      if (p.type === 'current-pick' && p.overall)
        total += getPickValue(p.overall);
      if (p.type === 'future-pick' && p.round && p.year)
        total += getFuturePickValue(p.round, p.year - draft.config.year);
    }
    return total;
  }, [givingPieces, draft.config.year]);

  const receivingValue = useMemo(() => {
    let total = 0;
    for (const p of receivingPieces) {
      if (p.type === 'current-pick' && p.overall)
        total += getPickValue(p.overall);
      if (p.type === 'future-pick' && p.round && p.year)
        total += getFuturePickValue(p.round, p.year - draft.config.year);
    }
    return total;
  }, [receivingPieces, draft.config.year]);

  function toggleGiving(key: string) {
    setSelectedGiving((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleReceiving(key: string) {
    setSelectedReceiving((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit() {
    if (
      !targetTeam ||
      givingPieces.length === 0 ||
      receivingPieces.length === 0
    )
      return;
    onSubmit(targetTeam, givingPieces, receivingPieces);
  }

  function handleTeamChange(team: TeamAbbreviation) {
    setTargetTeam(team);
    setSelectedReceiving(new Set());
  }

  const canSubmit =
    targetTeam &&
    givingPieces.length > 0 &&
    receivingPieces.length > 0 &&
    !disabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propose Trade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Trade with</label>
          {userTeams.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs text-muted-foreground">Players</p>
              <div className="flex flex-wrap gap-1.5">
                {userTeams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => handleTeamChange(team)}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      targetTeam === team
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {team}
                    {draft.participantNames?.[draft.teamAssignments[team]!] && (
                      <span className="ml-1 opacity-70">
                        ({draft.participantNames[draft.teamAssignments[team]!]})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {cpuTeams.length > 0 && (
            <div>
              {userTeams.length > 0 && (
                <p className="mb-1 text-xs text-muted-foreground">CPU</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {cpuTeams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => handleTeamChange(team)}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      targetTeam === team
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {targetTeam && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <PickColumn
                title="You Give"
                currentPicks={userCurrentPicks}
                futurePicks={userFuturePicks}
                selected={selectedGiving}
                onToggle={toggleGiving}
                draftYear={draft.config.year}
              />
              <PickColumn
                title={`${getTeamName(targetTeam)} Gives`}
                currentPicks={targetCurrentPicks}
                futurePicks={targetFuturePicks}
                selected={selectedReceiving}
                onToggle={toggleReceiving}
                draftYear={draft.config.year}
              />
            </div>

            {(givingPieces.length > 0 || receivingPieces.length > 0) && (
              <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>
                  Give: <strong>{givingValue.toFixed(1)}</strong>
                </span>
                <span>
                  Get: <strong>{receivingValue.toFixed(1)}</strong>
                </span>
                <span
                  className={cn(
                    'font-medium',
                    receivingValue - givingValue >= 0
                      ? 'text-mb-success'
                      : 'text-destructive',
                  )}
                >
                  Net: {(receivingValue - givingValue).toFixed(1)}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {disabled ? 'Submitting...' : 'Propose Trade'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PickColumn({
  title,
  currentPicks,
  futurePicks,
  selected,
  onToggle,
  draftYear,
}: {
  title: string;
  currentPicks: DraftSlot[];
  futurePicks: FutureDraftPick[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  draftYear: number;
}) {
  return (
    <div className="rounded-md border p-3">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>

      {currentPicks.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs text-muted-foreground">Current Picks</p>
          <div className="space-y-1">
            {currentPicks.map((slot) => {
              const key = currentPickKey(slot);
              const isSelected = selected.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggle(key)}
                  className={cn(
                    'w-full rounded px-2 py-1 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-primary/15 text-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  {isSelected ? '\u2713 ' : ''}R{slot.round} P{slot.pick} #
                  {slot.overall} — {getTeamName(slot.team as TeamAbbreviation)}
                  <span className="ml-1 text-muted-foreground">
                    ({getPickValue(slot.overall).toFixed(1)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {futurePicks.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Future Picks</p>
          <div className="space-y-1">
            {futurePicks.map((fp) => {
              const key = futurePickKey(fp);
              const isSelected = selected.has(key);
              const value = getFuturePickValue(fp.round, fp.year - draftYear);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggle(key)}
                  className={cn(
                    'w-full rounded px-2 py-1 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-primary/15 text-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  {isSelected ? '\u2713 ' : ''}
                  {fp.year} R{fp.round} — {fp.originalTeam}
                  <span className="ml-1 text-muted-foreground">
                    ({value.toFixed(1)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {currentPicks.length === 0 && futurePicks.length === 0 && (
        <p className="text-xs text-muted-foreground">No picks available</p>
      )}
    </div>
  );
}
