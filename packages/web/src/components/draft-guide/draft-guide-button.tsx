'use client';

import { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { Player } from '@mockingboard/shared';
import { Button } from '@/components/ui/button';
import { DraftGuidePdf, type PdfDepth } from './draft-guide-pdf';
import { DraftGuideOptions } from './draft-guide-options';

interface DraftGuideButtonProps {
  boardName: string;
  authorName?: string;
  year: number;
  players: Player[];
}

export function DraftGuideButton({
  boardName,
  authorName,
  year,
  players,
}: DraftGuideButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(
    async (depth: PdfDepth, playerCount: number) => {
      setGenerating(true);
      setError(null);
      try {
        const subset = players.slice(0, playerCount);
        const blob = await pdf(
          <DraftGuidePdf
            boardName={boardName}
            authorName={authorName}
            year={year}
            players={subset}
            depth={depth}
          />,
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = boardName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        a.download = `mockingboard-${safeName}-${year}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowOptions(false);
      } catch (err) {
        console.error('PDF generation failed:', err);
        setError(err instanceof Error ? err.message : 'PDF generation failed');
      } finally {
        setGenerating(false);
      }
    },
    [boardName, authorName, year, players],
  );

  if (players.length === 0) return null;

  return (
    <div>
      {!showOptions ? (
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowOptions(true)}
        >
          Draft Guide PDF
        </Button>
      ) : (
        <div className="rounded-lg border bg-background p-4 shadow-lg">
          {generating ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating PDF...
            </div>
          ) : (
            <DraftGuideOptions
              totalPlayers={players.length}
              onGenerate={handleGenerate}
              onCancel={() => setShowOptions(false)}
            />
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
