import type { ApiProblemResponse, ApiFieldError, DuplicateMatchItem } from '../types/sales.types';

export interface ParsedApiError {
  code?: string;
  message: string;
  detail?: string;
  fieldErrors: Record<string, string>;
  duplicateMatches?: DuplicateMatchItem[];
  /** Same as duplicateMatches. */
  matches?: DuplicateMatchItem[];
  /** The field-level errors exactly as the API sent them. */
  errors?: ApiFieldError[];
  openLead?: { lead_id: number; lead_code: string | null; stage: string };
  blockers?: Array<{ company_id: number; company_code: string | null; name: string; reason: string }>;
  raw: unknown;
}

export function parseApiError(error: unknown): ParsedApiError {
  const result: ParsedApiError = {
    message: 'An unexpected error occurred. Please try again.',
    fieldErrors: {},
    raw: error,
  };

  if (!error) return result;

  const errObj = error as ApiProblemResponse;

  if (errObj.detail) {
    result.detail = errObj.detail;
    result.message = errObj.detail;
  } else if (errObj.message) {
    result.message = errObj.message;
  }

  if (errObj.code) {
    result.code = errObj.code;
  }

  if (Array.isArray(errObj.errors)) {
    result.errors = errObj.errors;
    for (const item of errObj.errors) {
      if (item.field && item.message) {
        result.fieldErrors[item.field] = item.message;
      }
      if (item.matches && item.matches.length > 0) {
        result.duplicateMatches = item.matches;
        result.matches = item.matches;
      }
      if (item.lead) {
        result.openLead = item.lead;
      }
      if (item.blockers && item.blockers.length > 0) {
        result.blockers = item.blockers;
      }
    }
  }

  return result;
}
