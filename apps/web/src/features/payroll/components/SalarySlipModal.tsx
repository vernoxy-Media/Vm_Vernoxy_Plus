import React from 'react';
import { X, Printer, Loader2, Building2, User, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import { useSalarySlipQuery } from '../hooks/use-payroll';

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  empId?: number | null;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  empId,
}) => {
  const { data: slip, isLoading, error } = useSalarySlipQuery(year, month, empId || 0, isOpen && !!empId);

  if (!isOpen || !empId) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Employee Salary Slip</h3>
              <p className="text-xs text-slate-500 font-medium">
                {slip?.slip_info?.slip_number || 'Official Compensation Statement'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || !slip}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Slip Content */}
        <div className="p-6 sm:p-10 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-8">
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Generating salary slip preview...</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
                <X className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Unable to load salary slip</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {(error as any)?.message || 'Make sure the payroll run is locked and slips have been generated.'}
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          )}

          {slip && (
            <div id="salary-slip-printable" className="space-y-6 text-slate-800">
              {/* Slip Header: Company Info */}
              <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600 print:text-black" />
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 print:text-black">
                      {slip.company.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 print:text-slate-700">{slip.company.address}</p>
                  <p className="text-xs text-slate-400 print:text-slate-600">
                    CIN: <span className="font-mono">{slip.company.cin}</span> • Email: {slip.company.email}
                  </p>
                </div>
                <div className="text-left sm:text-right space-y-1 bg-slate-50 print:bg-transparent p-3 rounded-2xl border border-slate-100 print:border-none">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 print:border print:border-black print:text-black">
                    {slip.slip_info.status}
                  </span>
                  <p className="text-xs font-bold text-slate-900 print:text-black">
                    Payslip for {slip.slip_info.payroll_month}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Slip No: {slip.slip_info.slip_number}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Period: {slip.slip_info.payroll_period}
                  </p>
                </div>
              </div>

              {/* Employee Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs print:bg-white print:border print:border-slate-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Employee Information</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-400">Employee Name:</span>
                    <span className="col-span-2 font-bold text-slate-900 print:text-black">{slip.employee.name}</span>

                    <span className="text-slate-400">Employee ID:</span>
                    <span className="col-span-2 font-semibold text-slate-800">{slip.employee.employee_code}</span>

                    <span className="text-slate-400">Designation:</span>
                    <span className="col-span-2 text-slate-700">{slip.employee.role_name || '—'}</span>

                    <span className="text-slate-400">Department:</span>
                    <span className="col-span-2 text-slate-700">{slip.employee.department_name || '—'}</span>

                    <span className="text-slate-400">Date of Joining:</span>
                    <span className="col-span-2 text-slate-700">{slip.employee.joining_date || '—'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Payment & Statutory Details</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-400">Bank Name:</span>
                    <span className="col-span-2 font-semibold text-slate-800">{slip.employee.bank_name || '—'}</span>

                    <span className="text-slate-400">Account No:</span>
                    <span className="col-span-2 font-mono text-slate-800">{slip.employee.bank_account_number || '—'}</span>

                    <span className="text-slate-400">IFSC Code:</span>
                    <span className="col-span-2 font-mono text-slate-800">{slip.employee.bank_ifsc || '—'}</span>

                    <span className="text-slate-400">UAN (PF):</span>
                    <span className="col-span-2 font-mono text-slate-800">{slip.employee.uan || 'Not Enrolled'}</span>

                    <span className="text-slate-400">Revision:</span>
                    <span className="col-span-2 text-slate-700">Rev #{slip.slip_info.revision_number}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Grid */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    Attendance Summary
                  </span>
                  <span>Month Days: {slip.attendance.total_working_days}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-200 text-center text-xs">
                  <div className="p-3">
                    <p className="text-[11px] text-slate-500">Working Days</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{slip.attendance.total_working_days}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-slate-500">Present</p>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">{slip.attendance.present_days}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-slate-500">Paid Leave</p>
                    <p className="text-sm font-bold text-blue-600 mt-0.5">{slip.attendance.paid_leave_days}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-slate-500">Half Days</p>
                    <p className="text-sm font-bold text-indigo-600 mt-0.5">{slip.attendance.half_days}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-slate-500">Absent / LOP</p>
                    <p className="text-sm font-bold text-rose-600 mt-0.5">{slip.attendance.lop_days}</p>
                  </div>
                  <div className="p-3 bg-slate-50/70">
                    <p className="text-[11px] font-semibold text-slate-700">Total Paid Days</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">{slip.attendance.paid_days}</p>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-4 py-2.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>Earnings</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {slip.earnings.map((e, idx) => (
                        <div key={idx} className="px-4 py-2 flex items-center justify-between">
                          <span className="text-slate-600">{e.name}</span>
                          <span className="font-semibold text-slate-900 font-mono">
                            ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Total Gross Earnings (A)</span>
                    <span className="font-mono text-emerald-700 font-extrabold text-sm">
                      ₹{slip.totals.gross_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-4 py-2.5 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between text-xs font-bold text-rose-900">
                      <span>Deductions</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {slip.deductions.map((d, idx) => (
                        <div key={idx} className="px-4 py-2 flex items-center justify-between">
                          <span className="text-slate-600">{d.name}</span>
                          <span className="font-semibold text-slate-900 font-mono">
                            ₹{d.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Total Deductions (B)</span>
                    <span className="font-mono text-rose-700 font-extrabold text-sm">
                      ₹{slip.totals.total_deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md print:bg-white print:border-2 print:border-black print:text-black">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 print:text-slate-700">
                      Net Salary Payable (A - B)
                    </p>
                    <p className="text-xs italic text-blue-100 mt-1 print:text-slate-800">
                      Amount in words: <span className="font-semibold text-white print:text-black">{slip.totals.net_salary_in_words}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white print:text-black">
                      ₹{slip.totals.net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employer Contributions Note */}
              {slip.employer_contribution.employer_pf > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center text-slate-600">
                  <span>Employer Provident Fund Contribution (Over and above CTC / Net):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{slip.employer_contribution.employer_pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Slip Footer */}
              <div className="pt-6 border-t border-slate-200 text-center space-y-2 text-[11px] text-slate-400 print:text-slate-600">
                <p>This is a system-generated compensation slip and does not require a physical signature.</p>
                <p className="font-mono text-[10px]">
                  Generated on {slip.slip_info.generated_at ? new Date(slip.slip_info.generated_at).toLocaleString('en-IN') : '—'}
                  {slip.slip_info.released_at && ` • Released to employee portal on ${new Date(slip.slip_info.released_at).toLocaleString('en-IN')}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
