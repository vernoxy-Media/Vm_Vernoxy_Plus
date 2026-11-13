/**
 * What went wrong, in words a person can act on, from whatever a failed request threw.
 *
 * The API answers with a Problem Details body: { detail, field?, code?, invalid_params?: string[], errors? }.
 * `customFetch` throws that body as it is (it is not an Error and has no `message`), which is why reading only
 * `err.message` ended in a generic "please try again". This reads every shape.
 */
export interface ApiIssue {
  /** The name of the field the problem is about, when the server named one. */
  field?: string;
  message: string;
}

export interface ParsedApiError {
  /** One line to show above the form. */
  message: string;
  status?: number;
  code?: string;
  /** Problems with single fields, when the server said which. */
  issues: ApiIssue[];
}

const NETWORK = 'Could not reach the server. Check your internet connection and try again.';

const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "email must be an email" -> { field: 'email', message: 'Must be an email' } (class-validator's wording). */
function fromValidatorText(text: string): ApiIssue {
  const m = /^([A-Za-z_][\w]*(?:\.[\w]+)*)\s+(.+)$/.exec(text.trim());
  if (!m) return { message: capital(text.trim()) };
  return { field: m[1], message: capital(m[2]!) };
}

export function parseApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError {
  if (err === null || err === undefined) return { message: fallback, issues: [] };
  if (typeof err === 'string') return { message: err || fallback, issues: [] };

  // fetch() itself failed: no connection, or the server is down
  if (err instanceof TypeError) return { message: NETWORK, issues: [] };
  if (err instanceof Error) {
    const net = /failed to fetch|networkerror|load failed/i.test(err.message);
    return { message: net ? NETWORK : err.message || fallback, issues: [] };
  }

  const o = err as Record<string, unknown>;
  const issues: ApiIssue[] = [];

  if (Array.isArray(o.invalid_params)) {
    for (const p of o.invalid_params) if (typeof p === 'string') issues.push(fromValidatorText(p));
  }
  if (Array.isArray(o.errors)) {
    for (const e of o.errors) {
      if (typeof e === 'string') issues.push(fromValidatorText(e));
      else if (e && typeof e === 'object') {
        const x = e as Record<string, unknown>;
        const msg = typeof x.message === 'string' ? x.message : typeof x.detail === 'string' ? x.detail : '';
        if (msg) issues.push({ field: typeof x.field === 'string' ? x.field : undefined, message: capital(msg) });
      }
    }
  }

  const detail = typeof o.detail === 'string' ? o.detail : typeof o.message === 'string' ? o.message : Array.isArray(o.message) ? o.message.join('; ') : '';
  if (typeof o.field === 'string' && detail && !issues.some((i) => i.field === o.field)) {
    issues.unshift({ field: o.field, message: detail });
  }

  return {
    message: detail || (issues.length ? issues.map((i) => i.message).join('; ') : fallback),
    status: typeof o.status === 'number' ? o.status : undefined,
    code: typeof o.code === 'string' ? o.code : undefined,
    issues,
  };
}
