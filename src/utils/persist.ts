// Per-app persistent state. Reads from localStorage on first render; writes
// back whenever the value changes. Each caller chooses its own namespaced key
// (e.g. "oscilloscope_settings") so apps can't collide.

import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}
