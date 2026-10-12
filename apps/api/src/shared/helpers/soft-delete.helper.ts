export interface SoftDeletable {
  deleted_at?: Date | null;
  deleted_by?: number | null;
}

/**
 * Filter condition to exclude soft-deleted rows in queries.
 */
export const activeOnly = {
  deleted_at: null,
};

/**
 * Generates soft-delete update payload.
 */
export function markSoftDeleted(deletedByUserId: number): {
  deleted_at: Date;
  deleted_by: number;
} {
  return {
    deleted_at: new Date(),
    deleted_by: deletedByUserId,
  };
}
