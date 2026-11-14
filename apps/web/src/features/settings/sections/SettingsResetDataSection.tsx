import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

interface FlushResult {
  deleted_rows: number;
  tables_emptied: number;
  kept_admins: Array<{ emp_id: number; name: string; email: string }>;
  master_data_flushed: boolean;
}

/** QA only: wipe the test data and keep the Admin login, so a test round can start from a clean slate. */
export const SettingsResetDataSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [includeMaster, setIncludeMaster] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<FlushResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', 'flush-status'],
    queryFn: () => customFetch<{ enabled: boolean }>('/api/v1/admin/maintenance/flush-status'),
    staleTime: 60_000,
  });

  const flush = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await customFetch<FlushResult>('/api/v1/admin/maintenance/flush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: typed, include_master_data: includeMaster }),
      });
      setDone(result);
      setTyped('');
      queryClient.clear();
      window.setTimeout(() => window.location.assign('/'), 3500);
    } catch (e) {
      const x = e as { detail?: string; message?: string } | null;
      setError(x?.detail || x?.message || 'The data could not be flushed.');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking this server…
      </div>
    );
  }

  if (!data?.enabled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        <div>
          <p className="font-semibold text-slate-900">Resetting data is switched off on this server.</p>
          <p className="mt-1">
            It is a tool for the test (QA) server. To use it there, set <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">ALLOW_DATA_FLUSH=true</code> on the API and restart it. Keep it off in production.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5" /> Done. {done.deleted_rows.toLocaleString()} rows were deleted.
        </p>
        <p>
          Kept: {done.kept_admins.map((a) => `${a.name} (${a.email})`).join(', ')}.
          {done.master_data_flushed ? ' Master data was deleted too.' : ' Master data was kept.'} The page reloads in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <AlertTriangle className="h-5 w-5" /> Reset all data
        </p>
        <p className="mt-2 text-sm text-red-900">
          Deletes everything in this database for good: employees, projects, tasks, bugs, attendance, leaves, CRM, expenses, chats and logs.
          Admin users stay, so you can sign in again. This cannot be undone.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input type="checkbox" checked={includeMaster} onChange={(e) => setIncludeMaster(e.target.checked)} className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-red-600 focus:ring-red-500/30" />
        <span className="text-sm">
          <span className="font-semibold text-slate-900">Also delete master data</span>
          <span className="mt-0.5 block text-slate-600">
            Dropdown lists (task stages, priorities, industries …), leave and expense settings, shifts, holidays, other departments and roles. After this the dropdowns are empty until the lists are filled again.
            Leave this off to keep them.
          </span>
        </span>
      </label>

      <div>
        <label htmlFor="flush-confirm" className="mb-1 block text-sm font-medium text-slate-800">
          Type <b>FLUSH</b> to confirm
        </label>
        <input
          id="flush-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          placeholder="FLUSH"
          className="h-10 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-sm focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={typed !== 'FLUSH' || busy}
        onClick={flush}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {busy ? 'Deleting…' : 'Delete all data'}
      </button>
    </div>
  );
};
