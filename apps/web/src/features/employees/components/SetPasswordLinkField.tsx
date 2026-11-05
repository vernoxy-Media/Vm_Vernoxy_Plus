import React, { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

/**
 * Same link the welcome email sends (SmtpMailAdapter.sendWelcomeCredentials):
 * <web origin>/forgot-password?email=<office email>. It opens the Set Password
 * page with the email filled in; the employee sets a password and signs in.
 */
export function buildSetPasswordLink(officeEmail: string): string {
  const email = officeEmail.trim().toLowerCase();
  return `${window.location.origin}/forgot-password?email=${encodeURIComponent(email)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SetPasswordLinkField: React.FC<{
  officeEmail?: string | null;
}> = ({ officeEmail }) => {
  const [copied, setCopied] = useState(false);
  const email = (officeEmail || '').trim();
  const valid = EMAIL_RE.test(email);
  const link = valid ? buildSetPasswordLink(email) : '';

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80">
        <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        {valid ? (
          <span
            className="font-mono text-[11px] text-slate-700 truncate flex-1 select-all"
            title={link}
          >
            {link}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 flex-1">
            Enter the Office Email to see the link.
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          disabled={!valid}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <p className="text-[10px] text-slate-500 pl-1">
        The link works once the employee is activated (Status: Active).
      </p>
    </div>
  );
};
