import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { Check, IndianRupee, Loader2, Lock, Pencil, TrendingDown, TrendingUp, X } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/formatters';
import { parseApiError } from '../../utils/error';

interface ProjectRow {
  project_id: number;
  project_no: string;
  project_name: string;
  hours: number;
  employee_cost: number;
  direct_expense: number;
  office_expense: number;
  actual_expense: number;
  revenue: number | null;
  profit: number | null;
  profit_percent: number | null;
  revenue_source: 'project' | 'client' | 'none';
}

interface Financials {
  client: { client_id: number; revenue: number | null } | null;
  basis: { working_days: number; daily_hours: number };
  totals: {
    employee_cost: number;
    direct_expense: number;
    office_expense: number;
    actual_expense: number;
    revenue: number | null;
    profit: number | null;
    profit_percent: number | null;
  };
  projects: ProjectRow[];
}

const KEY = 'client-financials';

/** Inline money editor: saves on Enter / tick, empty clears. */
const MoneyEditor: React.FC<{ initial: number | null; onSave: (v: number | null) => Promise<void>; onCancel: () => void; compact?: boolean }> = ({
  initial,
  onSave,
  onCancel,
  compact,
}) => {
  const [v, setV] = useState(initial != null ? String(initial) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const clean = v.replace(/,/g, '').trim();
    if (clean && !/^\d+(\.\d{1,2})?$/.test(clean)) {
      setErr('Numbers only, up to 2 decimals.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave(clean ? Number(clean) : null);
    } catch (e) {
      setErr(parseApiError(e).message || 'Could not save.');
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
          <input
            autoFocus
            inputMode="decimal"
            value={v}
            onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="0"
            className={`rounded-lg border border-slate-300 bg-white pl-6 pr-2 font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 ${compact ? 'w-32 py-1 text-xs' : 'w-44 py-1.5 text-sm'}`}
          />
        </div>
        <button type="button" disabled={busy} onClick={save} aria-label="Save" className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} aria-label="Cancel" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] font-medium text-rose-600">{err}</p>}
    </div>
  );
};

/**
 * Admin only: what the client pays, what the project(s) actually cost, and the profit.
 * The server refuses everybody else, so this card is only mounted for the Admin.
 */
