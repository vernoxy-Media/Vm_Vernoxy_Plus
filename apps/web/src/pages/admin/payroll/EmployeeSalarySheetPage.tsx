import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  FileText,
} from 'lucide-react';
import {
  useEmployeeSalarySheetQuery,
  usePayrollRegisterQuery,
  PayrollDayItem,
} from '../../../hooks/use-payroll';
import { DayAdjustmentModal } from './DayAdjustmentModal';
import { AddAdjustmentModal } from './AddAdjustmentModal';
import { SalarySlipModal } from './SalarySlipModal';

export const EmployeeSalarySheetPage: React.FC = () => {
  const { year: yearParam, month: monthParam, empId: empIdParam } = useParams<{
    year: string;
    month: string;
    empId: string;
  }>();
  const navigate = useNavigate();

  const year = parseInt(yearParam || '2026', 10);
  const month = parseInt(monthParam || '9', 10);
  const empId = parseInt(empIdParam || '1', 10);

  const [activeTab, setActiveTab] = useState<'summary' | 'day_wise' | 'history'>('summary');
  const [selectedDay, setSelectedDay] = useState<PayrollDayItem | null>(null);
  const [isDayAdjModalOpen, setIsDayAdjModalOpen] = useState(false);
  const [isAddAdjModalOpen, setIsAddAdjModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  const { data: sheetData, isLoading, error } = useEmployeeSalarySheetQuery(year, month, empId);
  const { data: registerData } = usePayrollRegisterQuery(year, month);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !sheetData) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-600 font-semibold text-sm">Failed to load employee salary sheet.</p>
        <button
          onClick={() => navigate(`/admin/payroll/${year}/${month}`)}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Back to Register
        </button>
      </div>
    );
  }

  const { employee, days, adjustments, history, run } = sheetData;
  const isLockedOrPaid = run.status === 'LOCKED' || run.status === 'PAID';

  // Prev / Next employee navigation
  const empList = registerData?.employees || [];
  const currentIndex = empList.findIndex((e) => e.emp_id === empId);
  const prevEmp = currentIndex > 0 ? empList[currentIndex - 1] : null;
  const nextEmp = currentIndex >= 0 && currentIndex < empList.length - 1 ? empList[currentIndex + 1] : null;

  return (
    <>
    <div className="space-y-6 pb-12">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/admin/payroll/${year}/${month}`}
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                Payroll / {run.payroll_year}-{String(run.payroll_month).padStart(2, '0')} / {employee.employee_code}
              </p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>{employee.employee_name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  {employee.employee_code}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.role_name} • {employee.shift_name} • PF: {employee.pf_applicable ? 'Yes' : 'No'} • OT: {employee.ot_hours > 0 ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-right mr-2 hidden sm:block">
              <p className="text-3xs font-bold text-slate-400 uppercase">Daily Rate</p>
              <p className="text-sm font-black text-slate-800">₹ {employee.daily_rate.toLocaleString()}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsSlipModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition shadow-2xs"
              title="Preview / Print Official Payslip"
            >
              <FileText className="w-4 h-4" />
              <span>Payslip</span>
            </button>

            {prevEmp && (
              <button
                type="button"
                onClick={() => navigate(`/admin/payroll/${year}/${month}/employee/${prevEmp.emp_id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            {nextEmp && (
              <button
                type="button"
                onClick={() => navigate(`/admin/payroll/${year}/${month}/employee/${nextEmp.emp_id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="border-b border-slate-200 flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('day_wise')}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === 'day_wise'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Day-wise
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            History ({history.length})
          </button>
        </div>

        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Days in the month card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Days in the Month</h3>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-3xs font-semibold text-slate-400 uppercase">Calendar</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">{days.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-3xs font-semibold text-slate-400 uppercase">Weekly Offs</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">
                    {days.filter((d) => d.day_type === 'WEEKLY_OFF').length}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-3xs font-semibold text-slate-400 uppercase">Holidays</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">
                    {days.filter((d) => d.day_type === 'HOLIDAY').length}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <p className="text-3xs font-semibold text-blue-600 uppercase">Working Days</p>
                  <p className="text-base font-black text-blue-900 mt-0.5">{employee.total_working_days}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-3 text-center text-xs">
                <div>
                  <p className="text-3xs text-slate-400">Present</p>
                  <p className="font-bold text-slate-800">{employee.present_days}</p>
                </div>
                <div>
                  <p className="text-3xs text-slate-400">Paid Leave</p>
                  <p className="font-bold text-slate-800">{employee.paid_leave_days}</p>
                </div>
                <div>
                  <p className="text-3xs text-slate-400">Half Days</p>
                  <p className="font-bold text-slate-800">{employee.half_days}</p>
                </div>
                <div>
                  <p className="text-3xs text-slate-400">Unpaid / Absent</p>
                  <p className="font-bold text-slate-800">{employee.absent_days + employee.unpaid_leave_days}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-around text-center">
                <div>
                  <p className="text-2xs font-bold text-emerald-700 uppercase">Full Days Paid</p>
                  <p className="text-lg font-black text-emerald-900 mt-0.5">{employee.full_days}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-2xs font-bold text-blue-700 uppercase">Paid Days</p>
                  <p className="text-lg font-black text-blue-900 mt-0.5">{employee.paid_days}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <p className="text-2xs font-bold text-rose-700 uppercase">LOP Days</p>
                  <p className="text-lg font-black text-rose-900 mt-0.5">{employee.lop_days}</p>
                </div>
              </div>
            </div>

            {/* Calculation Breakdown Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Calculation Breakdown</h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Monthly Salary (Gross)</span>
                  <span className="font-bold text-slate-900">₹ {employee.monthly_salary.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">
                    Daily Rate ({employee.monthly_salary.toLocaleString()} ÷ {employee.total_working_days})
                  </span>
                  <span className="font-bold text-slate-900">₹ {employee.daily_rate.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">
                    Basic Salary ({employee.full_days} × {employee.daily_rate} + {employee.half_days} × {Math.round(employee.daily_rate * 0.5)})
                  </span>
                  <span className="font-bold text-slate-900">₹ {employee.basic_salary.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">
                    OT Amount ({employee.ot_hours} hrs × ₹ {employee.ot_rate})
                  </span>
                  <span className="font-bold text-slate-900">₹ {employee.ot_amount.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Additions (Bonuses, Arrears, etc.)</span>
                  <span className="font-bold text-emerald-700">+ ₹ {employee.total_additions.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">
                    Employee PF {employee.pf_applicable ? `(12% on ₹ ${employee.pf_wage.toLocaleString()})` : '(Not applicable)'}
                  </span>
                  <span className="font-bold text-rose-700">- ₹ {employee.employee_pf.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Deductions (Advance, Loan, Penalty)</span>
                  <span className="font-bold text-rose-700">- ₹ {employee.total_deductions.toLocaleString()}</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-2xs font-bold text-blue-700 uppercase tracking-wider">Total Salary (Net Pay)</p>
                    <p className="text-2xl font-black text-blue-900 mt-0.5">
                      ₹ {employee.total_salary.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-2xs text-slate-500">
                    <p>Employer PF (not deducted):</p>
                    <p className="font-bold text-slate-700">₹ {employee.employer_pf.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Adjustments Section */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Salary Adjustments</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Day-wise pay overrides, one-time bonuses, advances, and deductions.
                  </p>
                </div>
                {!isLockedOrPaid && (
                  <button
                    type="button"
                    onClick={() => setIsAddAdjModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add adjustment</span>
                  </button>
                )}
              </div>

              {adjustments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-500">No adjustments added for this month.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                  {adjustments.map((adj) => (
                    <div key={adj.payroll_adjustment_id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-3xs ${
                              adj.type === 'ADDITION'
                                ? 'bg-emerald-100 text-emerald-800'
                                : adj.type === 'DEDUCTION'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {adj.type === 'DAY_ADJUSTMENT' ? 'Day' : adj.type}
                          </span>
                          <span className="font-bold text-slate-800">
                            {adj.category_label || (adj.type === 'DAY_ADJUSTMENT' ? `Day ${adj.related_date}` : 'Adjustment')}
                          </span>
                          {adj.reference_number && (
                            <span className="text-slate-400 text-3xs font-medium">Ref: {adj.reference_number}</span>
                          )}
                        </div>
                        <p className="text-slate-600 text-2xs italic">&ldquo;{adj.reason}&rdquo;</p>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            adj.type === 'ADDITION'
                              ? 'text-emerald-700'
                              : adj.type === 'DEDUCTION'
                              ? 'text-rose-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {adj.type === 'ADDITION' ? `+ ₹ ${adj.amount.toLocaleString()}` : adj.type === 'DEDUCTION' ? `- ₹ ${adj.amount.toLocaleString()}` : 'Day Override'}
                        </p>
                        <p className="text-3xs text-slate-400">by {adj.created_by_name || 'Admin'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DAY-WISE CALENDAR GRID (Screen 5 / Section 7 Part 2) */}
        {activeTab === 'day_wise' && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Day-wise Attendance & Pay Value</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any working day to change how it is paid (Full, Half, or Unpaid). Attendance records are kept unchanged.
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-3xs font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present (P)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Half Day (HD)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent (A)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Leave (L)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Holiday (H)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Weekly Off (WO)
                </span>
              </div>
            </div>

            {/* Calendar Grid (7 columns: Mon to Sun) */}
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                <div key={dayName} className="text-center font-bold text-2xs text-slate-400 py-1">
                  {dayName}
                </div>
              ))}

              {days.map((dayItem) => {
                const dateObj = new Date(dayItem.attendance_date);
                const dayNum = dateObj.getDate();
                const isWorking = dayItem.is_working_day && dayItem.day_type === 'WORKING_DAY';
                const isAdjusted = dayItem.is_adjusted;

                return (
                  <div
                    key={dayItem.payroll_employee_day_id}
                    onClick={() => {
                      if (isWorking && !isLockedOrPaid) {
                        setSelectedDay(dayItem);
                        setIsDayAdjModalOpen(true);
                      }
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col justify-between min-h-[85px] transition ${
                      isAdjusted
                        ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30'
                        : !dayItem.is_working_day
                        ? 'bg-slate-50/70 border-slate-200/60 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-slate-800">{dayNum}</span>
                      <div className="flex items-center gap-1">
                        {isAdjusted && <Edit2 className="w-3 h-3 text-amber-600" />}
                        <span
                          className={`text-3xs px-1.5 py-0.5 rounded-md font-black ${
                            dayItem.attendance_code === 'P'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dayItem.attendance_code === 'HD'
                              ? 'bg-amber-100 text-amber-800'
                              : dayItem.attendance_code === 'A'
                              ? 'bg-rose-100 text-rose-800'
                              : dayItem.attendance_code === 'L'
                              ? 'bg-blue-100 text-blue-800'
                              : dayItem.attendance_code === 'H'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {dayItem.attendance_code}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-2xs">
                      {dayItem.day_type === 'HOLIDAY' ? (
                        <p className="text-3xs font-medium text-purple-700 truncate" title={dayItem.holiday_name || ''}>
                          {dayItem.holiday_name}
                        </p>
                      ) : dayItem.day_type === 'WEEKLY_OFF' ? (
                        <p className="text-3xs text-slate-400">Weekly off</p>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-800">
                            {dayItem.paid_as === 'FULL'
                              ? 'Full'
                              : dayItem.paid_as === 'HALF'
                              ? 'Half'
                              : 'Unpaid'}
                          </p>
                          <p className="text-3xs font-semibold text-slate-500">
                            ₹ {dayItem.calculated_amount.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid Footer Totals */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Full days: {employee.full_days} × ₹ {employee.daily_rate} = ₹ {(employee.full_days * employee.daily_rate).toLocaleString()} • Half days: {employee.half_days} × ₹ {Math.round(employee.daily_rate * 0.5)} = ₹ {(employee.half_days * Math.round(employee.daily_rate * 0.5)).toLocaleString()}
              </span>
              <span className="font-bold text-slate-900">
                Basic Salary: ₹ {employee.basic_salary.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Audit & Change History</h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">No history records yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map((h: any) => (
                  <div key={h.history_id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{h.action}</p>
                      <p className="text-slate-600 text-2xs">{h.reason || 'Calculation run'}</p>
                    </div>
                    <div className="text-right text-2xs text-slate-400">
                      <p>{h.performed_by_name || 'System'}</p>
                      <p>{new Date(h.performed_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day Adjustment Modal */}
      <DayAdjustmentModal
        isOpen={isDayAdjModalOpen}
        onClose={() => setIsDayAdjModalOpen(false)}
        day={selectedDay}
        payrollEmployeeId={employee.payroll_employee_id}
        employeeName={employee.employee_name}
        dailyRate={employee.daily_rate}
      />

      {/* Add Adjustment Modal */}
      <AddAdjustmentModal
        isOpen={isAddAdjModalOpen}
        onClose={() => setIsAddAdjModalOpen(false)}
        payrollEmployeeId={employee.payroll_employee_id}
        employeeName={employee.employee_name}
      />

      {/* Salary Slip Modal */}
      <SalarySlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        year={year}
        month={month}
        empId={empId}
      />
    </>
  );
};
