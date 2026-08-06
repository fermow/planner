import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

const POLL_MS = 20000;

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function useBrowserNotifications() {
  const notifications = useStore((s) => s.notifications);
  const fetchNotifications = useStore((s) => s.fetchNotifications);
  const enabled = useStore((s) => s.browserNotifEnabled);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabledRef.current) return;
    if (!isSupported() || Notification.permission !== 'granted') return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, fetchNotifications]);

  useEffect(() => {
    if (!enabledRef.current) return;
    if (!isSupported() || Notification.permission !== 'granted') return;
    for (const n of notifications) {
      if (n.read || firedRef.current.has(n.id)) continue;
      firedRef.current.add(n.id);
      if (document.visibilityState === 'hidden' || document.hasFocus?.() === false) {
        try {
          new Notification(n.title, { body: n.type });
        } catch {
          // Some environments block constructing notifications.
        }
      }
    }
  }, [notifications]);
}