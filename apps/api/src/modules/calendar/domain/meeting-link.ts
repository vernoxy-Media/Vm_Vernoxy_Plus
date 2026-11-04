/** Video meetings in the calendar are Google Meet only: https://meet.google.com/abc-defg-hij (also pasted as .../meet/abc-defg-hij). */
const MEET = /^(?:https?:\/\/)?(?:www\.)?meet\.google\.com\/(?:meet\/)?([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#].*)?$/i;

/** The clean link for a Google Meet URL as pasted, or null when it is not one. */
export function normaliseMeetLink(raw: string): string | null {
  const m = MEET.exec(raw.trim());
  return m ? `https://meet.google.com/${m[1].toLowerCase()}` : null;
}
