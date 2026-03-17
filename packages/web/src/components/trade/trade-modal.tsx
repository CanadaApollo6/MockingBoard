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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTeamName } from '@/lib/teams';
import { TEAM_COLORS } from '@/lib/colors/team-colors';
import { cn } from '@/lib/utils';

interface TradeModalProps {
  draft: Draft;
  userId: string;
  onSubmit: (
    proposerTeam: TeamAbbreviation,
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

  // Teams the current user controls
  const myTeams = useMemo(() => {
    return (
      Object.entries(draft.teamAssignments) as [
        TeamAbbreviation,
        string | null,
      ][]
    )
      .filter(([, uid]) => uid === userId)
      .map(([team]) => team);
  }, [draft, userId]);

  const [proposerTeam, setProposerTeam] = useState<TeamAbbreviation>(
    myTeams[0],
  );

  const { userTeams, cpuTeams, ownOtherTeams } = useMemo(() => {
    const user: TeamAbbreviation[] = [];
    const cpu: TeamAbbreviation[] = [];
    const own: TeamAbbreviation[] = [];
    for (const [team, uid] of Object.entries(draft.teamAssignments)) {
      const t = team as TeamAbbreviation;
      if (uid === null) cpu.push(t);
      else if (uid !== userId) user.push(t);
      else if (t !== proposerTeam) own.push(t);
    }
    return { userTeams: user, cpuTeams: cpu, ownOtherTeams: own };
  }, [draft, userId, proposerTeam]);

  const targetCount = userTeams.length + cpuTeams.length + ownOtherTeams.length;
  const useDropdowns = myTeams.length > 8 || targetCount > 8;

  // Filter picks to the selected proposer team only
  const userCurrentPicks = useMemo(
    () =>
      getAvailableCurrentPicks(draft, userId).filter((slot) => {
        if (slot.ownerOverride !== undefined) return true;
        return slot.team === proposerTeam;
      }),
    [draft, userId, proposerTeam],
  );
  const userFuturePicks = useMemo(
    () =>
      getAvailableFuturePicks(draft, userId).filter(
        (fp) => fp.ownerTeam === proposerTeam,
      ),
    [draft, userId, proposerTeam],
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
    onSubmit(proposerTeam, targetTeam, givingPieces, receivingPieces);
  }

  function handleProposerTeamChange(team: TeamAbbreviation) {
    setProposerTeam(team);
    setSelectedGiving(new Set());
    if (targetTeam === team) {
      setTargetTeam(null);
      setSelectedReceiving(new Set());
    }
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
        {myTeams.length > 1 && (
          <div>
            <label className="mb-2 block text-sm font-medium">Trade from</label>
            {useDropdowns ? (
              <Select
                value={proposerTeam}
                onValueChange={(v) =>
                  handleProposerTeamChange(v as TeamAbbreviation)
                }
              >
                <SelectTrigger
                  className="w-full"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor:
                      TEAM_COLORS[proposerTeam]?.primary ?? 'transparent',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {myTeams.map((team) => (
                    <SelectItem key={team} value={team}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: TEAM_COLORS[team]?.primary,
                          }}
                        />
                        {getTeamName(team)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {myTeams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => handleProposerTeamChange(team)}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      proposerTeam === team
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {getTeamName(team)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium">Trade with</label>
          {useDropdowns ? (
            <Select
              value={targetTeam ?? ''}
              onValueChange={(v) => handleTeamChange(v as TeamAbbreviation)}
            >
              <SelectTrigger
                className="w-full"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: targetTeam
                    ? (TEAM_COLORS[targetTeam]?.primary ?? 'transparent')
                    : 'transparent',
                }}
              >
                <SelectValue placeholder="Select team…" />
              </SelectTrigger>
              <SelectContent>
                {userTeams.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Players</SelectLabel>
                    {userTeams.map((team) => (
                      <SelectItem key={team} value={team}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: TEAM_COLORS[team]?.primary,
                            }}
                          />
                          {getTeamName(team)}
                          {draft.participantNames?.[
                            draft.teamAssignments[team]!
                          ] && (
                            <span className="text-muted-foreground">
                              (
                              {
                                draft.participantNames[
                                  draft.teamAssignments[team]!
                                ]
                              }
                              )
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {cpuTeams.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>CPU</SelectLabel>
                    {cpuTeams.map((team) => (
                      <SelectItem key={team} value={team}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: TEAM_COLORS[team]?.primary,
                            }}
                          />
                          {getTeamName(team)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {ownOtherTeams.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>My Teams</SelectLabel>
                    {ownOtherTeams.map((team) => (
                      <SelectItem key={team} value={team}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: TEAM_COLORS[team]?.primary,
                            }}
                          />
                          {getTeamName(team)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          ) : (
            <>
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
                        {draft.participantNames?.[
                          draft.teamAssignments[team]!
                        ] && (
                          <span className="ml-1 opacity-70">
                            (
                            {
                              draft.participantNames[
                                draft.teamAssignments[team]!
                              ]
                            }
                            )
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {cpuTeams.length > 0 && (
                <div className="mb-2">
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
              {ownOtherTeams.length > 0 && (
                <div>
                  {(userTeams.length > 0 || cpuTeams.length > 0) && (
                    <p className="mb-1 text-xs text-muted-foreground">
                      My Teams
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {ownOtherTeams.map((team) => (
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
            </>
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
  // Current-year extra-round picks belong under "Current Picks"
  const currentYearPicks = futurePicks.filter((fp) => fp.year === draftYear);
  const trueFuturePicks = futurePicks.filter((fp) => fp.year !== draftYear);
  const hasCurrentPicks =
    currentPicks.length > 0 || currentYearPicks.length > 0;

  return (
    <div className="rounded-md border p-3">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>

      {hasCurrentPicks && (
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
            {currentYearPicks.map((fp) => {
              const key = futurePickKey(fp);
              const isSelected = selected.has(key);
              const value = fp.overall
                ? getPickValue(fp.overall)
                : getFuturePickValue(fp.round, 0);
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
                  {isSelected ? '\u2713 ' : ''}R{fp.round}
                  {fp.overall ? ` #${fp.overall}` : ''} —{' '}
                  {getTeamName(fp.originalTeam)}
                  <span className="ml-1 text-muted-foreground">
                    ({value.toFixed(1)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {trueFuturePicks.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Future Picks</p>
          <div className="space-y-1">
            {trueFuturePicks.map((fp) => {
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

      {!hasCurrentPicks && trueFuturePicks.length === 0 && (
        <p className="text-xs text-muted-foreground">No picks available</p>
      )}
    </div>
  );
}
