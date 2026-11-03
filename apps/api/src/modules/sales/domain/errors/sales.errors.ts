export interface FieldError {
  field: string;
  message: string;
}

export abstract class SalesDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundSalesError extends SalesDomainError {
  constructor(message: string, code = 'NOT_FOUND', field?: string) {
    super(message, code, field);
  }
}

export class ConflictSalesError extends SalesDomainError {
  constructor(message: string, code = 'CONFLICT', field?: string) {
    super(message, code, field);
  }
}

export class ForbiddenSalesError extends SalesDomainError {
  constructor(message: string, code = 'FORBIDDEN') {
    super(message, code);
  }
}

/** One or more form fields failed validation; nothing was saved. */
export class FieldValidationError extends SalesDomainError {
  constructor(public readonly errors: FieldError[]) {
    super('Please correct the highlighted fields.', 'VALIDATION_ERROR');
  }
}

export interface DuplicateMatch {
  company_id: number;
  company_code: string | null;
  name: string;
  city: string | null;
  reason: 'SAME_NAME_CITY' | 'SAME_MOBILE' | 'SAME_EMAIL';
}

/**
 * "Duplicate is a warning, not a wall": the caller may repeat the request with
 * confirm_duplicate = true to confirm it is a different company.
 */
export class DuplicateCompanyError extends SalesDomainError {
  constructor(public readonly matches: DuplicateMatch[]) {
    super(
      `This company already exists as ${matches[0].company_code ?? 'COM-' + matches[0].company_id}. Open it?`,
      'DUPLICATE_COMPANY',
    );
  }
}

export interface OpenLeadRef {
  lead_id: number;
  lead_code: string | null;
  stage: string;
}

/**
 * BFD section 6 "One open lead": the company already has a New / Contacted /
 * Qualified / On Hold lead, so the UI opens that lead instead of creating another.
 */
export class OpenLeadExistsError extends SalesDomainError {
  constructor(public readonly lead: OpenLeadRef) {
    super(
      `This company is already ${lead.lead_code ?? 'LEAD-' + lead.lead_id} (${lead.stage}).`,
      'OPEN_LEAD_EXISTS',
    );
  }
}

export interface ContactDuplicateMatch {
  company_id: number;
  company_code: string | null;
  company_name: string;
  contact_name: string;
  reason: 'SAME_MOBILE' | 'SAME_EMAIL';
}

/** BFD section 5 "Same person twice": the mobile / email already belongs to a contact of another company. A warning. */
export class DuplicateContactError extends SalesDomainError {
  constructor(public readonly matches: ContactDuplicateMatch[]) {
    super(`This person already exists at ${matches[0].company_name} (${matches[0].company_code ?? 'COM-' + matches[0].company_id}).`, 'DUPLICATE_CONTACT');
  }
}

/** "Qualify Lead" with an incomplete checklist: the missing items are shown in amber and the button stays off. */
export class QualificationIncompleteError extends SalesDomainError {
  constructor(public readonly missing: Array<{ key: string; label: string }>) {
    super('This lead is not ready to be qualified yet.', 'QUALIFICATION_INCOMPLETE');
  }
}

/** The action does not apply to the lead's current status (e.g. Qualify on a New lead). */
export class InvalidTransitionError extends SalesDomainError {
  constructor(message: string) {
    super(message, 'INVALID_TRANSITION');
  }
}

/** The uploaded file cannot be used (too big, wrong type, too many rows, ...). */
export class FileProblemError extends SalesDomainError {
  constructor(
    message: string,
    code: string,
    public readonly httpStatus: 400 | 413 | 415 | 422 = 422,
  ) {
    super(message, code);
  }
}

/** An import or export that the user is not allowed to run. */
export class RightRequiredError extends SalesDomainError {
  constructor(public readonly right: 'import' | 'export') {
    super(`You do not have the ${right === 'import' ? 'Import' : 'Export'} right. Ask the Admin to give it to you.`, 'RIGHT_REQUIRED');
  }
}

/** The 24-hour undo is not possible: something was added to the imported companies. */
export class ImportNotUndoableError extends SalesDomainError {
  constructor(
    message: string,
    public readonly blockers: Array<{ company_id: number; company_code: string | null; name: string; reason: string }> = [],
  ) {
    super(message, 'IMPORT_NOT_UNDOABLE');
  }
}
