import { HttpStatus } from '@nestjs/common';
import { mapCrmErrorToHttpException } from './crm-error.mapper';
import {
  NotFoundDomainError,
  ConflictDomainError,
  ValidationDomainError,
  UnprocessableDomainError,
  ForbiddenDomainError,
} from '../domain/errors/crm.errors';

describe('CrmErrorMapper', () => {
  it('maps NotFoundDomainError to 404', () => {
    const err = new NotFoundDomainError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.NOT_FOUND);
    const body: any = http.getResponse();
    expect(body.code).toBe('COMPANY_NOT_FOUND');
    expect(body.errors[0].field).toBe('id');
  });

  it('maps ConflictDomainError to 409', () => {
    const err = new ConflictDomainError('Parent cycle detected', 'PARENT_CYCLE', 'parent_company_id');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.CONFLICT);
    const body: any = http.getResponse();
    expect(body.code).toBe('PARENT_CYCLE');
  });

  it('maps ValidationDomainError to 400', () => {
    const err = new ValidationDomainError('Invalid name', 'VALIDATION_ERROR', 'name');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('maps UnprocessableDomainError to 422', () => {
    const err = new UnprocessableDomainError('Industry inactive', 'INDUSTRY_INACTIVE', 'industry_id');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('maps ForbiddenDomainError to 403', () => {
    const err = new ForbiddenDomainError('Forbidden');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('maps Postgres trigger hierarchy cycle error to 409 PARENT_CYCLE', () => {
    const err = new Error('Companies hierarchy cycle detected');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.CONFLICT);
    const body: any = http.getResponse();
    expect(body.code).toBe('PARENT_CYCLE');
  });

  it('maps Postgres trigger in-use error to 409 IN_USE', () => {
    const err = new Error('Company 5 cannot be deleted while it has active child companies');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.CONFLICT);
    const body: any = http.getResponse();
    expect(body.code).toBe('IN_USE');
  });

  it('maps Postgres trigger inactive industry error to 422 INDUSTRY_INACTIVE', () => {
    const err = new Error('Industry 12 is inactive or deleted');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    const body: any = http.getResponse();
    expect(body.code).toBe('INDUSTRY_INACTIVE');
  });

  it('maps Postgres trigger owner inactive error to 422 OWNER_INVALID', () => {
    const err = new Error('Owner employee 3 is not an active employee');
    const http = mapCrmErrorToHttpException(err);
    expect(http.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    const body: any = http.getResponse();
    expect(body.code).toBe('OWNER_INVALID');
  });
});
