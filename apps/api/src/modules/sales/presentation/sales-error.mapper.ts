import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ConflictSalesError,
  DuplicateCompanyError,
  DuplicateContactError,
  InvalidTransitionError,
  QualificationIncompleteError,
  FieldValidationError,
  FileProblemError,
  ForbiddenSalesError,
  ImportNotUndoableError,
  RightRequiredError,
  NotFoundSalesError,
  OpenLeadExistsError,
  SalesDomainError,
} from '../domain/errors/sales.errors';

function problem(status: HttpStatus, title: string, code: string, detail: string, extra: Record<string, unknown> = {}) {
  return new HttpException({ type: 'about:blank', title, status, code, detail, ...extra }, status);
}

/** Maps sales domain errors to RFC 7807 problem responses (same shape as the CRM module). */
export function mapSalesErrorToHttpException(error: unknown): HttpException {
  if (error instanceof HttpException) return error;

  if (error instanceof FieldValidationError) {
    return problem(HttpStatus.BAD_REQUEST, 'Bad Request', error.code, error.message, {
      errors: error.errors.map((e) => ({ field: e.field, code: 'INVALID', message: e.message })),
    });
  }
  if (error instanceof DuplicateCompanyError) {
    // The global exception filter forwards only `errors`, so the matches ride inside errors[0].
    return problem(HttpStatus.CONFLICT, 'Conflict', error.code, error.message, {
      errors: [{ field: 'name', code: error.code, message: error.message, matches: error.matches }],
    });
  }
  if (error instanceof DuplicateContactError) {
    return problem(HttpStatus.CONFLICT, 'Conflict', error.code, error.message, {
      errors: [{ field: 'mobile', code: error.code, message: error.message, matches: error.matches }],
    });
  }
  if (error instanceof QualificationIncompleteError) {
    // Missing checklist items are shown in amber and "Mark as Qualified" stays off.
    return problem(HttpStatus.UNPROCESSABLE_ENTITY, 'Unprocessable Entity', error.code, error.message, {
      errors: error.missing.map((m) => ({ field: m.key, code: error.code, message: m.label })),
    });
  }
  if (error instanceof InvalidTransitionError) {
    return problem(HttpStatus.CONFLICT, 'Conflict', error.code, error.message, {
      errors: [{ field: 'status', code: error.code, message: error.message }],
    });
  }
  if (error instanceof FileProblemError) {
    const title = error.httpStatus === 413 ? 'Payload Too Large' : error.httpStatus === 415 ? 'Unsupported Media Type' : error.httpStatus === 400 ? 'Bad Request' : 'Unprocessable Entity';
    return problem(error.httpStatus, title, error.code, error.message, { errors: [{ field: 'file', code: error.code, message: error.message }] });
  }
  if (error instanceof RightRequiredError) {
    return problem(HttpStatus.FORBIDDEN, 'Forbidden', error.code, error.message);
  }
  if (error instanceof ImportNotUndoableError) {
    return problem(HttpStatus.CONFLICT, 'Conflict', error.code, error.message, {
      errors: [{ field: 'job_id', code: error.code, message: error.message, blockers: error.blockers }],
    });
  }
  if (error instanceof OpenLeadExistsError) {
    // errors[0].lead lets the UI open the existing lead ("This company is already LEAD-0057 (Contacted)").
    return problem(HttpStatus.CONFLICT, 'Conflict', error.code, error.message, {
      errors: [{ field: 'company_id', code: error.code, message: error.message, lead: error.lead }],
    });
  }
  if (error instanceof NotFoundSalesError) {
    return problem(HttpStatus.NOT_FOUND, 'Not Found', error.code, error.message, {
      errors: [{ field: error.field ?? 'id', code: error.code, message: error.message }],
    });
  }
  if (error instanceof ConflictSalesError) {
    return problem(HttpStatus.CONFLICT, 'Conflict', error.code, error.message, {
      errors: [{ field: error.field ?? 'general', code: error.code, message: error.message }],
    });
  }
  if (error instanceof ForbiddenSalesError) {
    return problem(HttpStatus.FORBIDDEN, 'Forbidden', error.code, error.message);
  }
  if (error instanceof SalesDomainError) {
    return problem(HttpStatus.UNPROCESSABLE_ENTITY, 'Unprocessable Entity', error.code, error.message);
  }
  return problem(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error', 'INTERNAL_ERROR', 'Unexpected error');
}
