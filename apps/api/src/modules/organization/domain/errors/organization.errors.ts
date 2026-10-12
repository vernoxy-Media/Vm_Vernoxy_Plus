export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundDomainError extends DomainError {
  constructor(entityName: string, id: number | string) {
    super('NOT_FOUND', `${entityName} with ID ${id} was not found.`);
  }
}

export class ConflictDomainError extends DomainError {
  constructor(code: string, message: string, field?: string) {
    super(code, message, field);
  }
}

export class UnprocessableDomainError extends DomainError {
  constructor(code: string, message: string, field?: string) {
    super(code, message, field);
  }
}

export class ForbiddenDomainError extends DomainError {
  constructor(message = 'Access denied: Organization administrator access required') {
    super('FORBIDDEN', message);
  }
}

export class ValidationDomainError extends DomainError {
  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, field);
  }
}
