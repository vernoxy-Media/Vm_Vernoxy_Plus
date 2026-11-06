import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronLeft, Download, FileText, Info, Loader2, Lock, RefreshCw, Search, Send, Unlock, Wallet, XCircle } from 'lucide-react';
import {
  PayrollEmployeeItem,
  downloadFile,
  errorText,
  reportUrl,
  useGenerateSalarySlipsMutation,
  usePayrollMe,
  usePayrollRegisterQuery,
  useRecalculateMutation,
  useReleaseSalarySlipsMutation,
} from '../hooks/use-payroll';
import { OtHoursTable } from '../components/OtHoursTable';
import { LockPayrollModal } from '../components/LockPayrollModal';
import { UnlockPayrollModal } from '../components/UnlockPayrollModal';
import { MarkPaidModal } from '../components/MarkPaidModal';
import { Banner, EmployeeFlag, FilterField, RunStatusBadge, btn, filterCls, fmtDate, fmtStamp, money, num } from '../components/payroll-ui';

type Tab = 'register' | 'ot' | 'adjustments' | 'checks';
type SortKey = 'emp_id' | 'basic_salary' | 'ot_amount' | 'employee_pf' | 'adj_net' | 'total_salary' | 'gross_earnings';

/** Screen 3: Payroll Register (BFD Section 6). */
export const PayrollRegisterPage: React.FC = () => {
  const params = useParams();
  const year = Number(params.year);
  const month = Number(params.month);
  const navigate = useNavigate();
  const { data: me } = usePayrollMe();
  const { data, isLoading, error, isFetching } = usePayrollRegisterQuery(year, month);
  const recalc = useRecalculateMutation();
  const generate = useGenerateSalarySlipsMutation();
  const release = useReleaseSalarySlipsMutation();

  const [tab, setTab] = useState<Tab>('register');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [flag, setFlag] = useState('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'emp_id', dir: 1 });
  const [popup, setPopup] = useState<null | 'lock' | 'unlock' | 'pay'>(null);
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const list = data.employees.filter((e) => {
      if (q && !e.employee_name.toLowerCase().includes(q) && !e.employee_code.toLowerCase().includes(q)) return false;
      if (dept && e.department_names !== dept) return false;
      const lv = (l: string) => e.issues.some((i) => i.level === l);
      if (flag === 'ERRORS') return lv('ERROR');
      if (flag === 'WARNINGS') return lv('WARNING');
      if (flag === 'JOINED') return e.issues.some((i) => i.code === 'JOINED');
      if (flag === 'LEFT') return e.issues.some((i) => i.code === 'LEFT');
      if (flag === 'ADJUSTED') return e.adjustment_count > 0;
      return true;
    });
    return [...list].sort((a, b) => ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir);
  }, [data, search, dept, flag, sort]);

  const run = data?.run;
  const isDraft = run?.status === 'DRAFT';
  const act = async (fn: () => Promise<any>, ok: string) => {
    setToast(null);
    try {
      const r = await fn();
      setToast({ tone: 'ok', text: r?.message || ok });
    } catch (e) {
      setToast({ tone: 'error', text: errorText(e) });
    }
  };

  const exportCsv = () => {
    const cols: Array<[string, (e: PayrollEmployeeItem) => any]> = [
      ['Emp ID', (e) => e.employee_code],
      ['Name', (e) => e.employee_name],
      ['Department', (e) => e.department_names],
      ['Work Days', (e) => e.total_working_days],
      ['Full', (e) => e.full_days],
      ['Half', (e) => e.half_days],
      ['LOP', (e) => e.lop_days],
      ['Paid Days', (e) => e.paid_days],
      ['Basic Salary', (e) => e.basic_salary],
      ['OT', (e) => e.ot_amount],
      ['PF', (e) => e.employee_pf],
      ['Adj.', (e) => e.adj_net],
      ['Total Salary', (e) => e.total_salary],
      ['Flag', (e) => e.issues.map((i) => i.message).join('; ')],
    ];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => esc(c[0])).join(','), ...rows.map((r) => cols.map((c) => esc(c[1](r))).join(','))].join('\n');
    const href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = `payroll-register-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error || !data || !run) {
    return (
      <div className="space-y-3">
        <Link to="/admin/payroll" className={btn.link}>
          ← Payroll
        </Link>
        <Banner>{errorText(error, 'This payroll run could not be opened.')}</Banner>
      </div>
    );
  }

  const SortTh: React.FC<{ k: SortKey; label: string }> = ({ k, label }) => (
    <th className="px-3 py-2.5 text-right">
      <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : -1 }))}>
        {label}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/payroll" className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
            <ChevronLeft className="h-3.5 w-3.5" /> Payroll
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Payroll Register · {run.month_label}</h1>
            <RunStatusBadge status={run.status} />
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
          </div>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Last calculated {fmtStamp(run.calculated_at)}
            {run.calculated_by_name ? ` by ${run.calculated_by_name}` : ''}
            {run.locked_at && run.status !== 'DRAFT' ? ` · Locked ${fmtStamp(run.locked_at)}${run.locked_by_name ? ` by ${run.locked_by_name}` : ''}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.secondary} onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={() => act(() => downloadFile(reportUrl('register', { year, month, format: 'xlsx' }), `payroll-register-${year}-${month}.xlsx`), 'Downloaded.')}
          >
            <FileText className="h-4 w-4" /> Excel
          </button>
          {isDraft ? (
            <>
              <button type="button" className={btn.secondary} disabled={recalc.isPending} onClick={() => act(() => recalc.mutateAsync({ year, month }), 'Recalculated.')}>
                {recalc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recalculate
              </button>
              <button type="button" className={btn.primary} onClick={() => setPopup('lock')} title={data.checks.can_lock ? '' : 'Some lock checks are not passing'}>
                <Lock className="h-4 w-4" /> Lock Payroll
              </button>
            </>
          ) : (
            <>
              {me?.can_unlock && run.status === 'LOCKED' && (
                <button type="button" className={btn.secondary} onClick={() => setPopup('unlock')}>
                  <Unlock className="h-4 w-4" /> Unlock
                </button>
              )}
              <button type="button" className={btn.secondary} disabled={generate.isPending} onClick={() => act(() => generate.mutateAsync({ year, month }), 'Salary Slips generated.')}>
                {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Generate Salary Slips
              </button>
              <button type="button" className={btn.secondary} disabled={release.isPending} onClick={() => act(() => release.mutateAsync({ year, month }), 'Salary Slips released.')}>
                {release.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Release
              </button>
              {run.status === 'LOCKED' && (
                <button type="button" className={btn.success} onClick={() => setPopup('pay')}>
                  <Wallet className="h-4 w-4" /> Mark as Paid
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {toast && <Banner tone={toast.tone === 'ok' ? 'ok' : 'error'}>{toast.text}</Banner>}
      {run.data_changed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-[13px] font-medium text-blue-800">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4" /> Data has changed since the last calculation. Recalculate.
          </span>
          <button type="button" className={btn.primary} disabled={recalc.isPending} onClick={() => act(() => recalc.mutateAsync({ year, month }), 'Recalculated.')}>
            Recalculate
          </button>
        </div>
      )}
      {!run.attendance_locked && isDraft && <Banner tone="warn">{`${run.month_label.split(' ')[0]} attendance is still open. You can calculate, but cannot lock.`}</Banner>}
      {run.unlock_reason && isDraft && <Banner tone="info">Unlocked by the Admin: {run.unlock_reason}</Banner>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Employees', String(run.total_employees), 'text-slate-900'],
          ['Gross earnings', money(run.gross_earnings, 0), 'text-slate-900'],
          ['PF (employee share)', money(run.employee_pf_total, 0), 'text-slate-900'],
          ['Total Salary', money(run.total_salary, 0), 'text-emerald-600'],
        ].map(([k, v, tone]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</p>
            <p className={`mt-1.5 text-2xl font-extrabold ${tone}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 pt-3">
          {(
            [
              ['register', 'Register', null],
              ['ot', 'OT Hours', data.ot_entries.filter((o) => o.status === 'PENDING').length ? `${data.ot_entries.filter((o) => o.status === 'PENDING').length} pending` : null],
              ['adjustments', 'Adjustments', data.adjustments.filter((a) => a.is_active).length || null],
              ['checks', 'Checks', data.checks.errors.length + data.checks.warnings.length || null],
            ] as Array<[Tab, string, any]>
          ).map(([k, label, badge]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {label}
              {badge ? <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">{badge}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'register' && (
          <>
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
              <FilterField label="Search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className={`${filterCls} w-56 pl-9`} placeholder="Name or Emp ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </FilterField>
              <FilterField label="Department">
                <select className={`${filterCls} w-44`} value={dept} onChange={(e) => setDept(e.target.value)}>
                  <option value="">All</option>
                  {data.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Flag">
                <select className={`${filterCls} w-40`} value={flag} onChange={(e) => setFlag(e.target.value)}>
                  {['ALL', 'ERRORS', 'WARNINGS', 'JOINED', 'LEFT', 'ADJUSTED'].map((f) => (
                    <option key={f} value={f}>
                      {f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </FilterField>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-[12.5px]">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-3 py-2.5 text-right">Work days</th>
                    <th className="px-3 py-2.5 text-right">Full</th>
                    <th className="px-3 py-2.5 text-right">Half</th>
                    <th className="px-3 py-2.5 text-right">LOP</th>
                    <th className="px-3 py-2.5 text-right">Paid days</th>
                    <SortTh k="basic_salary" label="Basic Salary" />
                    <SortTh k="ot_amount" label="OT" />
                    <SortTh k="employee_pf" label="PF" />
                    <SortTh k="adj_net" label="Adj." />
                    <SortTh k="total_salary" label="Total Salary" />
                    <th className="px-4 py-2.5">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((e) => (
                    <tr key={e.emp_id} className="cursor-pointer hover:bg-blue-50/30" onClick={() => navigate(`/admin/payroll/${year}/${month}/employee/${e.emp_id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{e.employee_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {e.employee_code}
                          {e.department_names ? ` · ${e.department_names}` : ''}
                          {e.is_paid ? ' · Paid' : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(e.total_working_days)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(e.full_days)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(e.half_days)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(e.lop_days)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{num(e.paid_days)}</td>
                      <td className="px-3 py-3 text-right text-slate-800">{num(e.basic_salary)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{e.ot_amount ? num(e.ot_amount) : '—'}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{e.employee_pf ? num(e.employee_pf) : '—'}</td>
                      <td className={`px-3 py-3 text-right ${e.adj_net < 0 ? 'text-rose-600' : 'text-slate-600'}`}>{e.adj_net ? `${e.adj_net > 0 ? '+' : ''}${num(e.adj_net)}` : '—'}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">{money(e.total_salary, 0)}</td>
                      <td className="px-4 py-3">
                        <EmployeeFlag e={e} />
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={12} className="px-4 py-10 text-center text-[13px] text-slate-500">
                        No employees match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-2.5 text-[11.5px] text-slate-400">
              Showing {rows.length} of {data.employees.length} employees · Click a row to open the Employee Salary Sheet
            </p>
          </>
        )}

        {tab === 'ot' && <OtHoursTable entries={data.ot_entries} showAmounts canDecideAll={Boolean(me?.is_admin)} locked={!isDraft} />}

        {tab === 'adjustments' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[12.5px]">
              <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-3 py-2.5">Kind</th>
                  <th className="px-3 py-2.5">Detail</th>
                  <th className="px-3 py-2.5 text-right">Effect</th>
                  <th className="px-3 py-2.5">By</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.adjustments.map((a) => (
                  <tr key={a.payroll_adjustment_id} className={a.is_active ? '' : 'opacity-50'}>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-slate-800 hover:text-blue-600" to={`/admin/payroll/${year}/${month}/employee/${a.emp_id}`}>
                        {a.employee_name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{a.employee_code}</p>
                    </td>
                    <td className="px-3 py-3">
                      <KindChip type={a.type} />
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {a.type === 'DAY_ADJUSTMENT' ? `${fmtDate(a.related_date)}: ${a.old_paid_as} → ${a.new_paid_as} · ${a.reason}` : `${a.category_label} · ${a.reason}`}
                      {!a.is_active && <p className="text-[11px] text-rose-500">Removed: {a.removed_reason}</p>}
                    </td>
                    <td className={`px-3 py-3 text-right font-semibold ${a.effect < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {a.effect > 0 ? '+' : ''}
                      {money(a.effect)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{a.created_by_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
                {!data.adjustments.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">
                      No adjustments this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'checks' && (
          <div className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lock checks</p>
              <ul className="space-y-1.5">
                {data.checks.lock_checks.map((c) => (
                  <li key={c.key} className={`flex items-center gap-2 text-[13px] ${c.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {c.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <IssueList title={`Errors (${data.checks.errors.length})`} tone="error" items={data.checks.errors} onOpen={(id) => navigate(`/admin/payroll/${year}/${month}/employee/${id}`)} />
            <IssueList title={`Warnings (${data.checks.warnings.length})`} tone="warn" items={data.checks.warnings} onOpen={(id) => navigate(`/admin/payroll/${year}/${month}/employee/${id}`)} />
          </div>
        )}
      </div>

      <LockPayrollModal open={popup === 'lock'} onClose={() => setPopup(null)} data={data} />
      <UnlockPayrollModal open={popup === 'unlock'} onClose={() => setPopup(null)} year={year} month={month} monthLabel={run.month_label} />
      <MarkPaidModal open={popup === 'pay'} onClose={() => setPopup(null)} year={year} month={month} monthLabel={run.month_label} lockedAt={run.locked_at} employees={data.employees} />
    </div>
  );
};

export const KindChip: React.FC<{ type: string }> = ({ type }) => {
  const t =
    type === 'DAY_ADJUSTMENT'
      ? ['Day', 'bg-blue-50 text-blue-700 ring-blue-100']
      : type === 'ADDITION'
        ? ['Addition', 'bg-emerald-50 text-emerald-700 ring-emerald-100']
        : ['Deduction', 'bg-rose-50 text-rose-700 ring-rose-100'];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${t[1]}`}>{t[0]}</span>;
};

const IssueList: React.FC<{ title: string; tone: 'error' | 'warn'; items: Array<{ emp_id: number | null; employee_code: string; employee_name: string; message: string }>; onOpen: (id: number) => void }> = ({
  title,
  tone,
  items,
  onOpen,
}) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
    {!items.length ? (
      <p className="text-[12.5px] text-slate-400">None.</p>
    ) : (
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center justify-between gap-3 px-3.5 py-2 text-[12.5px]">
            <span className={`flex items-center gap-2 ${tone === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>
              {tone === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              <span>
                <span className="font-semibold">{i.employee_name}</span> {i.employee_code !== '—' ? `(${i.employee_code})` : ''}: {i.message}
              </span>
            </span>
            {i.emp_id && (
              <button type="button" className={btn.link} onClick={() => onOpen(i.emp_id!)}>
                Open
              </button>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
