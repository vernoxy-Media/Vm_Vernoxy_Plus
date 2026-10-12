import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const HTTP_STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let detail = 'An unexpected error occurred.';
    let errors: any = undefined;

    if (typeof exceptionResponse === 'string') {
      detail = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      if (Array.isArray(respObj.message)) {
        detail = respObj.message.join('; ');
        errors = respObj.message;
      } else if (typeof respObj.message === 'string') {
        detail = respObj.message;
      } else if (respObj.detail) {
        detail = respObj.detail;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    const title = HTTP_STATUS_TITLES[status] || (status >= 500 ? 'Server Error' : 'Client Error');

    const problemDetails: Record<string, any> = {
      type: 'about:blank',
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      problemDetails.invalid_params = errors;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      if (respObj.code) {
        problemDetails.code = respObj.code;
      }
      if (respObj.field) {
        problemDetails.field = respObj.field;
      }
      if (respObj.errors) {
        problemDetails.errors = respObj.errors;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response
      .status(status)
      .setHeader('Content-Type', 'application/problem+json; charset=utf-8')
      .json(problemDetails);
  }
}
