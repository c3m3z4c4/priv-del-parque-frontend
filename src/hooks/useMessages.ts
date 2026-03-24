import { useState, useEffect, useCallback } from 'react';
import { messagesApi, getToken } from '@/lib/api';

export function useMessageUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await messagesApi.getUnreadCount();
      setUnreadCount(data.count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { unreadCount, refresh: fetchCount };
}
