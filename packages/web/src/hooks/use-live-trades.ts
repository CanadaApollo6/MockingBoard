'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import type { Trade } from '@mockingboard/shared';

export function useLiveTrades(draftId: string): Trade[] {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const q = query(
      collection(getClientDb(), 'trades'),
      where('draftId', '==', draftId),
      where('status', '==', 'pending'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setTrades(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Trade));
    });

    return unsub;
  }, [draftId]);

  return trades;
}
