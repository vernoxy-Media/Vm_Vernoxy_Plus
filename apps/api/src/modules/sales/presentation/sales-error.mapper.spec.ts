import { BadRequestException, HttpException } from '@nestjs/common';
import { mapSalesErrorToHttpException } from './sales-error.mapper';
import {
  ConflictSalesError,
  DuplicateCompanyError,
  FieldValidationError,
  ForbiddenSalesError,
  NotFoundSalesError,
  OpenLeadExistsError,
  RightRequiredError,
} from '../domain/errors/sales.errors';

const body = (e: HttpException) => e.getResponse() as Record<string, any>;

describe('mapSalesErrorToHttpException', () => {
  it('passes an HttpException through unchanged', () => {
    const original = new BadRequestException('nope');
    expect(mapSalesErrorToHttpException(original)).toBe(original);
  });

  it('turns a form error into 400 with one entry per field', () => {
    const e = mapSalesErrorToHttpException(new FieldValidationError([{ field: 'name', message: 'Enter the name' }, { field: 'pin', message: 'Bad PIN' }]));
    expect(e.getStatus()).toBe(400);
    expect(body(e).errors.map((x: { field: string }) => x.field)).toEqual(['name', 'pin']);
    expect(body(e).code).toBe('VALIDATION_ERROR');
  });

  it('turns a duplicate company into 409 and carries the matches', () => {
    const matches = [{ company_id: 7, company_code: 'COM-0007', name: 'Acme', city: 'Surat', reason: 'SAME_NAME_CITY' as const }];
    const e = mapSalesErrorToHttpException(new DuplicateCompanyError(matches));
    expect(e.getStatus()).toBe(409);
    expect(body(e).errors[0].matches).toEqual(matches);
  });

  it('turns an existing open lead into 409 and names the lead', () => {
    const e = mapSalesErrorToHttpException(new OpenLeadExistsError({ lead_id: 57, lead_code: 'LEAD-0057', stage: 'Contacted' }));
    expect(e.getStatus()).toBe(409);
    expect(body(e).errors[0].lead.lead_code).toBe('LEAD-0057');
  });

  it('maps not found, conflict and forbidden to 404, 409 and 403', () => {
    expect(mapSalesErrorToHttpException(new NotFoundSalesError('gone')).getStatus()).toBe(404);
    expect(mapSalesErrorToHttpException(new ConflictSalesError('clash')).getStatus()).toBe(409);
    expect(mapSalesErrorToHttpException(new ForbiddenSalesError('no')).getStatus()).toBe(403);
    expect(mapSalesErrorToHttpException(new RightRequiredError('import')).getStatus()).toBe(403);
  });

  it('points a not-found error at the field it names', () => {
    const e = mapSalesErrorToHttpException(new NotFoundSalesError('No such user', 'SALES_USER_NOT_FOUND', 'emp_id'));
    expect(body(e).errors[0]).toMatchObject({ field: 'emp_id', code: 'SALES_USER_NOT_FOUND' });
  });

  it('hides the detail of an unexpected error behind a 500', () => {
    const e = mapSalesErrorToHttpException(new Error('database password is hunter2'));
    expect(e.getStatus()).toBe(500);
    expect(JSON.stringify(body(e))).not.toContain('hunter2');
  });
});
