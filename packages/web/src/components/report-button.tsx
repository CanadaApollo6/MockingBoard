'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ReportReason, ReportableContentType } from '@mockingboard/shared';

interface ReportButtonProps {
  contentType: ReportableContentType;
  contentId: string;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export function ReportButton({ contentType, contentId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReason('');
      setReasonText('');
      setMessage(null);
    }
  }

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/reports/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          reason,
          reasonText: reason === 'other' ? reasonText : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to report');
      }

      setMessage({ type: 'success', text: 'Report submitted. Thank you.' });
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit report',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Report content"
        >
          <Flag className="h-3 w-3" />
          Report
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Reason</legend>
            {REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          {reason === 'other' && (
            <Textarea
              placeholder="Please describe the issue..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              maxLength={200}
            />
          )}

          {message && (
            <p
              className={`text-sm ${
                message.type === 'success'
                  ? 'text-green-500'
                  : 'text-destructive'
              }`}
            >
              {message.text}
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
