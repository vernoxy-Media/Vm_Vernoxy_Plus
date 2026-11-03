import { SalesFollowUpRepositoryPort } from '../ports/sales-follow-up.repository.port';
import { Notice, SalesNotifierPort } from '../ports/sales-notifier.port';
import { SalesCalendarPort } from '../ports/sales-calendar.port';
import { isDailySummaryTime, messages, todayRange } from '../../domain/services/follow-up.service';

export interface JobReport {
  at: string;
  overdue: number;
  reminders: number;
  daily_summaries: number;
  calendar_created: number;
  calendar_removed: number;
  errors: string[];
}

const CALENDAR_BATCH = 100;
export const DAILY_SUMMARY_KIND = 'follow_up_daily_summary';

/**
 * The recurring background work of BFD section 7, Part 6:
 *   - a Pending follow-up becomes Overdue 15 minutes after it was due, and the user and Admin are told;
 *   - a reminder goes out 1 hour before it is due;
 *   - every sales user gets a daily summary at 9:30;
 *   - the Calendar is kept in step with the follow-ups.
 *
 * Safe to run as often as you like and from several servers at once: every step claims its rows
 * atomically in the database, so nobody gets the same message twice.
 */
export class FollowUpJobs {
  constructor(
    private readonly repo: SalesFollowUpRepositoryPort,
    private readonly notifier: SalesNotifierPort,
    private readonly calendar: SalesCalendarPort,
  ) {}

  async run(now = new Date()): Promise<JobReport> {
    const report: JobReport = { at: now.toISOString(), overdue: 0, reminders: 0, daily_summaries: 0, calendar_created: 0, calendar_removed: 0, errors: [] };
    const step = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        report.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    await step('overdue', async () => {
      const claimed = await this.repo.claimNewlyOverdue(now);
      if (claimed.length === 0) return;
      const admins = await this.repo.listAdminIds();
      const notices: Notice[] = [];
      for (const f of claimed) {
        const m = messages.overdue({ company_name: f.company_name, type: f.type, at: f.follow_up_on, contact_name: f.contact_name });
        // "The Assigned to user and the Admin" are told.
        for (const to of new Set([f.assigned_to, ...admins])) {
          notices.push({ recipient_emp_id: to, kind: 'follow_up_overdue', title: m.title, body: m.body, entity_type: 'FOLLOW_UP', entity_id: f.follow_up_id });
        }
      }
      await this.notifier.send(notices);
      report.overdue = claimed.length;
    });

    await step('reminders', async () => {
      const claimed = await this.repo.claimDueReminders(now);
      if (claimed.length === 0) return;
      await this.notifier.send(
        claimed.map((f) => {
          const m = messages.reminder({ company_name: f.company_name, type: f.type, at: f.follow_up_on, contact_name: f.contact_name });
          return { recipient_emp_id: f.assigned_to, kind: 'follow_up_reminder', title: m.title, body: m.body, entity_type: 'FOLLOW_UP' as const, entity_id: f.follow_up_id };
        }),
      );
      report.reminders = claimed.length;
    });

    await step('daily summary', async () => {
      if (!isDailySummaryTime(now)) return;
      const since = todayRange(now).from;
      for (const user of await this.repo.listSummaryRecipients()) {
        if (await this.notifier.sentSince(user.emp_id, DAILY_SUMMARY_KIND, since)) continue;
        const { today, overdue } = await this.repo.countForSummary(user.emp_id, now);
        if (today + overdue === 0) continue;
        const m = messages.dailySummary(today, overdue);
        await this.notifier.send([{ recipient_emp_id: user.emp_id, kind: DAILY_SUMMARY_KIND, title: m.title, body: m.body, entity_type: null, entity_id: null }]);
        report.daily_summaries++;
      }
    });

    await step('calendar', async () => {
      for (const f of await this.repo.listNeedingCalendarEvent(CALENDAR_BATCH)) {
        try {
          const eventId = await this.calendar.create({
            title: `Follow-up: ${f.type} - ${f.company_name}`,
            description: [f.contact_name ? `With ${f.contact_name}` : null, f.purpose].filter(Boolean).join('. ') || null,
            start: f.follow_up_on,
            organizer_emp_id: f.assigned_to,
          });
          await this.repo.setCalendarEvent(f.follow_up_id, eventId);
          report.calendar_created++;
        } catch (err) {
          report.errors.push(`calendar create #${f.follow_up_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      for (const f of await this.repo.listCalendarCleanup(CALENDAR_BATCH)) {
        try {
          await this.calendar.remove(f.calendar_event_id as number, f.assigned_to);
          await this.repo.setCalendarEvent(f.follow_up_id, null);
          report.calendar_removed++;
        } catch (err) {
          report.errors.push(`calendar remove #${f.follow_up_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    return report;
  }
}
