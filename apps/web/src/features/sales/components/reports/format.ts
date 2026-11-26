const callDateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

/** Date and time of a call in India time, with the year because a history can span years. */
export const fmtCallDate = (iso: string): string => callDateFmt.format(new Date(iso));
