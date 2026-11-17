import { useEffect, useMemo, useState } from 'react';

/**
 * The same filters, but a typed search is only passed on once the person pauses, so the board is not fetched for
 * every letter. The dropdown filters apply at once.
 */
export function useDebouncedSearch<T extends { search?: string }>(filters: T, delayMs = 350): T {
  const [search, setSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.search), delayMs);
    return () => clearTimeout(timer);
  }, [filters.search, delayMs]);

  return useMemo(() => ({ ...filters, search }), [filters, search]);
}
