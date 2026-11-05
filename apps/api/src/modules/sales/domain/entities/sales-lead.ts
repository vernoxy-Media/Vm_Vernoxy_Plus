/** Lead statuses in the Kanban column order (BFD section 6, Part 4). */
export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** "Open" = everything that still blocks a second lead on the same company. */
export const OPEN_STATUSES: readonly LeadStatus[] = ['New', 'Contacted', 'Qualified', 'On Hold'];

export const DEFAULT_LEAD_SOURCE = 'Cold calling';
export const EXISTING_CLIENT_LEAD_SOURCE = 'Existing client';

/** Service Fit can be multi select; it is stored as one text value (column is varchar(150)). */
export const SERVICE_FIT_SEPARATOR = ', ';
export const SERVICE_FIT_MAX_LENGTH = 150;
export const FIRST_NOTE_MAX_LENGTH = 5000;

export function joinServiceFit(values: string[]): string {
  return values.join(SERVICE_FIT_SEPARATOR);
}

export function splitServiceFit(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(SERVICE_FIT_SEPARATOR.trim())
    .map((v) => v.trim())
    .filter(Boolean);
}

export type FollowUpFlag = 'overdue' | 'today' | null;
