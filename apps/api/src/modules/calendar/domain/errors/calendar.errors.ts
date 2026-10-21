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
