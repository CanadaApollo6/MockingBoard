'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface LockPredictionButtonProps {
  draftId: string;
  isLocked: boolean;
}

export function LockPredictionButton({
  draftId,
  isLocked,
}: LockPredictionButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isLocked) {
    return (
      <Badge variant="outline" className="gap-1">
        <Lock className="h-3 w-3" />
        Prediction Locked
      </Badge>
    );
  }

  async function handleLock() {
    setLoading(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/lock`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to lock');
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      console.error('Failed to lock draft:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setConfirmOpen(true)}
      >
        <Lock className="h-3.5 w-3.5" />
        Lock as Prediction
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Lock as Prediction?"
        description="This will freeze your draft as an official prediction. Locked predictions are scored against real NFL draft results and count toward leaderboard rankings. This cannot be undone."
        confirmLabel="Lock Prediction"
        onConfirm={handleLock}
        loading={loading}
      />
    </>
  );
}
