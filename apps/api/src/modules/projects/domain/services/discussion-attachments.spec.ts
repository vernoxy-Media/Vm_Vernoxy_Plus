import { isShareableType, MAX_DISCUSSION_FILES, sanitizeDiscussionAttachments } from './discussion-attachments';

const file = (id: number, extra: Record<string, unknown> = {}) => ({
  attachment_id: id,
  name: `f${id}.png`,
  mime: 'image/png',
  size: 1000,
  url: `/api/v1/attachments/${id}/download`,
  ...extra,
});

describe('sanitizeDiscussionAttachments', () => {
  it('keeps a valid file with only the fields we store', () => {
    expect(sanitizeDiscussionAttachments([file(7, { evil: '<script>' })])).toEqual([file(7)]);
  });

  it('drops anything that is not one of our own downloads', () => {
    expect(sanitizeDiscussionAttachments([file(1, { url: 'https://evil.example/x.png' })])).toEqual([]);
    expect(sanitizeDiscussionAttachments([file(1, { url: '/api/v1/attachments/2/download' })])).toEqual([]);
    expect(sanitizeDiscussionAttachments([file(1, { url: 'javascript:alert(1)' })])).toEqual([]);
  });

  it('drops bad ids and repeated files', () => {
    expect(sanitizeDiscussionAttachments([file(0), file(-3), file(1.5), { attachment_id: 'x' }, null, 'a'])).toEqual([]);
    expect(sanitizeDiscussionAttachments([file(4), file(4)])).toHaveLength(1);
  });

  it('is empty for something that is not a list, and limits how many files one comment may carry', () => {
    expect(sanitizeDiscussionAttachments(undefined)).toEqual([]);
    expect(sanitizeDiscussionAttachments('x')).toEqual([]);
    expect(sanitizeDiscussionAttachments(Array.from({ length: 25 }, (_, i) => file(i + 1)))).toHaveLength(MAX_DISCUSSION_FILES);
  });

  it('gives a missing name or size a safe value', () => {
    const [f] = sanitizeDiscussionAttachments([file(3, { name: '  ', size: 'big', mime: undefined })]);
    expect(f).toMatchObject({ name: 'file', size: 0, mime: 'application/octet-stream' });
  });
});

describe('isShareableType', () => {
  it('accepts pictures, videos, documents and archives', () => {
    for (const t of ['image/png', 'video/mp4', 'video/webm', 'audio/mpeg', 'application/pdf', 'application/zip', 'text/plain', 'image/jpeg; charset=x'])
      expect(isShareableType(t)).toBe(true);
  });
  it('refuses pages and svg (they can run script), programs and unknown types', () => {
    for (const t of ['text/html', 'image/svg+xml', 'application/x-msdownload', 'application/javascript', '', 'application/octet-stream'])
      expect(isShareableType(t)).toBe(false);
  });
});
