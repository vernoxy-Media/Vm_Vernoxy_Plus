import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CalendarEventNotFoundError,
  CalendarPermissionDeniedError,
  CalendarConflictError,
  InvalidEventTimeError,
  InvalidMeetingLinkError,
} from '../domain/errors/calendar.errors';

export function mapCalendarErrorToHttp(err: unknown): HttpException {
  if (err instanceof CalendarEventNotFoundError) {
    return new NotFoundException(err.message);
  }
  if (err instanceof CalendarPermissionDeniedError) {
    return new ForbiddenException(err.message);
  }
  if (err instanceof CalendarConflictError) {
    return new ConflictException({ statusCode: 409, error: 'Conflict', code: 'MEETING_CONFLICT', message: err.message, conflicts: err.conflicts });
  }
  if (err instanceof InvalidEventTimeError || err instanceof InvalidMeetingLinkError) {
    return new BadRequestException(err.message);
  }
  if (err instanceof HttpException) {
    return err;
  }
  const message = err instanceof Error ? err.message : 'An unexpected calendar error occurred';
  return new InternalServerErrorException(message);
}
