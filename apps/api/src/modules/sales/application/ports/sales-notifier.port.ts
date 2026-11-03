export interface LeadAssignedNotice {
  recipient_emp_id: number;
  lead_id: number;
  lead_code: string;
  company_name: string;
  assigned_by_emp_id: number;
}

export interface Notice {
  recipient_emp_id: number;
  /** e.g. follow_up_assigned, follow_up_reminder, follow_up_overdue, follow_up_rescheduled, follow_up_daily_summary */
  kind: string;
  title: string;
  body: string;
  entity_type: 'LEAD' | 'COMPANY' | 'FOLLOW_UP' | null;
  entity_id: number | null;
  created_by?: number | null;
}

/** Best-effort messages to users. A failure here must never fail the business action. */
export interface SalesNotifierPort {
  leadAssigned(notice: LeadAssignedNotice): Promise<void>;
  send(notices: Notice[]): Promise<void>;
  /** Whether the user already got a message of this kind since `since` (keeps the daily summary to once a day). */
  sentSince(recipientEmpId: number, kind: string, since: Date): Promise<boolean>;
}

export const SALES_NOTIFIER_PORT_TOKEN = Symbol('SalesNotifierPort');
