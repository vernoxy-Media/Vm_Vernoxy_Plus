import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  AlertTriangle,
  Settings,
  Plus,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  ChevronDown,
  Wallet,
  IndianRupee,
  Banknote,
  Inbox,
  FileText,
} from 'lucide-react';
import {
  usePayrollRunsQuery,
  PayrollMonthItem,
} from '../hooks/use-payroll';
import { StartPayrollModal } from '../components/StartPayrollModal';
import { PayrollSettingsModal } from '../components/PayrollSettingsModal';
import { StatCard } from '@/features/complaint/components/complaint-ui';

const STATUS_TABS = [
  { id: 'ALL', label: 'All months' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'LOCKED', label: 'Locked' },
  { id: 'PAID', label: 'Paid' },
  { id: 'NOT_STARTED', label: 'Not started' },
];

const STATUS_STYLE: Record<PayrollMonthItem['status'], { chip: string; tile: string }> = {
  DRAFT: { chip: 'bg-amber-50 text-amber-700 ring-amber-100', tile: 'bg-amber-50 text-amber-600 ring-amber-100' },
  LOCKED: { chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', tile: 'bg-indigo-50 text-indigo-600 ring-indigo-100' },
  PAID: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  NOT_STARTED: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', tile: 'bg-slate-100 text-slate-400 ring-slate-200' },
};

export const PayrollRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [targetStartMonth, setTargetStartMonth] = useState<{ year: number; month: number } | undefined>();

  const { data, isLoading, error } = usePayrollRunsQuery(selectedYear, statusFilter);

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  /** `month_name` can already carry the year, so only add it when it is missing. */
  const monthLabel = (run: PayrollMonthItem) =>
    run.month_name.includes(String(run.payroll_year)) ? run.month_name : `${run.month_name} ${run.payroll_year}`;

  const StatusBadge: React.FC<{ status: PayrollMonthItem['status'] }> = ({ status }) => {
    const icon = status === 'DRAFT' ? <Clock className="h-3.5 w-3.5" /> : status === 'LOCKED' ? <Lock className="h-3.5 w-3.5" /> : status === 'PAID' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null;
    const label = status === 'DRAFT' ? 'Draft' : status === 'LOCKED' ? 'Locked' : status === 'PAID' ? 'Paid' : 'Not started';
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLE[status].chip}`}>
        {icon}
        {label}
      </span>
    );
  };

  const AttendanceBadge: React.FC<{ locked: boolean }> = ({ locked }) =>
    locked ? (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" /> Locked
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
        <Clock className="h-3.5 w-3.5" /> Unlocked
      </span>
    );

  const handleOpenStartModal = (monthItem?: PayrollMonthItem) => {
    if (monthItem) {
      setTargetStartMonth({ year: monthItem.payroll_year, month: monthItem.payroll_month });
    } else {
      // Find the first unstarted month or default to current month
      const unstarted = data?.runs.find((r) => r.status === 'NOT_STARTED');
      if (unstarted) {
        setTargetStartMonth({ year: unstarted.payroll_year, month: unstarted.payroll_month });
      } else {
        setTargetStartMonth({ year: selectedYear, month: new Date().getMonth() + 1 });
      }
    }
    setIsStartModalOpen(true);
  };

  const openRegister = (run: PayrollMonthItem) => navigate(`/admin/payroll/${run.payroll_year}/${run.payroll_month}`);

  const slipsText = (run: PayrollMonthItem) =>
    run.status === 'LOCKED' || run.status === 'PAID' ? `${run.released_slips_count || run.total_employees} generated` : '—';

  const runs = data?.runs ?? [];

  const actionButton = (run: PayrollMonthItem, full?: boolean) =>
    run.status !== 'NOT_STARTED' ? (
      <button
        type="button"
        onClick={() => openRegister(run)}
        className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 ${full ? 'w-full' : ''}`}
      >
        Open register
        <ArrowRight className="h-4 w-4" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => handleOpenStartModal(run)}
        className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 ${full ? 'w-full' : ''}`}
      >
        Start payroll
      </button>
    );

  const th = 'whitespace-nowrap px-5 py-3';

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Wallet className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Salary &amp; Payroll</h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">Monthly processing</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Calculate salaries from locked attendance, apply day adjustments, approve overtime and disburse.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            Payroll settings
          </button>
          <button
            type="button"
            onClick={() => handleOpenStartModal()}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-hidden focus:ring-4 focus:ring-blue-600/20 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Start payroll
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Current run"
          value={<span className="text-2xl">{data?.summary.current_run_month || 'None active'}</span>}
          hint={`Status: ${data?.summary.current_run_status ? data.summary.current_run_status.toLowerCase().replace(/_/g, ' ') : 'no active run'}`}
          icon={Calendar}
          tone="text-slate-900"
          tile="bg-blue-50 text-blue-600 ring-blue-100"
          bar="from-blue-500 to-indigo-500"
        />
        <StatCard label="Employees included" value={data?.summary.total_employees ?? 0} hint="Employees processed in latest run" icon={Users} tone="text-slate-900" tile="bg-indigo-50 text-indigo-600 ring-indigo-100" bar="from-indigo-500 to-violet-500" />
        <StatCard label="Total net salary" value={formatCurrency(data?.summary.total_salary)} hint="Net payable to employees" icon={IndianRupee} tone="text-emerald-600" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-400" />
        <StatCard
          label="Warnings / alerts"
          value={data?.summary.warnings_count ?? 0}
          hint="Items requiring review before lock"
          icon={AlertTriangle}
          tone={(data?.summary.warnings_count ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}
          tile="bg-amber-50 text-amber-600 ring-amber-100"
          bar="from-amber-400 to-orange-400"
        />
      </div>

      {/* Runs */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div role="tablist" aria-label="Payroll status" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
              {STATUS_TABS.map((tab) => {
                const on = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${on ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="relative flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-400">Year</span>
            <span className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 text-[13px] font-semibold text-slate-800 transition hover:border-slate-300 focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading payroll runs...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <p className="text-base font-semibold text-slate-800">Failed to load payroll runs</p>
            <p className="mt-1 text-sm text-slate-500">Please check the server logs and try again.</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <Inbox className="h-7 w-7" />
            </span>
            <p className="text-base font-semibold text-slate-800">No payroll runs found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Nothing matches the selected year and status.</p>
            {statusFilter !== 'ALL' && (
              <button type="button" onClick={() => setStatusFilter('ALL')} className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                Show all months
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Small screens: one card per month */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {runs.map((run) => {
                const started = run.status !== 'NOT_STARTED';
                return (
                  <li key={`${run.payroll_year}-${run.payroll_month}`} className="space-y-3.5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${STATUS_STYLE[run.status].tile}`}>
                          <Calendar className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{monthLabel(run)}</p>
                          <p className="text-xs text-slate-400">{run.date_range}</p>
                        </div>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>

                    {started && (
                      <dl className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
                        <div>
                          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Employees</dt>
                          <dd className="mt-0.5 text-sm font-bold text-slate-900">{run.total_employees}</dd>
                        </div>
                        <div>
                          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Gross</dt>
                          <dd className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(run.gross_earnings)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Net</dt>
                          <dd className="mt-0.5 text-sm font-bold text-emerald-600">{formatCurrency(run.total_salary)}</dd>
                        </div>
                      </dl>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        Attendance <AttendanceBadge locked={run.attendance_locked} />
                      </span>
                      {started && slipsText(run) !== '—' && (
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {slipsText(run)}
                        </span>
                      )}
                    </div>

                    {actionButton(run, true)}
                  </li>
                );
              })}
            </ul>

            {/* Large screens: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50/95">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <th className={th}>Month</th>
                    <th className={`${th} text-center`}>Employees</th>
                    <th className={`${th} text-right`}>Gross salary</th>
                    <th className={`${th} text-right`}>Employee PF</th>
                    <th className={`${th} text-right`}>Net salary</th>
                    <th className={th}>Attendance</th>
                    <th className={th}>Status</th>
                    <th className={th}>Salary slips</th>
                    <th className={`${th} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => {
                    const started = run.status !== 'NOT_STARTED';
                    return (
                      <tr key={`${run.payroll_year}-${run.payroll_month}`} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${STATUS_STYLE[run.status].tile}`}>
                              <Calendar className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="whitespace-nowrap font-semibold text-slate-900">{monthLabel(run)}</p>
                              <p className="whitespace-nowrap text-xs text-slate-400">{run.date_range}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{started ? run.total_employees : <span className="text-slate-300">—</span>}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-800">{started ? formatCurrency(run.gross_earnings) : <span className="text-slate-300">—</span>}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-slate-500">{started ? formatCurrency(run.employee_pf_total) : <span className="text-slate-300">—</span>}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-slate-900">{started ? formatCurrency(run.total_salary) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-3.5">
                          <AttendanceBadge locked={run.attendance_locked} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={run.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                          {slipsText(run) === '—' ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              {slipsText(run)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">{actionButton(run)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
              <Banknote className="h-3.5 w-3.5" />
              <span>
                <b className="font-semibold text-slate-800">{runs.length}</b> {runs.length === 1 ? 'month' : 'months'} in {selectedYear}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <StartPayrollModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        defaultYear={targetStartMonth?.year}
        defaultMonth={targetStartMonth?.month}
      />

      <PayrollSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};