export const ClientFinancialsCard: React.FC<{ clientId: number }> = ({ clientId }) => {
  const qc = useQueryClient();
  const [editClient, setEditClient] = useState(false);
  const [editProject, setEditProject] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [KEY, clientId],
    queryFn: () => customFetch<Financials>(`/api/v1/projects/financials?client_id=${clientId}`),
    staleTime: 30_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: [KEY, clientId] });

  const saveClient = useMutation({
    mutationFn: (v: number | null) => customFetch(`/api/v1/sales/clients/${clientId}/revenue`, { method: 'PATCH', body: JSON.stringify({ project_revenue: v }) }),
    onSuccess: () => {
      setEditClient(false);
      return refresh();
    },
  });
  const saveProject = useMutation({
    mutationFn: ({ id, v }: { id: number; v: number | null }) => customFetch(`/api/v1/projects/${id}/revenue`, { method: 'PATCH', body: JSON.stringify({ project_revenue: v }) }),
    onSuccess: () => {
      setEditProject(null);
      return refresh();
    },
  });

  const t = data?.totals;
  const revenue = data?.client?.revenue ?? null;
  const parts = t
    ? [
        { label: 'Employee cost', value: t.employee_cost, cls: 'bg-indigo-500' },
        { label: 'Direct project expenses', value: t.direct_expense, cls: 'bg-sky-400' },
        { label: 'Allocated office expenses', value: t.office_expense, cls: 'bg-amber-400' },
      ]
    : [];
  const total = parts.reduce((a, p) => a + p.value, 0);
  const profit = t?.profit ?? null;
  const isProfit = (profit ?? 0) >= 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <IndianRupee className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Project Financials</h2>
            <p className="text-[11px] text-slate-500">Revenue, actual cost and profit of this client's projects</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10.5px] font-semibold text-indigo-700">
          <Lock className="h-3 w-3" /> Admin only
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : isError || !data ? (
        <p className="py-8 text-center text-sm text-slate-500">The financials could not be loaded.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {/* Revenue + KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Project Revenue</p>
                {!editClient && (
                  <button type="button" onClick={() => setEditClient(true)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-indigo-600" aria-label="Edit revenue">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {editClient ? (
                <div className="mt-1.5">
                  <MoneyEditor initial={revenue} onSave={(v) => saveClient.mutateAsync(v).then(() => undefined)} onCancel={() => setEditClient(false)} />
                </div>
              ) : revenue != null ? (
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrencyINR(revenue)}</p>
              ) : (
                <button type="button" onClick={() => setEditClient(true)} className="mt-1 text-sm font-semibold text-indigo-600 hover:underline">
                  + Add revenue
                </button>
              )}
              <p className="mt-1 text-[11px] text-slate-400">Split equally across projects unless set per project</p>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actual Expense</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrencyINR(t!.actual_expense)}</p>
              <p className="mt-1 text-[11px] text-slate-400">Employee + direct + office</p>
            </div>

            <div className={`rounded-xl border p-3.5 ${profit == null ? 'border-slate-200/70 bg-slate-50/70' : isProfit ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{profit != null && !isProfit ? 'Loss' : 'Profit'}</p>
              {profit == null ? (
                <p className="mt-1 text-sm font-medium text-slate-400">Add revenue to see profit</p>
              ) : (
                <p className={`mt-1 flex items-center gap-1.5 text-xl font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {formatCurrencyINR(Math.abs(profit))}
                </p>
              )}
              <p className="mt-1 text-[11px] text-slate-400">Revenue − actual expense</p>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Profit %</p>
              <p className={`mt-1 text-xl font-bold ${t!.profit_percent == null ? 'text-slate-300' : isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {t!.profit_percent == null ? '—' : `${t!.profit_percent}%`}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Profit ÷ revenue × 100</p>
            </div>
          </div>

          {/* Expense breakup */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">Where the cost comes from</p>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {total > 0 &&
                parts.map((p) => <div key={p.label} className={p.cls} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${formatCurrencyINR(p.value)}`} />)}
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              {parts.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.cls}`} />
                    {p.label}
                  </span>
                  <span className="font-semibold text-slate-900">{formatCurrencyINR(p.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          {data.projects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
              This client has no project yet. Expenses and profit appear once a project is created for the client.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/70">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Project</th>
                    <th className="px-3 py-2.5 text-right">Hours</th>
                    <th className="px-3 py-2.5 text-right">Revenue</th>
                    <th className="px-3 py-2.5 text-right">Actual expense</th>
                    <th className="px-3 py-2.5 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.projects.map((p) => (
                    <tr key={p.project_id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-800">{p.project_name}</p>
                        <p className="font-mono text-[10.5px] text-slate-400">{p.project_no}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{p.hours}</td>
                      <td className="px-3 py-2.5 text-right">
                        {editProject === p.project_id ? (
                          <div className="flex justify-end">
                            <MoneyEditor compact initial={p.revenue_source === 'project' ? p.revenue : null} onSave={(v) => saveProject.mutateAsync({ id: p.project_id, v }).then(() => undefined)} onCancel={() => setEditProject(null)} />
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-1.5">
                            <span className="font-medium text-slate-800">{p.revenue != null ? formatCurrencyINR(p.revenue) : '—'}</span>
                            {p.revenue_source === 'client' && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-500">shared</span>}
                            <button type="button" onClick={() => setEditProject(p.project_id)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-indigo-600" aria-label="Set revenue for this project">
                              <Pencil className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800">{formatCurrencyINR(p.actual_expense)}</td>
                      <td className={`px-3 py-2.5 text-right font-bold ${p.profit == null ? 'text-slate-300' : p.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {p.profit == null ? '—' : `${p.profit < 0 ? '−' : ''}${formatCurrencyINR(Math.abs(p.profit))}`}
                        {p.profit_percent != null && <span className="ml-1 text-[10.5px] font-medium opacity-70">({p.profit_percent}%)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-slate-400">
            Employee cost = salary ÷ {data.basis.working_days} working days (all days except Sunday) ÷ {data.basis.daily_hours} daily hours × hours worked on the project. Only approved
            and reimbursed expenses are counted. Office expenses are shared by project hours.
          </p>
        </div>
      )}
    </div>
  );
};
