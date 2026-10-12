export class AuthException extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = 'AuthException';
  }
}

export class UnauthorizedAuthException extends AuthException {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedAuthException';
  }
}

export class ForbiddenAuthException extends AuthException {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenAuthException';
  }
}

export class BadRequestAuthException extends AuthException {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
    this.name = 'BadRequestAuthException';
  }
}

export class TooManyRequestsAuthException extends AuthException {
  constructor(message: string = 'Too Many Requests') {
    super(message, 429);
    this.name = 'TooManyRequestsAuthException';
  }
}
