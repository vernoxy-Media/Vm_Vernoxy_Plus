import { mapDomainErrorToHttpException } from './organization-error.mapper';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
  ForbiddenDomainError,
} from '../domain/errors/organization.errors';
import { HttpStatus } from '@nestjs/common';

describe('organization-error.mapper', () => {
  it('maps NotFoundDomainError to 404 with NOT_FOUND code', () => {
    const error = new NotFoundDomainError('Department', 99);
    const httpEx = mapDomainErrorToHttpException(error);
    expect(httpEx.getStatus()).toBe(HttpStatus.NOT_FOUND);
    const resp = httpEx.getResponse() as any;
    expect(resp.code).toBe('NOT_FOUND');
    expect(resp.detail).toContain('Department with ID 99 was not found');
  });

  it('maps ConflictDomainError to 409 with specified code and field', () => {
    const error = new ConflictDomainError(
      'DEPARTMENT_NAME_EXISTS',
      'Department name taken',
      'name',
    );
    const httpEx = mapDomainErrorToHttpException(error);
    expect(httpEx.getStatus()).toBe(HttpStatus.CONFLICT);
    const resp = httpEx.getResponse() as any;
    expect(resp.code).toBe('DEPARTMENT_NAME_EXISTS');
    expect(resp.field).toBe('name');
  });

  it('maps UnprocessableDomainError and ValidationDomainError to 422', () => {
    const unprocessable = new UnprocessableDomainError(
      'ROLE_NOT_IN_DEPARTMENT',
      'Role mismatch',
      'role_id',
    );
    const httpEx1 = mapDomainErrorToHttpException(unprocessable);
    expect(httpEx1.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

    const validation = new ValidationDomainError('Invalid email', 'email');
    const httpEx2 = mapDomainErrorToHttpException(validation);
    expect(httpEx2.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('maps ForbiddenDomainError to 403', () => {
    const forbidden = new ForbiddenDomainError('Access denied');
    const httpEx = mapDomainErrorToHttpException(forbidden);
    expect(httpEx.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('maps generic unknown Error to 500', () => {
    const err = new Error('Database crash');
    const httpEx = mapDomainErrorToHttpException(err);
    expect(httpEx.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
