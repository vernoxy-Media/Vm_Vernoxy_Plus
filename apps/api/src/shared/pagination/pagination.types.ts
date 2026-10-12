export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string | number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total?: number;
    page?: number;
    limit: number;
    totalPages?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string | number | null;
  };
}

export function createPaginationMeta<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
