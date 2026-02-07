'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  where,
  query,
  limit,
} from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import type { AppNotification } from '@mockingboard/shared';

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(getClientDb(), 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20),
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification),
      );
    });

    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  }, []);

  return { notifications, unreadCount, markRead, markAllRead };
}
