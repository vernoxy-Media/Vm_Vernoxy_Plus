export class CalendarEventNotFoundError extends Error {
  constructor(eventId: number) {
    super(`Calendar event #${eventId} not found`);
    this.name = 'CalendarEventNotFoundError';
  }
}

export class CalendarPermissionDeniedError extends Error {
  constructor(message = 'You do not have permission to modify this calendar event') {
    super(message);
    this.name = 'CalendarPermissionDeniedError';
  }
}

export class InvalidEventTimeError extends Error {
  constructor(message = 'Event end time must be after start time') {
    super(message);
    this.name = 'InvalidEventTimeError';
  }
}

export class InvalidMeetingLinkError extends Error {
  constructor(message = 'Use a Google Meet link, like https://meet.google.com/abc-defg-hij') {
    super(message);
    this.name = 'InvalidMeetingLinkError';
  }
}

export interface MeetingConflict {
  employee_id: number;
  employee_name: string;
  event_id: number;
  title: string;
  start_time: Date;
  end_time: Date;
}

/** Someone invited to a meeting is already in another meeting at that time. */
export class CalendarConflictError extends Error {
  constructor(public readonly conflicts: MeetingConflict[]) {
    super('Someone is already booked in another meeting at this time.');
    this.name = 'CalendarConflictError';
  }
}
