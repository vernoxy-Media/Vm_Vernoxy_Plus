export class AttendanceDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotWorkingError extends AttendanceDomainError {
  constructor(message = 'Cannot start break when not in working state') {
    super('NOT_WORKING', message, 409);
  }
}

export class AlreadyOnBreakError extends AttendanceDomainError {
  constructor(message = 'Already on break') {
    super('ALREADY_ON_BREAK', message, 409);
  }
}

export class NotOnBreakError extends AttendanceDomainError {
  constructor(message = 'Not currently on a break') {
    super('NOT_ON_BREAK', message, 409);
  }
}

export class AlreadyPunchedInError extends AttendanceDomainError {
  constructor(message = 'Already punched in today', details?: Record<string, any>) {
    super('ALREADY_PUNCHED_IN', message, 409, details);
  }
}

export class AlreadyPunchedOutError extends AttendanceDomainError {
  constructor(message = 'Already punched out today', details?: Record<string, any>) {
    super('ALREADY_PUNCHED_OUT', message, 409, details);
  }
}

export class FullDayLeaveBlockedError extends AttendanceDomainError {
  constructor(message = 'Punch in blocked: on approved full-day leave') {
    super('ON_FULL_DAY_LEAVE', message, 403);
  }
}

export class SessionTooLongError extends AttendanceDomainError {
  constructor(message = 'Session length exceeds 16 hours') {
    super('SESSION_TOO_LONG', message, 422);
  }
}

export class BreakExceedsSessionError extends AttendanceDomainError {
  constructor(message = 'Total break time exceeds punch session length') {
    super('BREAK_EXCEEDS_SESSION', message, 422);
  }
}

export class AttendanceNotFoundError extends AttendanceDomainError {
  constructor(message = 'Attendance record not found') {
    super('ATTENDANCE_NOT_FOUND', message, 404);
  }
}

export class CorrectionNotFoundError extends AttendanceDomainError {
  constructor(message = 'Correction request not found') {
    super('CORRECTION_NOT_FOUND', message, 404);
  }
}
