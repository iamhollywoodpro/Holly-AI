'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  actionUrl?: string;
  createdAt: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const prevCountRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const res = await fetch(
        `/api/notifications/recent?since=${encodeURIComponent(since)}&limit=20`,
        { credentials: 'include' }
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming: NotificationItem[] = data.notifications || [];

      setNotifications(prev => {
        const merged = [...incoming, ...prev];
        const seen = new Set<string>();
        const deduped: NotificationItem[] = [];
        for (const n of merged) {
          if (!seen.has(n.id)) {
            seen.add(n.id);
            deduped.push(n);
          }
        }
        return deduped.slice(0, 50);
      });

      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetch('/api/notifications/recent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      setNotifications(prev =>
        prev.map(n => (ids.includes(n.id) ? { ...n, status: 'read' } : n))
      );
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }, []);

  return { notifications, unreadCount, markAsRead, loading };
}
