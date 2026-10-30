import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Check,
  X,
  ChevronRight,
  FileText,
  Send,
} from 'lucide-react';
import {
  usePayrollRegisterQuery,
  useStartOrCalculatePayrollMutation,
  useApproveOtMutation,
  useGenerateSalarySlipsMutation,
  useReleaseSalarySlipsMutation,
} from '../hooks/use-payroll';
import { LockPayrollModal } from '../components/LockPayrollModal';
import { MarkPaidModal } from '../components/MarkPaidModal';
import { UnlockPayrollModal } from '../components/UnlockPayrollModal';
import { SalarySlipModal } from '../components/SalarySlipModal';

export const PayrollRegisterPage: React.FC = () => {
  const { year: yearParam, month: monthParam } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();

  const year = parseInt(yearParam || '2026', 10);
  const month = parseInt(monthParam || '9', 10);

  const { data: registerData, isLoading, error } = usePayrollRegisterQuery(year, month);
  const recalculateMutation = useStartOrCalculatePayrollMutation();
  const approveOtMutation = useApproveOtMutation();
  const generateSlipsMutation = useGenerateSalarySlipsMutation();
  const releaseSlipsMutation = useReleaseSalarySlipsMutation();

  const [activeTab, setActiveTab] = useState<'register' | 'ot_hours' | 'adjustments' | 'checks'>('register');
  const [searchTerm, setSearchTerm] = useState('');
  const [flagFilter, setFlagFilter] = useState('ALL');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [selectedEmpIdForSlip, setSelectedEmpIdForSlip] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !registerData) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-rose-600 font-bold text-sm">Failed to load payroll register.</p>
        <button
          onClick={() => navigate('/admin/payroll')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Back to Payroll Runs
        </button>
      </div>
    );
  }

  const { run, employees, ot_entries, adjustments, checks } = registerData;
  const isDraft = run.status === 'DRAFT';
  const isLocked = run.status === 'LOCKED';
  const isPaid = run.status === 'PAID';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = `${monthNames[month - 1]} ${year}`;

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (flagFilter === 'ERRORS') return emp.flag === 'ERROR';
    if (flagFilter === 'WARNINGS') return emp.flag === 'WARNING';
    if (flagFilter === 'JOINED') return emp.flag === 'JOINED_IN_MONTH';
    if (flagFilter === 'LEFT') return emp.flag === 'LEFT_IN_MONTH';
    if (flagFilter === 'ADJUSTED') return emp.flag === 'ADJUSTED';
    return true;
  });

  const handleRecalculate = async () => {
    try {
      await recalculateMutation.mutateAsync({ year, month });
    } catch (err: any) {
      alert(err.message || 'Failed to recalculate payroll');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Emp ID', 'Employee Name', 'Department', 'Work Days', 'Full Days', 'Half Days',
      'LOP Days', 'Paid Days', 'Basic Salary', 'OT Amount', 'PF Employee', 'Adjustments Net', 'Total Salary (Net)'
    ];
    const rows = filteredEmployees.map((e) => [
      `"${e.employee_code}"`,
      `"${e.employee_name}"`,
      `"${e.department_names || ''}"`,
      e.total_working_days,
      e.full_days,
      e.half_days,
      e.lop_days,
      e.paid_days,
      e.basic_salary,
      e.ot_amount,
      e.employee_pf,
      e.adj_net,
      e.total_salary,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_register_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApproveOt = async (otEntryId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await approveOtMutation.mutateAsync({ otEntryId, data: { status } });
    } catch (err: any) {
      alert(err.message || 'Failed to update OT');
    }
  };

  const handleGenerateSlips = async () => {
    try {
      const res = await generateSlipsMutation.mutateAsync({ year, month });
      alert(res.message || 'Salary slips generated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate salary slips.');
    }
  };

  const handleReleaseSlips = async () => {
    if (!window.confirm('Release generated salary slips to employee self-service portals?')) return;
    try {
      const res = await releaseSlipsMutation.mutateAsync({ year, month });
      alert(res.message || 'Salary slips released successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to release salary slips.');
    }
  };

  return (
    <>
    <div className="space-y-6 pb-12">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/payroll"
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                Payroll / {monthName}
              </p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Payroll Register • {monthName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : isLocked
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <p className="text-2xs text-slate-400 mt-0.5">
                {run.calculated_at ? `Last calculated on ${new Date(run.calculated_at).toLocaleString()}` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {isDraft && (
              <>
                <button
                  type="button"
                  disabled={recalculateMutation.isPending}
                  onClick={handleRecalculate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Recalculate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Payroll</span>
                </button>
              </>
            )}

            {isLocked && (
              <>
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition shadow-2xs"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMarkPaidModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Paid</span>
                </button>
              </>
            )}

            {(isLocked || isPaid) && (
              <>
                <button
                  type="button"
                  disabled={generateSlipsMutation.isPending}
                  onClick={handleGenerateSlips}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition shadow-2xs disabled:opacity-50"
                  title="Generate/Re-generate Salary Slips"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{generateSlipsMutation.isPending ? 'Generating...' : 'Generate Slips'}</span>
                </button>

                <button
                  type="button"
                  disabled={releaseSlipsMutation.isPending}
                  onClick={handleReleaseSlips}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Release Slips to Employee Portals"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{releaseSlipsMutation.isPending ? 'Releasing...' : 'Release Slips'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Employees</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{run.total_employees}</p>
            <p className="text-2xs text-slate-400 mt-1">Included in this run</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Gross Earnings</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹ {run.gross_earnings.toLocaleString()}</p>
            <p className="text-2xs text-slate-400 mt-1">Basic + OT + Additions</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">PF (Employee Share)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹ {run.employee_pf_total.toLocaleString()}</p>
            <p className="text-2xs text-slate-400 mt-1">Deducted from salary</p>
          </div>

          <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-200/80 shadow-2xs">
            <p className="text-3xs font-bold text-blue-700 uppercase tracking-wider">Total Salary (Net Pay)</p>
            <p className="text-2xl font-black text-blue-900 mt-1">₹ {run.total_salary.toLocaleString()}</p>
            <p className="text-2xs text-blue-700/80 mt-1">Disbursed to employees</p>
          </div>
        </div>

        {/* 4 Tabs Bar */}
        <div className="border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`pb-3 text-xs font-bold transition border-b-2 ${
                activeTab === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Register ({employees.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ot_hours')}
              className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'ot_hours'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>OT Hours</span>
              {ot_entries.filter((o) => o.status === 'PENDING').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-3xs font-black">
                  {ot_entries.filter((o) => o.status === 'PENDING').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('adjustments')}
              className={`pb-3 text-xs font-bold transition border-b-2 ${
                activeTab === 'adjustments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Adjustments ({adjustments.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checks')}
              className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'checks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Checks</span>
              {checks.errors.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-3xs font-black">
                  {checks.errors.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: REGISTER TAB (Screen 3, Section 6) */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name or EMP code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {['ALL', 'ERRORS', 'WARNINGS', 'JOINED', 'LEFT', 'ADJUSTED'].map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setFlagFilter(filterVal)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      flagFilter === filterVal
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {filterVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-semibold text-3xs uppercase tracking-wider">
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-2 text-center">Work Days</th>
                      <th className="py-3.5 px-2 text-center">Full</th>
                      <th className="py-3.5 px-2 text-center">Half</th>
                      <th className="py-3.5 px-2 text-center">LOP</th>
                      <th className="py-3.5 px-2 text-center">Paid</th>
                      <th className="py-3.5 px-3 text-right">Basic Salary</th>
                      <th className="py-3.5 px-3 text-right">OT</th>
                      <th className="py-3.5 px-3 text-right">PF</th>
                      <th className="py-3.5 px-3 text-right">Adj (+/-)</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-800">Total Salary</th>
                      <th className="py-3.5 px-4">Flag</th>
                      <th className="py-3.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-400">
                          No employees match the filters.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr
                          key={emp.payroll_employee_id}
                          className="hover:bg-slate-50/80 transition cursor-pointer group"
                          onClick={() => navigate(`/admin/payroll/${year}/${month}/employee/${emp.emp_id}`)}
                        >
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {emp.employee_name}
                            </p>
                            <p className="text-3xs text-slate-400 font-medium">{emp.employee_code}</p>
                          </td>
                          <td className="py-3.5 px-2 text-center font-medium">{emp.total_working_days}</td>
                          <td className="py-3.5 px-2 text-center text-slate-600">{emp.full_days}</td>
                          <td className="py-3.5 px-2 text-center text-slate-600">{emp.half_days}</td>
                          <td className="py-3.5 px-2 text-center text-rose-600 font-medium">{emp.lop_days}</td>
                          <td className="py-3.5 px-2 text-center font-bold text-blue-900">{emp.paid_days}</td>
                          <td className="py-3.5 px-3 text-right font-medium">₹ {emp.basic_salary.toLocaleString()}</td>
                          <td className="py-3.5 px-3 text-right text-slate-600">
                            {emp.ot_amount > 0 ? `₹ ${emp.ot_amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-600">
                            {emp.employee_pf > 0 ? `₹ ${emp.employee_pf.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium">
                            {emp.adj_net > 0 ? (
                              <span className="text-emerald-700">+₹ {emp.adj_net.toLocaleString()}</span>
                            ) : emp.adj_net < 0 ? (
                              <span className="text-rose-700">-₹ {Math.abs(emp.adj_net).toLocaleString()}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            ₹ {emp.total_salary.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            {emp.flag === 'ERROR' && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-rose-100 text-rose-700 border border-rose-200" title={emp.validation_message || ''}>
                                Error
                              </span>
                            )}
                            {emp.flag === 'WARNING' && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-200" title={emp.validation_message || ''}>
                                Warning
                              </span>
                            )}
                            {emp.flag === 'JOINED_IN_MONTH' && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Joined
                              </span>
                            )}
                            {emp.flag === 'LEFT_IN_MONTH' && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Left
                              </span>
                            )}
                            {emp.flag === 'ADJUSTED' && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                Adjusted
                              </span>
                            )}
                            {emp.flag === 'NONE' && <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmpIdForSlip(emp.emp_id);
                                  setIsSlipModalOpen(true);
                                }}
                                title="View / Print Salary Slip"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <span className="text-slate-400 group-hover:text-blue-600 transition">
                                <ChevronRight className="w-4 h-4" />
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OT HOURS TAB (Section 9) */}
        {activeTab === 'ot_hours' && (
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-semibold text-3xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Day Type</th>
                    <th className="py-3.5 px-3 text-center">Worked Hours</th>
                    <th className="py-3.5 px-3 text-center">Proposed</th>
                    <th className="py-3.5 px-3 text-center">Approved</th>
                    <th className="py-3.5 px-3 text-right">OT Rate</th>
                    <th className="py-3.5 px-3 text-right">OT Amount</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {ot_entries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No overtime entries recorded for this month.
                      </td>
                    </tr>
                  ) : (
                    ot_entries.map((ot) => (
                      <tr key={ot.payroll_ot_entry_id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{ot.employee_name}</td>
                        <td className="py-3.5 px-3">{ot.attendance_date}</td>
                        <td className="py-3.5 px-3 text-slate-500">{ot.day_type}</td>
                        <td className="py-3.5 px-3 text-center">{ot.worked_hours} hrs</td>
                        <td className="py-3.5 px-3 text-center font-semibold text-blue-600">{ot.proposed_hours} hrs</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">{ot.approved_hours} hrs</td>
                        <td className="py-3.5 px-3 text-right">₹ {ot.hourly_rate}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">₹ {ot.ot_amount}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                              ot.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ot.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : ot.status === 'REDUCED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ot.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isDraft && ot.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveOt(ot.payroll_ot_entry_id, 'APPROVED')}
                                className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                title="Approve"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveOt(ot.payroll_ot_entry_id, 'REJECTED')}
                                className="p-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ADJUSTMENTS TAB (Section 8) */}
        {activeTab === 'adjustments' && (
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-semibold text-3xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-4">Reason / Notes</th>
                    <th className="py-3.5 px-3 text-right">Amount / Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No adjustments recorded for this month.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((a) => (
                      <tr key={a.payroll_adjustment_id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{a.employee_name}</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-3xs font-bold ${
                              a.type === 'ADDITION'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.type === 'DEDUCTION'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {a.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-700">{a.category_label || '-'}</td>
                        <td className="py-3.5 px-4 text-slate-600 text-2xs italic">&ldquo;{a.reason}&rdquo;</td>
                        <td className="py-3.5 px-3 text-right font-black">
                          {a.type === 'ADDITION'
                            ? `+ ₹ ${a.amount.toLocaleString()}`
                            : a.type === 'DEDUCTION'
                            ? `- ₹ ${a.amount.toLocaleString()}`
                            : 'Day Override'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CHECKS TAB (Section 16) */}
        {activeTab === 'checks' && (
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Errors & Warnings Overview</h3>

              {checks.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <p className="font-bold flex items-center gap-2 text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Blocking Errors ({checks.errors.length}) — These block locking the payroll run</span>
                  </p>
                  <ul className="list-disc pl-5 text-2xs space-y-1">
                    {checks.errors.map((err, idx) => (
                      <li key={idx}>
                        <strong>{err.employee_name} ({err.employee_code}):</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {checks.warnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Non-blocking Warnings ({checks.warnings.length})</span>
                  </p>
                  <ul className="list-disc pl-5 text-2xs space-y-1">
                    {checks.warnings.map((warn, idx) => (
                      <li key={idx}>
                        <strong>{warn.employee_name}:</strong> {warn.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {checks.errors.length === 0 && checks.warnings.length === 0 && (
                <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-bold">All checks passed! No errors or warnings found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <LockPayrollModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        year={year}
        month={month}
        monthName={monthName}
        totals={{
          total_employees: run.total_employees,
          gross_earnings: run.gross_earnings,
          employee_pf_total: run.employee_pf_total,
          employer_pf_total: run.employer_pf_total,
          total_salary: run.total_salary,
        }}
        checks={checks}
      />

      <MarkPaidModal
        isOpen={isMarkPaidModalOpen}
        onClose={() => setIsMarkPaidModalOpen(false)}
        year={year}
        month={month}
        monthName={monthName}
        totalSalary={run.total_salary}
        totalEmployees={run.total_employees}
        employees={employees}
      />

      <UnlockPayrollModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        year={year}
        month={month}
        monthName={monthName}
      />

      <SalarySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => {
          setIsSlipModalOpen(false);
          setSelectedEmpIdForSlip(null);
        }}
        year={year}
        month={month}
        empId={selectedEmpIdForSlip}
      />
    </>
  );
};
