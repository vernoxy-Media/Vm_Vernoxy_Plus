import React, { useEffect, useState } from 'react';
import { Check, ClipboardPaste, Copy, ExternalLink, Video, X } from 'lucide-react';
import { NEW_MEET_URL, isGoogleMeetLink, meetingProvider, normaliseMeetLink } from '../meeting';

interface Props {
  value: string;
  onChange: (link: string) => void;
  /** Text for "Copy joining info"; leave out to hide that button. */
  getInviteText?: () => string;
}

/**
 * Free Google Meet: Google creates a fresh meeting at meet.google.com/new for any signed-in Google account.
 * We open that, the person copies the link it shows, and we take it from there (no API key or billing).
 */
export const MeetLinkField: React.FC<Props> = ({ value, onChange, getInviteText }) => {
  const [waiting, setWaiting] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'info' | null>(null);

  const accept = (raw: string): boolean => {
    const link = raw.trim();
    if (!isGoogleMeetLink(link)) return false;
    onChange(normaliseMeetLink(link));
    setWaiting(false);
    setDraft('');
    setError(null);
    return true;
  };

  // Coming back from the Meet tab, take the copied link straight from the clipboard when the browser allows it.
  useEffect(() => {
    if (!waiting) return;
    const onFocus = () => {
      navigator.clipboard
        .readText()
        .then((t) => accept(t))
        .catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!accept(text)) setError('No Google Meet link on the clipboard yet. Copy it from the Meet tab first.');
    } catch {
      setError('Your browser did not allow reading the clipboard. Paste the link into the box instead.');
    }
  };

  const flash = (what: 'link' | 'info', text: string) =>
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    });

  if (value) {
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-700">{meetingProvider(value)}</p>
            <p className="truncate text-xs text-slate-500">{value.replace('https://', '')}</p>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label={getInviteText ? 'Copy joining info' : 'Copy link'}
              title={getInviteText ? 'Copy joining info' : 'Copy link'}
              onClick={() => (getInviteText ? flash('info', getInviteText()) : flash('link', value))}
              className="rounded-full p-2 text-slate-600 hover:bg-white"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <a href={value} target="_blank" rel="noreferrer" aria-label="Open link" title="Open link" className="rounded-full p-2 text-slate-600 hover:bg-white">
              <ExternalLink className="h-4 w-4" />
            </a>
            <button type="button" aria-label="Remove video meeting" title="Remove" onClick={() => onChange('')} className="rounded-full p-2 text-slate-600 hover:bg-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
          {getInviteText && (
            <button type="button" onClick={() => flash('info', getInviteText())} className="flex items-center gap-1.5 text-blue-700 hover:underline">
              {copied === 'info' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'info' ? 'Copied joining info' : 'Copy joining info'}
            </button>
          )}
          <button type="button" onClick={() => flash('link', value)} className="text-slate-500 hover:underline">
            {copied === 'link' ? 'Link copied' : 'Copy link only'}
          </button>
        </div>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
        <p className="text-sm font-semibold text-slate-800">Google Meet is open in another tab</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-600">
          <li>
            In that tab choose <b>New meeting</b> then <b>Create a meeting for later</b>.
          </li>
          <li>Copy the link it shows, then come back here and press Paste.</li>
        </ol>
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          Do not use “Start an instant meeting”. That puts you inside the call, and the link then shows “Switch here” for everyone else you invite.
        </p>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (!accept(e.target.value)) setError(null);
            }}
            placeholder="meet.google.com/abc-defg-hij"
            aria-label="Google Meet link"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button type="button" onClick={paste} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
            <ClipboardPaste className="h-4 w-4" /> Paste
          </button>
        </div>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between text-xs">
          <a href={NEW_MEET_URL} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">Open Google Meet again</a>
          <button type="button" onClick={() => { setWaiting(false); setError(null); }} className="font-semibold text-slate-500 hover:underline">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => {
          window.open(NEW_MEET_URL, '_blank', 'noopener,noreferrer');
          setWaiting(true);
        }}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Video className="h-4 w-4" /> Add Google Meet video conferencing
      </button>
      <p className="text-xs text-slate-500">Free with any Google account. Opens Google Meet in a new tab, where you create a meeting for later.</p>
    </div>
  );
};
