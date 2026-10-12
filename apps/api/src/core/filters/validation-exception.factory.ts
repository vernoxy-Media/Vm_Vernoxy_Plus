import { BadRequestException, ValidationError } from '@nestjs/common';

export interface FormattedValidationError {
  field: string;
  code: string;
  message: string;
}

export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FormattedValidationError[] {
  const result: FormattedValidationError[] = [];

  for (const error of errors) {
    const isIndex = /^\d+$/.test(error.property);
    const currentPath = parentPath
      ? isIndex
        ? `${parentPath}[${error.property}]`
        : `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const [code, message] of Object.entries(error.constraints)) {
        result.push({
          field: currentPath,
          code: code.toUpperCase(),
          message,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, currentPath));
    }
  }

  return result;
}

export function createValidationException(errors: ValidationError[]): BadRequestException {
  const formatted = formatValidationErrors(errors);
  const detail = formatted.map((f) => f.message).join('; ') || 'Validation failed';
  return new BadRequestException({
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    code: 'VALIDATION_ERROR',
    detail,
    errors: formatted,
  });
}
