'use client';

import { useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';
import { getErrorMessage } from '@/lib/validate';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GuestJoinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function GuestJoinModal({
  open,
  onOpenChange,
  onComplete,
}: GuestJoinModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError('Please enter a display name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const auth = getClientAuth();
      const credential = await signInAnonymously(auth);
      const idToken = await credential.user.getIdToken();

      // Create session cookie
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionRes.ok) throw new Error('Failed to create session');

      // Create guest user doc
      const guestRes = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      if (!guestRes.ok) throw new Error('Failed to create guest profile');

      onComplete();
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Join as Guest</DialogTitle>
          <DialogDescription>
            Enter a display name to join the draft.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="guest-name"
              className="mb-2 block text-sm font-medium"
            >
              Display Name
            </label>
            <input
              id="guest-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={32}
              autoFocus
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitting || !displayName.trim()}
            >
              {submitting ? 'Joining...' : 'Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
