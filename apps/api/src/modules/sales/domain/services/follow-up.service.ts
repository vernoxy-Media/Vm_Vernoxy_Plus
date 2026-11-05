import { DateRange, OVERDUE_GRACE_MS, istDayRange } from './lead-time.service';

/** BFD section 7, Part 3: every follow-up is always in exactly one status. */
export const FOLLOW_UP_STATUSES = ['Pending', 'Overdue', 'Completed', 'Cancelled'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

/** The tabs of the Follow-ups page are views of those statuses. */
export const FOLLOW_UP_TABS = ['today', 'upcoming', 'overdue', 'completed', 'cancelled'] as const;
export type FollowUpTab = (typeof FOLLOW_UP_TABS)[number];

/** "A follow-up rescheduled 3 times is flagged to the Admin." */
export const RESCHEDULE_FLAG_COUNT = 3;
/** "Reminder 1 hour before." */
export const REMINDER_LEAD_MS = 60 * 60 * 1000;
/** "Daily summary: every sales user, 9:30 every morning" (IST). */
export const DAILY_SUMMARY_MINUTE_OF_DAY = 9 * 60 + 30;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function isOpen(status: string): boolean {
  return status === 'Pending' || status === 'Overdue';
}

/**
 * The status the user sees. A Pending follow-up becomes Overdue 15 minutes after its due time;
 * this is computed on every read, so the page is right even before the background job has run.
 */
export function effectiveStatus(status: string, followUpOn: Date, now: Date): FollowUpStatus {
  if (status === 'Pending' && followUpOn.getTime() < now.getTime() - OVERDUE_GRACE_MS) return 'Overdue';
  return (FOLLOW_UP_STATUSES as readonly string[]).includes(status) ? (status as FollowUpStatus) : 'Pending';
}

/** Start of tomorrow in IST, where "Upcoming" begins. */
export function upcomingFrom(now: Date): Date {
  return istDayRange(now).to;
}

export function todayRange(now: Date): DateRange {
  return istDayRange(now);
}

export function overdueBefore(now: Date): Date {
  return new Date(now.getTime() - OVERDUE_GRACE_MS);
}

/** True once it is 9:30 IST or later on the Indian day of `now`. */
export function isDailySummaryTime(now: Date): boolean {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes() >= DAILY_SUMMARY_MINUTE_OF_DAY;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "28 Oct, 11:00" in Indian time, as in the messages of BFD section 7, Part 6. */
export function formatIst(at: Date): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}, ${hh}:${mm}`;
}

export type FollowUpAction = 'view' | 'edit' | 'complete' | 'reschedule' | 'cancel';

/**
 * Who may do what. View is for everyone in Sales. The rest is for the person it is assigned to,
 * the Lead By user of its lead, its creator (for a company that is not yet a lead), and the Admin;
 * and only while it is Pending or Overdue.
 */
export function allowedFollowUpActions(
  f: { status: FollowUpStatus; assigned_to: number; created_by: number | null; lead_by_id: number | null },
  actor: { emp_id: number; is_admin: boolean },
): FollowUpAction[] {
  const mine =
    actor.is_admin || f.assigned_to === actor.emp_id || f.lead_by_id === actor.emp_id || (f.lead_by_id === null && f.created_by === actor.emp_id);
  return mine && isOpen(f.status) ? ['view', 'edit', 'complete', 'reschedule', 'cancel'] : ['view'];
}

// -------------------------------------------------------------- messages ----

export interface FollowUpFacts {
  company_name: string;
  type: string;
  at: Date;
  contact_name: string | null;
}

/** "Kishan Patel gave you a follow-up: Patel Precision Engineering, 28 Oct, 11:00, Call." */
export const messages = {
  assigned: (by: string, f: FollowUpFacts) => ({
    title: `New follow-up: ${f.company_name}`,
    body: `${by} gave you a follow-up: ${f.company_name}, ${formatIst(f.at)}, ${f.type}.`,
  }),
  /** "Follow-up in 1 hour: Call Kunal Shah, Patel Precision Engineering." */
  reminder: (f: FollowUpFacts, now?: Date) => {
    const mins = now ? Math.round((f.at.getTime() - now.getTime()) / 60000) : 60;
    const when = mins <= 0 ? 'due now' : mins >= 55 ? 'in 1 hour' : `in ${mins} minute${mins === 1 ? '' : 's'}`;
    return {
      title: `Follow-up ${when}: ${f.company_name}`,
      body: `Follow-up ${when}: ${f.type}${f.contact_name ? ` ${f.contact_name}` : ''}, ${f.company_name}.`,
    };
  },
  /** "Follow-up with Patel Precision Engineering is overdue since 28 Oct, 11:00." */
  overdue: (f: FollowUpFacts) => ({
    title: `Overdue follow-up: ${f.company_name}`,
    body: `Follow-up with ${f.company_name} is overdue since ${formatIst(f.at)}.`,
  }),
  /** "The follow-up with Gujarat Agro Exports has been moved 3 times." */
  rescheduledThrice: (company: string, times: number) => ({
    title: `Follow-up moved ${times} times: ${company}`,
    body: `The follow-up with ${company} has been moved ${times} times.`,
  }),
  /** "You have 3 follow-ups today and 1 overdue." */
  dailySummary: (today: number, overdue: number) => ({
    title: 'Your follow-ups for today',
    body: `You have ${today} follow-up${today === 1 ? '' : 's'} today and ${overdue} overdue.`,
  }),
};
