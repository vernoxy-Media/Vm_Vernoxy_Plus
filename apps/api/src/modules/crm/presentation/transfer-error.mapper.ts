import { HttpException, HttpStatus } from '@nestjs/common';
import {
  TransferJobNotFoundError,
  JobExpiredError,
  JobStateInvalidError,
  ExportTooLargeError,
} from '../domain/errors/crm-transfer.errors';
import { FileInspectionError } from '../../data-transfer/public-api';

export function mapTransferErrorToHttpException(error: unknown): HttpException {
  if (error instanceof TransferJobNotFoundError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        detail: error.message,
        errors: [{ field: 'job_id', code: 'NOT_FOUND', message: error.message }],
      },
      HttpStatus.NOT_FOUND,
    );
  }

  if (error instanceof JobExpiredError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Gone',
        status: HttpStatus.GONE,
        code: 'JOB_EXPIRED',
        detail: error.message,
        errors: [{ field: 'job_id', code: 'JOB_EXPIRED', message: error.message }],
      },
      HttpStatus.GONE,
    );
  }

  if (error instanceof JobStateInvalidError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: HttpStatus.CONFLICT,
        code: 'JOB_STATE_INVALID',
        detail: error.message,
        errors: [{ field: 'job_id', code: 'JOB_STATE_INVALID', message: error.message }],
      },
      HttpStatus.CONFLICT,
    );
  }

  if (error instanceof ExportTooLargeError) {
    return new HttpException(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'EXPORT_TOO_LARGE',
        detail: error.message,
        errors: [{ field: 'filters', code: 'EXPORT_TOO_LARGE', message: error.message }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (error instanceof FileInspectionError) {
    return new HttpException(
      {
        type: 'about:blank',
        title:
          error.statusCode === 413
            ? 'Payload Too Large'
            : error.statusCode === 415
            ? 'Unsupported Media Type'
            : 'Unprocessable Entity',
        status: error.statusCode,
        code: error.code,
        detail: error.message,
        errors: [{ field: 'file', code: error.code, message: error.message }],
      },
      error.statusCode,
    );
  }

  if (error instanceof HttpException) {
    return error;
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  // Mask paths and storage keys
  const sanitized = rawMessage.replace(/[a-f0-9]{32}\.(xlsx|csv|webp)/gi, '[REDACTED_KEY]');

  return new HttpException(
    {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      detail: 'An error occurred during data transfer',
      errors: [{ field: 'general', code: 'INTERNAL_ERROR', message: sanitized }],
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
