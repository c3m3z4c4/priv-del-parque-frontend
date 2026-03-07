import { useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '@/types';
import { notificationsApi, getToken } from '@/lib/api';

const PERMISSION_ASKED_KEY = 'privadas_push_permission_asked';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && typeof window.Notification !== 'undefined'
      ? window.Notification.permission
      : 'denied'
  );
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);

      // Browser push for NEW unread notifications
      if (
        typeof window.Notification !== 'undefined' &&
        window.Notification.permission === 'granted'
      ) {
        const prevIds = prevIdsRef.current;
        data
          .filter(n => !n.read && !prevIds.has(n.id))
          .forEach(n => {
            new window.Notification(n.title, {
              body: n.message,
              icon: '/favicon.ico',
            });
          });
      }
      prevIdsRef.current = new Set(data.map(n => n.id));
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
    }
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (typeof window.Notification === 'undefined') return;
    const result = await window.Notification.requestPermission();
    setPushPermission(result);
    localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    return result;
  }, []);

  const shouldAskPermission =
    typeof window !== 'undefined' &&
    typeof window.Notification !== 'undefined' &&
    window.Notification.permission === 'default' &&
    !localStorage.getItem(PERMISSION_ASKED_KEY);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    requestPushPermission,
    pushPermission,
    shouldAskPermission,
  };
}
