'use client';

import { useEffect, useState } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import type { Draft, Pick } from '@mockingboard/shared';

interface LiveDraftState {
  draft: Draft | null;
  picks: Pick[];
}

export function useLiveDraft(
  draftId: string,
  initialDraft: Draft | null,
  initialPicks: Pick[],
): LiveDraftState {
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [picks, setPicks] = useState<Pick[]>(initialPicks);

  useEffect(() => {
    const unsubDraft = onSnapshot(
      doc(getClientDb(), 'drafts', draftId),
      (snap) => {
        if (snap.exists()) {
          setDraft({ id: snap.id, ...snap.data() } as Draft);
        }
      },
    );

    const picksQuery = query(
      collection(getClientDb(), 'drafts', draftId, 'picks'),
      orderBy('overall'),
    );
    const unsubPicks = onSnapshot(picksQuery, (snap) => {
      setPicks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pick));
    });

    return () => {
      unsubDraft();
      unsubPicks();
    };
  }, [draftId]);

  return { draft, picks };
}
