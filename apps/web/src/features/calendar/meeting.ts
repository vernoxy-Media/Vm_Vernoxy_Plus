/**
 * Video meetings are Google Meet only. From the Meet home page any signed-in Google account can choose
 * "New meeting > Create a meeting for later" (free), which makes a link without joining the call, just like
 * Google Calendar does. The person copies that link back into the event.
 * (Not meet.google.com/new: that joins the creator to the call, and opening the link later says "Switch here".)
 */
export const NEW_MEET_URL = 'https://meet.google.com/landing';

export function meetingProvider(_link?: string): string {
  return 'Google Meet';
}

const clock = (d: Date) =>
  d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' AM', 'am')
    .replace(' PM', 'pm');

export interface InviteInput {
  title: string;
  start: Date;
  end: Date;
  link?: string | null;
  location?: string | null;
  description?: string | null;
  guests?: string[];
}

/** The text people paste into a chat or an email, in the same shape Google Calendar produces. */
export function buildInviteText(i: InviteInput): string {
  const day = i.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lines = [i.title.trim() || '(No title)', `${day} · ${clock(i.start)} – ${clock(i.end)}`, `Time zone: ${zone}`];
  if (i.location?.trim()) lines.push(`Location: ${i.location.trim()}`);
  if (i.guests?.length) lines.push(`Guests: ${i.guests.join(', ')}`);
  if (i.description?.trim()) lines.push('', i.description.trim());
  if (i.link) lines.push('', `${meetingProvider(i.link)} joining info`, `Video call link: ${i.link}`);
  return lines.join('\n');
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function minutesBetween(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

const MEET_LINK = /^(?:https?:\/\/)?(?:www\.)?meet\.google\.com\/(?:meet\/)?([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#].*)?$/i;

/** meet.google.com/abc-defg-hij, with or without https://, www. or a /meet/ part. */
export function isGoogleMeetLink(raw: string): boolean {
  return MEET_LINK.test(raw.trim());
}

/** The same link in its plain form: https://meet.google.com/abc-defg-hij */
export function normaliseMeetLink(raw: string): string {
  const m = MEET_LINK.exec(raw.trim());
  return m ? `https://meet.google.com/${m[1].toLowerCase()}` : raw.trim();
}

interface ApiConflict {
  employee_name: string;
  title: string;
  start_time: string;
  end_time: string;
}

/** What to tell the person when saving fails; a double booking names who is busy, with what, and when. */
export function describeSaveError(err: unknown, fallback: string): string {
  const e = err as { message?: unknown; conflicts?: ApiConflict[] } | null;
  if (e?.conflicts?.length) {
    const lines = new Set(
      e.conflicts.map((c) => `${c.employee_name} is already in “${c.title}”, ${clock(new Date(c.start_time))} – ${clock(new Date(c.end_time))}.`),
    );
    return ['This time is not free:', ...lines, 'Pick another time or remove them from the guests.'].join('\n');
  }
  const m = e?.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  return fallback;
}
