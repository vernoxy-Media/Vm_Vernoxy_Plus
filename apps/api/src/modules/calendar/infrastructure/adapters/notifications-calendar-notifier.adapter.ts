import { Injectable } from '@nestjs/common';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import type { CalendarNotifierPort, EventInviteNotice, MeetingReminderNotice } from '../../domain/ports/calendar-notifier.port';

@Injectable()
export class NotificationsCalendarNotifierAdapter implements CalendarNotifierPort {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  async eventInvite(n: EventInviteNotice): Promise<void> {
    const kind = n.event_type === 'meeting' ? 'meeting' : 'event';
    const when = n.starts_at.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    await this.createNotification.executeMany(
      n.recipient_emp_ids.map((id) => ({
        recipient_id: id,
        kind: 'calendar_invite',
        title: `You have been invited to a ${kind}`.slice(0, 150),
        body: `${n.organizer_name} invited you to "${n.title}" on ${when}.`,
        entity_type: 'CALENDAR_EVENT',
        entity_id: n.event_id,
        created_by: n.created_by,
      })),
    );
  }

  async meetingReminder(n: MeetingReminderNotice): Promise<void> {
    await this.createNotification.execute({
      recipient_id: n.recipient_emp_id,
      kind: 'calendar_reminder',
      title: (n.kind === 'start' ? `Meeting starting now: ${n.title}` : `Meeting starting soon: ${n.title}`).slice(0, 150),
      body: n.meeting_link ? `Join: ${n.meeting_link}` : 'Open the calendar for details.',
      entity_type: 'CALENDAR_EVENT',
      entity_id: n.event_id,
      created_by: null,
    });
  }
}
