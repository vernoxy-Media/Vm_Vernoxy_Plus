export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundDomainError extends DomainError {
  constructor(message: string, code = 'NOT_FOUND', field?: string) {
    super(message, code, field);
  }
}

export class ConflictDomainError extends DomainError {
  constructor(message: string, code = 'CONFLICT', field?: string) {
    super(message, code, field);
  }
}

export class ValidationDomainError extends DomainError {
  constructor(message: string, code = 'VALIDATION_ERROR', field?: string) {
    super(message, code, field);
  }
}

export class UnprocessableDomainError extends DomainError {
  constructor(message: string, code = 'UNPROCESSABLE_ENTITY', field?: string) {
    super(message, code, field);
  }
}

export class ForbiddenDomainError extends DomainError {
  constructor(message: string, code = 'FORBIDDEN') {
    super(message, code);
  }
}
