import { isAllowedPushEndpoint, messagePreview, notificationLink, toPayload } from './push-rules';

describe('isAllowedPushEndpoint', () => {
  it('accepts the push services of the real browsers', () => {
    for (const e of [
      'https://fcm.googleapis.com/fcm/send/abc123',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/QWERTY',
      'https://wns2-pn1p.notify.windows.com/w/?token=BQYAAA',
    ]) {
      expect(isAllowedPushEndpoint(e)).toBe(true);
    }
  });

  it('refuses an address inside a network, plain http, or a look-alike host', () => {
    for (const e of [
      'http://fcm.googleapis.com/fcm/send/abc', // not https
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://169.254.169.254/latest/meta-data/', // cloud metadata
      'https://internal.service.local/x',
      'https://fcm.googleapis.com.evil.example/x', // look-alike
      'https://evilgoogleapis.com/x',
      'https://user:pass@fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'not a url',
      '',
    ]) {
      expect(isAllowedPushEndpoint(e)).toBe(false);
    }
  });
});

describe('toPayload', () => {
  it('keeps a short notification as it is and a link inside the app', () => {
    expect(toPayload({ title: 'Task assigned: TSK-1', body: 'You have been assigned the task "Add search".', url: '/my-tasks' })).toEqual({
      title: 'Task assigned: TSK-1',
      body: 'You have been assigned the task "Add search".',
      url: '/my-tasks',
    });
  });

  it('shortens long text and tidies line breaks', () => {
    const p = toPayload({ title: 'T'.repeat(200), body: `line one\n\n   line two ${'x'.repeat(400)}`, url: '/', tag: 'msg-4' });
    expect(p.title.length).toBeLessThanOrEqual(80);
    expect(p.title.endsWith('…')).toBe(true);
    expect(p.body.length).toBeLessThanOrEqual(180);
    expect(p.body.startsWith('line one line two')).toBe(true);
    expect(p.tag).toBe('msg-4');
  });

  it('never points outside the app', () => {
    expect(toPayload({ title: 'a', body: 'b', url: 'https://evil.example/phish' }).url).toBe('/');
    expect(toPayload({ title: 'a', body: 'b', url: '/calendar' }).url).toBe('/calendar');
  });
});

describe('notificationLink', () => {
  it('leads a regularization request to the request, and its result to the list', () => {
    expect(notificationLink('attendance_regularization_requested', 12)).toBe('/attendance?tab=regularization&request=12');
    expect(notificationLink('attendance_regularization_approved', 12)).toBe('/attendance?tab=regularization');
    expect(notificationLink('attendance_regularization_rejected', 12)).toBe('/attendance?tab=regularization');
  });

  it('leads tasks, bugs, projects, calendar and sales to their pages', () => {
    expect(notificationLink('task_assigned', 5)).toBe('/my-tasks');
    expect(notificationLink('task_ready_for_qa', 5)).toBe('/my-tasks');
    expect(notificationLink('bug_assigned', 5)).toBe('/my-tasks');
    expect(notificationLink('project_member_added', 9)).toBe('/projects/9');
    expect(notificationLink('calendar_invite', 3)).toBe('/calendar');
    expect(notificationLink('follow_up_assigned', 3)).toBe('/sales/follow-ups');
    expect(notificationLink('leave_approved', 3)).toBe('/leave');
  });

  it('falls back to the home page for a kind it does not know', () => {
    expect(notificationLink('something_new')).toBe('/');
  });
});

describe('messagePreview', () => {
  it('shows the text, or the file that was sent', () => {
    expect(messagePreview({ kind: 'text', body: ' Hello team ' })).toBe('Hello team');
    expect(messagePreview({ kind: 'file', file_name: 'quote.pdf' })).toBe('Sent a file: quote.pdf');
    expect(messagePreview({ kind: 'file' })).toBe('Sent a file');
    expect(messagePreview({ kind: 'text', body: '  ' })).toBe('Sent a message');
  });
});
