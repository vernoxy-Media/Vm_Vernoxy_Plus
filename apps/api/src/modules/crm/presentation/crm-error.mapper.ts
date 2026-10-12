import { HttpException, HttpStatus } from '@nestjs/common';
import {
  NotFoundDomainError,
  ConflictDomainError,
  ValidationDomainError,
  UnprocessableDomainError,
  ForbiddenDomainError,
} from '../domain/errors/crm.errors';

export function mapCrmErrorToHttpException(error: unknown): HttpException {
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

  if (error instanceof HttpException) {
    return error;
  }

  // Handle Postgres/Prisma raw database errors
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (/hierarchy cycle/i.test(rawMessage) || /PARENT_CYCLE/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'PARENT_CYCLE',
        detail: 'Parent company cycle detected',
        errors: [{ field: 'parent_company_id', code: 'PARENT_CYCLE', message: 'Parent company cycle detected' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (/cannot be deleted while it has active child companies/i.test(rawMessage) || /cannot be deleted while it has active leads/i.test(rawMessage) || /IN_USE/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'IN_USE',
        detail: 'Company cannot be deleted while it has active child companies or active leads',
        errors: [{ field: 'general', code: 'IN_USE', message: 'Company cannot be deleted while it has active child companies or active leads' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (/ux_company_channels_primary/i.test(rawMessage) || /ux_company_persons_company_primary/i.test(rawMessage) || /PRIMARY_CONFLICT/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'PRIMARY_CONFLICT',
        detail: 'Multiple primary entries are not allowed',
        errors: [{ field: 'general', code: 'PRIMARY_CONFLICT', message: 'Multiple primary entries are not allowed' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (/ux_company_channels_company_type_value/i.test(rawMessage) || /DUPLICATE_CHANNEL/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'DUPLICATE_CHANNEL',
        detail: 'Duplicate channel for this company',
        errors: [{ field: 'channels', code: 'DUPLICATE_CHANNEL', message: 'Duplicate channel for this company' }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (/Industry .* is inactive or deleted/i.test(rawMessage) || /INDUSTRY_INACTIVE/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'INDUSTRY_INACTIVE',
        detail: 'Industry is inactive or deleted',
        errors: [{ field: 'industry_id', code: 'INDUSTRY_INACTIVE', message: 'Industry is inactive or deleted' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (/Sub-industry .* does not belong to industry/i.test(rawMessage) || /SUB_INDUSTRY_MISMATCH/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'SUB_INDUSTRY_MISMATCH',
        detail: 'Sub-industry does not belong to the selected industry',
        errors: [{ field: 'sub_industry_id', code: 'SUB_INDUSTRY_MISMATCH', message: 'Sub-industry does not belong to the selected industry' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (/Customer type .* is inactive or deleted/i.test(rawMessage) || /CUSTOMER_TYPE_INACTIVE/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'CUSTOMER_TYPE_INACTIVE',
        detail: 'Customer type is inactive or deleted',
        errors: [{ field: 'customer_type_id', code: 'CUSTOMER_TYPE_INACTIVE', message: 'Customer type is inactive or deleted' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (/Owner .* is not an active employee/i.test(rawMessage) || /OWNER_INVALID/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'OWNER_INVALID',
        detail: 'Owner is not an active, non-deleted employee',
        errors: [{ field: 'owner_id', code: 'OWNER_INVALID', message: 'Owner is not an active, non-deleted employee' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (/Parent company .* is deleted/i.test(rawMessage) || /PARENT_COMPANY_INVALID/i.test(rawMessage)) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'PARENT_COMPANY_INVALID',
        detail: 'Parent company is deleted or invalid',
        errors: [{ field: 'parent_company_id', code: 'PARENT_COMPANY_INVALID', message: 'Parent company is deleted or invalid' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
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
