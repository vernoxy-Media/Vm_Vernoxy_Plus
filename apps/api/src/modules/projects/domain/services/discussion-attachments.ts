/**
 * Files shared in a project discussion (and in the comments of a task, sub-task or bug, which are saved there too).
 * What the browser sends is never stored as it came: only the fields below survive, and the address must be one of
 * our own attachment downloads, so a comment cannot point people at some other site.
 */

export interface DiscussionAttachment {
  attachment_id: number;
  name: string;
  mime: string;
  size: number;
  /** Always /api/v1/attachments/<id>/download */
  url: string;
}

export const MAX_DISCUSSION_FILES = 10;

const DOWNLOAD_URL = /^\/api\/v1\/attachments\/(\d+)\/download$/;

export function sanitizeDiscussionAttachments(input: unknown): DiscussionAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: DiscussionAttachment[] = [];
  const seen = new Set<number>();
  for (const raw of input) {
    if (out.length >= MAX_DISCUSSION_FILES) break;
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const id = Number(r.attachment_id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    const url = typeof r.url === 'string' ? DOWNLOAD_URL.exec(r.url) : null;
    if (!url || Number(url[1]) !== id) continue;
    seen.add(id);
    out.push({
      attachment_id: id,
      name: (typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'file').slice(0, 200),
      mime: (typeof r.mime === 'string' ? r.mime : 'application/octet-stream').slice(0, 100),
      size: Number.isFinite(Number(r.size)) && Number(r.size) > 0 ? Math.floor(Number(r.size)) : 0,
      url: r.url as string,
    });
  }
  return out;
}

/** What is allowed to be shared: pictures, videos, audio, documents, spreadsheets, slides, text and archives. */
const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/', 'text/'];
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
/** Opened inline by a browser and able to run script, so never accepted as a shared file */
const BLOCKED_TYPES = new Set(['image/svg+xml', 'text/html']);

export function isShareableType(mime: string): boolean {
  const m = (mime || '').toLowerCase().split(';')[0].trim();
  if (BLOCKED_TYPES.has(m)) return false;
  return ALLOWED_PREFIXES.some((p) => m.startsWith(p)) || ALLOWED_TYPES.has(m);
}
