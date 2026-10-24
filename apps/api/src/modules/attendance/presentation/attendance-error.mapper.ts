import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AttendanceDomainError,
  NotWorkingError,
  AlreadyOnBreakError,
  NotOnBreakError,
  AlreadyPunchedInError,
  AlreadyPunchedOutError,
  FullDayLeaveBlockedError,
  SessionTooLongError,
  BreakExceedsSessionError,
  AttendanceNotFoundError,
  CorrectionNotFoundError,
} from '../domain/errors/attendance.errors';

export function mapAttendanceErrorToHttp(error: unknown): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  if (error instanceof AttendanceDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Bad Request',
        status: error.statusCode || HttpStatus.BAD_REQUEST,
        detail: error.message,
        errors: [{ field: 'attendance', code: error.code || 'BAD_REQUEST', message: error.message }],
      },
      error.statusCode || HttpStatus.BAD_REQUEST,
    );
  }

  // Handle Domain Errors
  if (error instanceof AlreadyPunchedInError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'ALREADY_PUNCHED_IN', message: error.message }],
        today: error.details?.today,
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof AlreadyPunchedOutError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'ALREADY_PUNCHED_OUT', message: error.message }],
        today: error.details?.today,
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof NotWorkingError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'NOT_WORKING', message: error.message }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof AlreadyOnBreakError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'ALREADY_ON_BREAK', message: error.message }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof NotOnBreakError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'NOT_ON_BREAK', message: error.message }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof FullDayLeaveBlockedError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: HttpStatus.FORBIDDEN,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'ON_FULL_DAY_LEAVE', message: error.message }],
      },
      HttpStatus.FORBIDDEN,
    );
  }

  if (error instanceof SessionTooLongError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: error.message,
        errors: [{ field: 'attendance', code: 'SESSION_TOO_LONG', message: error.message }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (error instanceof BreakExceedsSessionError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: error.message,
        errors: [{ field: 'break_minutes', code: 'BREAK_EXCEEDS_SESSION', message: error.message }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (error instanceof AttendanceNotFoundError || error instanceof CorrectionNotFoundError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: HttpStatus.NOT_FOUND,
        detail: error.message,
        errors: [{ field: 'id', code: error.code, message: error.message }],
      },
      HttpStatus.NOT_FOUND,
    );
  }

  if (error instanceof AttendanceDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: error.statusCode >= 500 ? 'Server Error' : 'Client Error',
        status: error.statusCode,
        detail: error.message,
        errors: [{ field: 'attendance', code: error.code, message: error.message }],
      },
      error.statusCode,
    );
  }

  // Handle Postgres Constraint/Exclusion/Trigger errors
  const msg = error instanceof Error ? error.message : String(error);

  if (
    msg.includes('ux_attendance_breaks_single_open') ||
    msg.includes('ex_attendance_breaks_no_overlap')
  ) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: 'Already on break or overlapping break interval',
        errors: [{ field: 'attendance', code: 'ALREADY_ON_BREAK', message: 'Already on break' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (
    msg.includes('ck_attendance_days_break_le_session') ||
    msg.includes('ck_attendance_corrections_break_le_session')
  ) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'Break minutes cannot exceed total session minutes',
        errors: [{ field: 'break_minutes', code: 'BREAK_EXCEEDS_SESSION', message: 'Break exceeds session' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (
    msg.includes('Cannot close attendance day') ||
    msg.includes('Cannot add break to an already closed')
  ) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: msg,
        errors: [{ field: 'attendance', code: 'NOT_WORKING', message: msg }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (msg.includes('ux_attendance_days_emp_date')) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        detail: 'Already punched in today',
        errors: [{ field: 'attendance', code: 'ALREADY_PUNCHED_IN', message: 'Already punched in today' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  return new HttpException(
    {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: msg,
      errors: [{ field: 'server', code: 'INTERNAL_ERROR', message: msg }],
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
