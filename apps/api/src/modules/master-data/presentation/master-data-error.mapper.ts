import { HttpException, HttpStatus } from '@nestjs/common';
import {
  NotFoundDomainError,
  ConflictDomainError,
  ValidationDomainError,
  UnprocessableDomainError,
  ForbiddenDomainError,
} from '../domain/errors/master-data.errors';

export function mapMasterDataErrorToHttpException(error: unknown): HttpException {
  if (error instanceof NotFoundDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: HttpStatus.NOT_FOUND,
        code: error.code || 'NOT_FOUND',
        detail: error.message,
        errors: [{ field: error.field || 'id', code: error.code || 'NOT_FOUND', message: error.message }],
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
        code: error.code || 'CONFLICT',
        detail: error.message,
        errors: [{ field: error.field || 'general', code: error.code || 'CONFLICT', message: error.message }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof ValidationDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Bad Request',
        status: HttpStatus.BAD_REQUEST,
        code: error.code || 'VALIDATION_ERROR',
        detail: error.message,
        errors: [{ field: error.field || 'general', code: error.code || 'VALIDATION_ERROR', message: error.message }],
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (error instanceof UnprocessableDomainError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: error.code || 'UNPROCESSABLE_ENTITY',
        detail: error.message,
        errors: [{ field: error.field || 'general', code: error.code || 'UNPROCESSABLE_ENTITY', message: error.message }],
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
        code: error.code || 'FORBIDDEN',
        detail: error.message,
        errors: [{ field: 'general', code: error.code || 'FORBIDDEN', message: error.message }],
      },
      HttpStatus.FORBIDDEN,
    );
  }

  // Handle Postgres/Prisma errors
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (/Default (industry|customer type) cannot be (deactivated or deleted|inactive)/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'DEFAULT_PROTECTED',
        detail: 'The default item cannot be deactivated or deleted.',
        errors: [{ field: 'general', code: 'DEFAULT_PROTECTED', message: 'The default item cannot be deactivated or deleted.' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (/cannot be deactivated or deleted while (it has active sub-industries|referenced by active companies)/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'IN_USE',
        detail: 'Cannot deactivate or delete this item because it has active dependencies.',
        errors: [{ field: 'general', code: 'IN_USE', message: 'Cannot deactivate or delete this item because it has active dependencies.' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (/Sub-industry cannot be active while its parent industry .* is inactive/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'PARENT_INACTIVE',
        detail: 'Sub-industry cannot be activated while its parent industry is inactive or deleted.',
        errors: [{ field: 'is_active', code: 'PARENT_INACTIVE', message: 'Sub-industry cannot be activated while its parent industry is inactive.' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
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
