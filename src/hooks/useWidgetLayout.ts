import { useState, useEffect, useCallback } from 'react';
import { userSettingsApi, getToken } from '@/lib/api';

/**
 * Persists a widget ordering for a given dashboard key.
 * Merges any new widgets not yet in the saved layout.
 */
export function useWidgetLayout(key: string, defaultLayout: string[]) {
  const [layout, setLayout] = useState<string[]>(defaultLayout);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!getToken()) { setLoaded(true); return; }
    userSettingsApi.get()
      .then(settings => {
        const saved: unknown = settings[key];
        if (Array.isArray(saved) && saved.length > 0) {
          // Keep saved order, append any new widget IDs not yet saved
          const merged = [
            ...saved.filter((id): id is string => defaultLayout.includes(id)),
            ...defaultLayout.filter(id => !(saved as string[]).includes(id)),
          ];
          setLayout(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const saveLayout = useCallback((newLayout: string[]) => {
    setLayout(newLayout);
    if (getToken()) {
      userSettingsApi.update({ [key]: newLayout }).catch(() => {});
    }
  }, [key]);

  return { layout, saveLayout, loaded };
}
