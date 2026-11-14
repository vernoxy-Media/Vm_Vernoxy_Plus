export type PunchKind = 'in' | 'out';

export interface PunchCoordinates {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
}

export interface PunchLocationRepository {
  /** Remembers where today's punch happened; a later punch of the same kind replaces it. */
  save(empId: number, kind: PunchKind, coords: PunchCoordinates): Promise<void>;
  /** Locations for an employee between two work dates (inclusive), keyed by YYYY-MM-DD. */
  findRange(
    empId: number,
    from: string,
    to: string,
  ): Promise<Map<string, Partial<Record<PunchKind, { latitude: number; longitude: number }>>>>;
}
