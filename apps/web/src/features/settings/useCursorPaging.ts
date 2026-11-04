import { useCallback, useState } from 'react';

/** Cursor paging with a way back and a rows-per-page choice; any change of filter should call `reset`. */
export function useCursorPaging<C extends string | number>(initialLimit = 10) {
  const [cursor, setCursor] = useState<C | undefined>(undefined);
  const [history, setHistory] = useState<(C | undefined)[]>([]);
  const [limit, setLimitState] = useState(initialLimit);

  const reset = useCallback(() => {
    setCursor(undefined);
    setHistory([]);
  }, []);

  const next = (nextCursor?: C | null) => {
    if (nextCursor === undefined || nextCursor === null) return;
    setHistory((h) => [...h, cursor]);
    setCursor(nextCursor);
  };

  const prev = () => {
    if (history.length === 0) return;
    setCursor(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  const setLimit = (n: number) => {
    setLimitState(n);
    reset();
  };

  return { cursor, limit, page: history.length + 1, hasPrev: history.length > 0, next, prev, reset, setLimit };
}
