import * as crypto from 'crypto';

/**
 * Resume links are opened in a new browser tab, which cannot send the login token. So instead of
 * a public file route, every link the API hands out carries an expiry and an HMAC signature
 * (FILE_URL_SECRET, FILE_URL_TTL_SECONDS), and the download route refuses anything else.
 * The database keeps the plain path; signatures are added on the way out and removed on save.
 */
export const RESUME_PATH_PREFIX = '/api/v1/candidates/resumes/';

const secret = () => process.env.FILE_URL_SECRET || 'vernoxy-pulse-file-url-secret-minimum-32-chars-long';
const ttlSeconds = () => Number(process.env.FILE_URL_TTL_SECONDS) || 3600;

const signature = (filename: string, exp: number) =>
  crypto.createHmac('sha256', secret()).update(`candidate-resume:${filename}:${exp}`).digest('hex');

/** The stored form: no query string. */
export function stripResumeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.split('?')[0];
}

/** A link that works for FILE_URL_TTL_SECONDS. Links to other hosts are returned unchanged. */
export function signResumeUrl(url: string | null | undefined): string | null {
  const clean = stripResumeUrl(url);
  if (!clean) return null;
  const at = clean.indexOf(RESUME_PATH_PREFIX);
  if (at < 0) return clean;
  const filename = clean.slice(at + RESUME_PATH_PREFIX.length);
  if (!filename) return clean;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds();
  return `${clean}?exp=${exp}&sig=${signature(filename, exp)}`;
}

export function isValidResumeSignature(filename: string, exp: string | undefined, sig: string | undefined): boolean {
  const expNum = Number(exp);
  if (!sig || !Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(signature(filename, expNum), 'hex');
  const given = Buffer.from(String(sig), 'hex');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
