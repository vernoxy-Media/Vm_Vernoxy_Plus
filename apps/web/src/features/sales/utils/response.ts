/** A list endpoint answers with an array, or with a page `{ items, total, ... }`. Returns the rows either way. */
export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as { items?: unknown; data?: unknown };
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (obj.data && typeof obj.data === 'object') return unwrapList<T>(obj.data);
  }
  return [];
}
