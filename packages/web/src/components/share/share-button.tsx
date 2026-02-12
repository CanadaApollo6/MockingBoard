'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toBlob } from 'html-to-image';
import type {
  Pick,
  Player,
  TeamAbbreviation,
  Draft,
  DraftRecap,
} from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { formatDraftDate, getDraftDisplayName } from '@/lib/firebase/format';
import { Button } from '@/components/ui/button';
import { DraftShareCard } from './draft-share-card';
import { MyTeamShareCard } from './my-team-share-card';
import { RecapShareCard } from './recap-share-card';
import { X, Download, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  draft: Draft;
  picks: Pick[];
  players: Record<string, Player>;
  userTeams: TeamAbbreviation[];
  recap?: DraftRecap | null;
}

type CardMode =
  | { type: 'full' }
  | { type: 'team'; team: TeamAbbreviation }
  | { type: 'recap'; team: TeamAbbreviation };

export function ShareButton({
  draft,
  picks,
  players,
  userTeams,
  recap,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [cardMode, setCardMode] = useState<CardMode | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const draftName = getDraftDisplayName(draft);
  const draftDate = formatDraftDate(draft.createdAt);
  const participantCount = Object.keys(draft.participants ?? {}).length;

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close preview on Escape
  useEffect(() => {
    if (!cardMode) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCardMode(null);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [cardMode]);

  const openPreview = useCallback((mode: CardMode) => {
    setCardMode(mode);
    setOpen(false);
    setCopied(false);
  }, []);

  const closePreview = useCallback(() => {
    setCardMode(null);
    setCopied(false);
  }, []);

  const fileSuffix = cardMode
    ? cardMode.type === 'team'
      ? `-${cardMode.team.toLowerCase()}`
      : cardMode.type === 'recap'
        ? `-recap-${cardMode.team.toLowerCase()}`
        : ''
    : '';

  const handleDownload = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#0a0a0b',
      });
      const link = document.createElement('a');
      link.download = `mockingboard-${draft.id}${fileSuffix}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setBusy(false);
    }
  }, [draft.id, fileSuffix]);

  const handleCopy = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const blob = await toBlob(el, {
        pixelRatio: 2,
        backgroundColor: '#0a0a0b',
      });
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusy(false);
    }
  }, []);

  const renderCard = () => {
    if (!cardMode) return null;
    if (cardMode.type === 'full') {
      return (
        <DraftShareCard
          draftName={draftName}
          draftDate={draftDate}
          participantCount={participantCount}
          picks={picks}
          players={players}
        />
      );
    }
    if (cardMode.type === 'recap') {
      const teamGrade = recap?.teamGrades.find(
        (tg) => tg.team === cardMode.team,
      );
      return teamGrade ? (
        <RecapShareCard
          draftName={draftName}
          draftDate={draftDate}
          grade={teamGrade}
          players={players}
        />
      ) : null;
    }
    return (
      <MyTeamShareCard
        draftName={draftName}
        draftDate={draftDate}
        team={cardMode.team}
        picks={picks.filter((p) => p.team === cardMode.team)}
        players={players}
      />
    );
  };

  return (
    <>
      <div ref={menuRef} className="relative inline-block">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          Share
        </Button>
        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border bg-card p-1 shadow-lg">
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => openPreview({ type: 'full' })}
            >
              Full Board
            </button>
            {userTeams.length > 0 && (
              <>
                <div className="my-1 border-t" />
                <p className="px-3 py-1 text-xs text-muted-foreground">
                  My Teams
                </p>
                {userTeams.map((team) => (
                  <button
                    key={team}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => openPreview({ type: 'team', team })}
                  >
                    {getTeamName(team)}
                  </button>
                ))}
              </>
            )}
            {recap && recap.teamGrades.length > 0 && (
              <>
                <div className="my-1 border-t" />
                <p className="px-3 py-1 text-xs text-muted-foreground">
                  Recap Cards
                </p>
                {userTeams.length > 0
                  ? userTeams.map((team) => (
                      <button
                        key={`recap-${team}`}
                        className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => openPreview({ type: 'recap', team })}
                      >
                        {getTeamName(team)} Recap
                      </button>
                    ))
                  : recap.teamGrades.slice(0, 5).map((tg) => (
                      <button
                        key={`recap-${tg.team}`}
                        className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() =>
                          openPreview({ type: 'recap', team: tg.team })
                        }
                      >
                        {getTeamName(tg.team)} Recap
                      </button>
                    ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Share preview overlay */}
      {cardMode &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1.5 h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={handleDownload}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download
                </Button>
              </div>
              <button
                onClick={closePreview}
                className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Card preview — scrollable */}
            <div className="flex-1 overflow-auto p-6">
              <div className="mx-auto w-fit" ref={cardRef}>
                {renderCard()}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
