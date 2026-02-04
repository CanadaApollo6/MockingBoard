'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import type {
  Pick,
  Player,
  TeamAbbreviation,
  Draft,
} from '@mockingboard/shared';
import { getTeamName } from '@/lib/teams';
import { formatDraftDate, getDraftDisplayName } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DraftShareCard } from './draft-share-card';
import { MyTeamShareCard } from './my-team-share-card';

interface ShareButtonProps {
  draft: Draft;
  picks: Pick[];
  players: Record<string, Player>;
  userTeams: TeamAbbreviation[];
}

type CardMode = { type: 'full' } | { type: 'team'; team: TeamAbbreviation };

export function ShareButton({
  draft,
  picks,
  players,
  userTeams,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cardMode, setCardMode] = useState<CardMode | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const draftName = getDraftDisplayName(draft);
  const draftDate = formatDraftDate(draft.createdAt);
  const participantCount = Object.keys(draft.participants).length;

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

  const capture = useCallback(
    async (mode: CardMode) => {
      setCardMode(mode);
      setCapturing(true);
      setOpen(false);

      // Wait for render
      await new Promise((r) => setTimeout(r, 100));

      try {
        const el = cardRef.current;
        if (!el) return;

        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: '#0a0a0b',
        });

        const link = document.createElement('a');
        const suffix =
          mode.type === 'team' ? `-${mode.team.toLowerCase()}` : '';
        link.download = `mockingboard-${draft.id}${suffix}.png`;
        link.href = dataUrl;
        link.click();
      } finally {
        setCapturing(false);
        setCardMode(null);
      }
    },
    [draft.id],
  );

  return (
    <>
      <div ref={menuRef} className="relative inline-block">
        <Button
          variant="outline"
          size="sm"
          disabled={capturing}
          onClick={() => setOpen((o) => !o)}
        >
          {capturing ? 'Generating...' : 'Share'}
        </Button>
        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border bg-card p-1 shadow-lg">
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => capture({ type: 'full' })}
            >
              Download Full Board
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
                    onClick={() => capture({ type: 'team', team })}
                  >
                    {getTeamName(team)}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Off-screen render target for image capture */}
      {cardMode &&
        createPortal(
          <div
            ref={cardRef}
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
              zIndex: -1,
            }}
          >
            {cardMode.type === 'full' ? (
              <DraftShareCard
                draftName={draftName}
                draftDate={draftDate}
                participantCount={participantCount}
                picks={picks}
                players={players}
              />
            ) : (
              <MyTeamShareCard
                draftName={draftName}
                draftDate={draftDate}
                team={cardMode.team}
                picks={picks.filter((p) => p.team === cardMode.team)}
                players={players}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
