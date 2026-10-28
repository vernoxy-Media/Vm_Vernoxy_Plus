import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  Settings,
  Plus,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  usePayrollRunsQuery,
  PayrollMonthItem,
} from '../../../hooks/use-payroll';
import { StartPayrollModal } from './StartPayrollModal';
import { PayrollSettingsModal } from './PayrollSettingsModal';

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

  const getStatusBadge = (status: PayrollMonthItem['status']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Lock className="w-3 h-3" /> Locked
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Not started
          </span>
        );
    }
  };

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salary & Payroll</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Monthly Processing
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Calculate salaries from locked attendance, apply day adjustments, approve overtime, and disburse.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Payroll Settings
          </button>

          <button
            type="button"
            onClick={() => handleOpenStartModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Start Payroll
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Run */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Current Run</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {data?.summary.current_run_month || 'None Active'}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Status:</span>
              <span className="text-xs font-semibold text-slate-700 capitalize">
                {data?.summary.current_run_status.toLowerCase() || 'No active run'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Employees Included */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Employees Included</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {data?.summary.total_employees ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Employees processed in latest run
            </div>
          </div>
        </div>

        {/* Card 3: Total Salary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Net Salary</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(data?.summary.total_salary)}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Net payable to employees
            </div>
          </div>
        </div>

        {/* Card 4: Warnings & Checks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Warnings / Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {data?.summary.warnings_count ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Items requiring review before lock
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Months' },
              { id: 'DRAFT', label: 'Draft' },
              { id: 'LOCKED', label: 'Locked' },
              { id: 'PAID', label: 'Paid' },
              { id: 'NOT_STARTED', label: 'Not Started' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500">Year:</span>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-center">Employees</th>
                <th className="py-3 px-4 text-right">Gross Salary</th>
                <th className="py-3 px-4 text-right">Employee PF</th>
                <th className="py-3 px-4 text-right">Total Net Salary</th>
                <th className="py-3 px-4 text-center">Attendance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Salary Slips</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Loading payroll runs...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-rose-500 text-sm">
                    Failed to load payroll runs. Please check server logs.
                  </td>
                </tr>
              ) : data?.runs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 text-sm">
                    No payroll runs found for selected year and filter.
                  </td>
                </tr>
              ) : (
                data?.runs.map((run) => {
                  const isStarted = run.status !== 'NOT_STARTED';

                  return (
                    <tr
                      key={`${run.payroll_year}-${run.payroll_month}`}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Month */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {run.month_name} {run.payroll_year}
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {run.date_range}
                      </td>

                      {/* Employees */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        {isStarted ? run.total_employees : '—'}
                      </td>

                      {/* Gross */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                        {isStarted ? formatCurrency(run.gross_earnings) : '—'}
                      </td>

                      {/* PF */}
                      <td className="py-3.5 px-4 text-right text-xs text-slate-600">
                        {isStarted ? formatCurrency(run.employee_pf_total) : '—'}
                      </td>

                      {/* Total Net */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {isStarted ? formatCurrency(run.total_salary) : '—'}
                      </td>

                      {/* Attendance lock */}
                      <td className="py-3.5 px-4 text-center">
                        {run.attendance_locked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            <Clock className="w-3 h-3" /> Unlocked
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(run.status)}
                      </td>

                      {/* Salary Slips */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                        {run.status === 'LOCKED' || run.status === 'PAID'
                          ? `${run.released_slips_count || run.total_employees} generated`
                          : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isStarted ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/payroll/${run.payroll_year}/${run.payroll_month}`)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                          >
                            Open Register
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenStartModal(run)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Start
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
