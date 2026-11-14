import React, { useCallback, useEffect, useState } from 'react';
import { customFetch } from '@vernoxy-pulse/api-client';
import { AlertCircle, Check, Copy, KeyRound, Loader2, Plus, ShieldCheck, UserCheck, UserX, X } from 'lucide-react';

interface ClientOption {
  client_id: number;
  client_code: string | null;
  name: string;
}

interface ClientLogin {
  client_user_id: number;
  client_id: number;
  client_name: string;
  name: string;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface Issued extends ClientLogin {
  temporary_password: string;
}

const BASE = '/api/v1/admin/client-logins';
const FIELD = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20';
const errorText = (e: unknown) => {
  const x = e as { detail?: string; message?: string } | null;
  return x?.detail || x?.message || 'Something went wrong.';
};

/** The Admin gives a client a login: the system makes the password, the Admin hands it over once. */
export const SettingsClientLoginsSection: React.FC = () => {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [logins, setLogins] = useState<ClientLogin[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<number | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    customFetch<ClientOption[]>('/api/v1/projects/client-options').then(setClients).catch((e) => setError(errorText(e)));
  }, []);

  const load = useCallback(async () => {
    try {
      setLogins(await customFetch<ClientLogin[]>(`${BASE}${clientId ? `?client_id=${clientId}` : ''}`));
    } catch (e) {
      setError(errorText(e));
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const act = async (key: number | 'create', fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return setError('Choose the client first.');
    act('create', async () => {
      const r = await customFetch<Issued>(BASE, { method: 'POST', body: JSON.stringify({ client_id: Number(clientId), name, email }) });
      setIssued(r);
      setName('');
      setEmail('');
    });
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          A client signs in at <b>/client</b> and sees only its own projects, read-only. The system creates a temporary password; you give it to the client and they must choose their own at the first sign in.
          Passwords are stored only as a hash, so nobody can read a password later, not even you. If a client forgets it, they use <i>Forgot password</i> (an email code), or you reset it here.
        </p>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <form onSubmit={create} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_auto]">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Client" className={FIELD}>
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.client_id} value={c.client_id}>{c.name}{c.client_code ? ` (${c.client_code})` : ''}</option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Person's name" aria-label="Name" className={FIELD} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email (the login)" aria-label="Email" className={FIELD} />
        <button type="submit" disabled={busy === 'create' || !clientId} title={clientId ? undefined : 'Choose a client first'} className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create login
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th className="px-4 py-3">Client</th><th className="px-4 py-3">Person</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last sign in</th><th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!logins ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : logins.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No client login yet. Choose a client above and create one.</td></tr>
            ) : (
              logins.map((l) => (
                <tr key={l.client_user_id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{l.client_name}</td>
                  <td className="px-4 py-3"><p className="text-slate-900">{l.name}</p><p className="text-xs text-slate-500">{l.email}</p></td>
                  <td className="px-4 py-3">
                    {!l.is_active ? <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Disabled</span>
                      : l.must_change_password ? <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Temporary password</span>
                        : <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.last_login_at ? new Date(l.last_login_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" disabled={busy === l.client_user_id} onClick={() => act(l.client_user_id, async () => setIssued(await customFetch<Issued>(`${BASE}/${l.client_user_id}/reset-password`, { method: 'POST' })))} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </button>
                      <button type="button" disabled={busy === l.client_user_id} onClick={() => act(l.client_user_id, async () => { await customFetch(`${BASE}/${l.client_user_id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !l.is_active }) }); })} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        {l.is_active ? <><UserX className="h-3.5 w-3.5" /> Disable</> : <><UserCheck className="h-3.5 w-3.5" /> Enable</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {issued && (
        <div role="dialog" aria-modal="true" aria-label="Login details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Give these details to {issued.name}</h2>
              <button type="button" onClick={() => setIssued(null)} aria-label="Close" className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <dl className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div><dt className="text-slate-500">Sign in at</dt><dd className="font-medium text-slate-900">{window.location.origin}/client</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{issued.email}</dd></div>
              <div><dt className="text-slate-500">Temporary password</dt><dd className="font-mono text-base font-semibold text-slate-900">{issued.temporary_password}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-amber-800">This is the only time the password is shown. The client has to change it at the first sign in.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => copy(`Sign in: ${window.location.origin}/client\nEmail: ${issued.email}\nTemporary password: ${issued.temporary_password}`)} className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy details'}
              </button>
              <button type="button" onClick={() => setIssued(null)} className="h-10 cursor-pointer rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
