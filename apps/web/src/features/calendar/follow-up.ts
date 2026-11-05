/**
 * Sales follow-ups reach the calendar as "appointment" events titled "Follow-up: <type> - <company>"
 * (written by the Sales module). This is how the calendar tells them apart from private notes and meetings.
 */
export const FOLLOW_UP_PREFIX = /^follow-up:\s*/i;

export const isFollowUp = (e: { event_type: string; title: string }): boolean =>
  e.event_type === 'appointment' && FOLLOW_UP_PREFIX.test(e.title);

/** "Follow-up: Call - Acme Ltd" becomes "Call - Acme Ltd". */
export const followUpLabel = (title: string): string => title.replace(FOLLOW_UP_PREFIX, '');
