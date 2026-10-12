import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
  ForbiddenDomainError,
} from '../domain/errors/organization.errors';

export function mapDomainErrorToHttpException(error: unknown): HttpException {
  if (error instanceof NotFoundDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: HttpStatus.NOT_FOUND,
        code: error.code,
        detail: error.message,
        field: error.field,
      },
      HttpStatus.NOT_FOUND,
    );
  }

  if (error instanceof ConflictDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: error.code,
        detail: error.message,
        field: error.field,
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof UnprocessableDomainError || error instanceof ValidationDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: error.code,
        detail: error.message,
        field: error.field,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (error instanceof ForbiddenDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: HttpStatus.FORBIDDEN,
        code: error.code,
        detail: error.message,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  if (error instanceof HttpException) {
    return error;
  }

  return new HttpException(
    {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: error instanceof Error ? error.message : 'An unexpected error occurred',
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
