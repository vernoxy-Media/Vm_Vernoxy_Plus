import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';

/**
 * `useState` that remembers its value in this browser, separately for each signed-in person.
 * Used for list filters and the List / Kanban choice so they are still there on the next visit.
 * Stored objects are merged over `initial`, so a field added later still gets its default.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const { user } = useAuth();
  const storageKey = `vp:${user?.emp_id ?? 'anon'}:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return initial;
      const saved = JSON.parse(raw) as T;
      const bothObjects = typeof initial === 'object' && initial !== null && typeof saved === 'object' && saved !== null;
      return bothObjects ? ({ ...initial, ...saved } as T) : saved;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* private mode or full storage: the choice just is not remembered */
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}
