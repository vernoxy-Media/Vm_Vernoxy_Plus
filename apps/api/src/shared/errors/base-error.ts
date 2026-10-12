export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  constructor(entityName: string, id: string | number) {
    super(`${entityName} with identifier '${id}' was not found`);
  }
}

export class DomainConflictError extends AppError {
  readonly statusCode = 409;
  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  constructor(message = 'Forbidden') {
    super(message);
  }
}
