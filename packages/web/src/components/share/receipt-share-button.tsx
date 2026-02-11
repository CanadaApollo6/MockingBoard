'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toBlob } from 'html-to-image';
import type { PickScore } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { ReceiptShareCard } from './receipt-share-card';
import { X, Download, Copy, Check, Receipt } from 'lucide-react';

interface ReceiptShareButtonProps {
  displayName: string;
  draftName: string;
  draftId: string;
  year: number;
  pickScores: PickScore[];
  percentage: number;
}

export function ReceiptShareButton({
  displayName,
  draftName,
  draftId,
  year,
  pickScores,
  percentage,
}: ReceiptShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

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
      link.download = `mockingboard-receipt-${draftId}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setBusy(false);
    }
  }, [draftId]);

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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Receipt className="h-3.5 w-3.5" />
        Share Receipt
      </Button>

      {open &&
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
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Card preview */}
            <div className="flex-1 overflow-auto p-6">
              <div className="mx-auto w-fit" ref={cardRef}>
                <ReceiptShareCard
                  displayName={displayName}
                  draftName={draftName}
                  year={year}
                  pickScores={pickScores}
                  percentage={percentage}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
