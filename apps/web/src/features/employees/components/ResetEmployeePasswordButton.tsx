import React, { useState } from 'react';
import { customFetch } from '@vernoxy-pulse/api-client';
import { AlertCircle, Check, Copy, KeyRound, Loader2, X } from 'lucide-react';

interface Issued {
  name: string;
  email: string;
  temporary_password: string;
}

/** Admin: give an employee a new temporary password. It is shown once; the employee must change it at the next sign in. */
export const ResetEmployeePasswordButton: React.FC<{ empId: number }> = ({ empId }) => {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      setIssued(await customFetch<Issued>(`/api/v1/admin/employee-logins/${empId}/reset-password`, { method: 'POST' }));
      setConfirming(false);
    } catch (e) {
      const x = e as { detail?: string; message?: string } | null;
      setError(x?.detail || x?.message || 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  const text = issued ? `Sign in: ${window.location.origin}/login\nEmail: ${issued.email}\nTemporary password: ${issued.temporary_password}` : '';

  return (
    <>
      <button type="button" onClick={() => { setConfirming(true); setError(null); }} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
        <KeyRound className="h-4 w-4" /> Reset password
      </button>

      {(confirming || issued) && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{issued ? `Give these details to ${issued.name}` : 'Reset this password?'}</h2>
              <button type="button" aria-label="Close" onClick={() => { setConfirming(false); setIssued(null); }} className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {issued ? (
              <>
                <dl className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{issued.email}</dd></div>
                  <div><dt className="text-slate-500">Temporary password</dt><dd className="font-mono text-base font-semibold text-slate-900">{issued.temporary_password}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-amber-800">This is the only time it is shown. The employee has to choose a new password at the next sign in.</p>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy details'}
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-600">The old password stops working. A new temporary one is made and shown to you once.</p>
                {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setConfirming(false)} className="h-10 cursor-pointer rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="button" disabled={busy} onClick={reset} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reset password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
