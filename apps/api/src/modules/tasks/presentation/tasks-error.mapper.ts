import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AssigneeValidationError,
  InvalidStageTransitionError,
  TaskCompletedLockedError,
  TaskNotFoundError,
  TaskPermissionDeniedError,
} from '../domain/errors/task.errors';

export function mapTaskErrorToHttp(err: unknown): HttpException {
  if (err instanceof TaskNotFoundError) {
    return new NotFoundException(err.message);
  }
  if (err instanceof InvalidStageTransitionError || err instanceof AssigneeValidationError) {
    return new BadRequestException(err.message);
  }
  if (err instanceof TaskCompletedLockedError) {
    return new ConflictException(err.message);
  }
  if (err instanceof TaskPermissionDeniedError) {
    return new ForbiddenException(err.message);
  }
  if (err instanceof HttpException) {
    return err;
  }
  const message = err instanceof Error ? err.message : 'An unexpected task error occurred';
  return new InternalServerErrorException(message);
}
