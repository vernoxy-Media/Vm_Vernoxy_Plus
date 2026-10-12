export interface PaginationQuery {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  next_cursor: string | null;
}

export function parseLimit(limit?: number | string, defaultLimit = 50, maxLimit = 100): number {
  if (limit === undefined || limit === null || limit === '') {
    return defaultLimit;
  }
  const parsed = typeof limit === 'number' ? limit : parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 1) {
    return defaultLimit;
  }
  return Math.min(parsed, maxLimit);
}

export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor<T = Record<string, unknown>>(cursor?: string): T | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
