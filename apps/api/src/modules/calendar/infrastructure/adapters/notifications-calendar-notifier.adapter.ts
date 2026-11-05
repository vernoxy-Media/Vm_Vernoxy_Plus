import { Injectable } from '@nestjs/common';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import type { CalendarNotifierPort, MeetingReminderNotice } from '../../domain/ports/calendar-notifier.port';

@Injectable()
export class NotificationsCalendarNotifierAdapter implements CalendarNotifierPort {
  constructor(private readonly createNotification: CreateNotificationUseCase) {}

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
