import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Eye,
  Calendar,
  Users,
  Building2,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useAttendanceReports } from '../hooks/use-attendance';
import { Pagination } from '@/shared/ui/Pagination';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Attendance', icon: Calendar, desc: 'Attendance of all employees for one or several days' },
  { id: 'monthly_summary', label: 'Monthly Summary', icon: FileSpreadsheet, desc: 'One row per employee, one column per day' },
  { id: 'employee', label: 'Employee-wise', icon: Users, desc: 'Day-by-day record of one specific employee' },
  { id: 'department', label: 'Department-wise', icon: Building2, desc: 'Aggregated totals and attendance metrics for each department' },
  { id: 'late_early', label: 'Late and Early Exit', icon: Clock, desc: 'Employees with late arrival marks or early exits' },
  { id: 'regularization', label: 'Regularization', icon: FileCheck, desc: 'Audit log of attendance correction requests raised' },
] as const;

type ReportTypeId = typeof REPORT_TYPES[number]['id'];

const STATUS_BADGE_COLORS: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700',
  Absent: 'bg-rose-100 text-rose-700',
  'Half Day': 'bg-amber-100 text-amber-700',
  'On Leave': 'bg-blue-100 text-blue-700',
  'Weekly Off': 'bg-slate-100 text-slate-600',
  Holiday: 'bg-purple-100 text-purple-700',
  'Missing Punch': 'bg-orange-100 text-orange-700',
  Late: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export const AttendanceReportsSection: React.FC = () => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const firstOfMonthStr = useMemo(() => {
    const [y, m] = todayStr.split('-');
    return `${y}-${m}-01`;
  }, [todayStr]);

  const [activeReportType, setActiveReportType] = useState<ReportTypeId>('daily');
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<number | undefined>(undefined);
  const [shiftFilter, setShiftFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportFormat, setExportFormat] = useState<'Excel' | 'PDF' | 'CSV'>('Excel');

  // Query triggers when "View Report" or initial mount
  const [appliedFilters, setAppliedFilters] = useState<{
    reportType: ReportTypeId;
    fromDate: string;
    toDate: string;
    departmentId?: string;
    employeeId?: number;
    shiftId?: number;
    status?: string;
  }>({
    reportType: 'daily',
    fromDate: todayStr,
    toDate: todayStr,
    departmentId: undefined,
    employeeId: undefined,
    shiftId: undefined,
    status: undefined,
  });

  // When changing report type, auto-adjust default From Date
  const handleSelectReportType = (id: ReportTypeId) => {
    setActiveReportType(id);
    let nextFrom = fromDate;
    let nextTo = toDate;
    if (id === 'monthly_summary') {
      nextFrom = firstOfMonthStr;
      nextTo = todayStr;
      setFromDate(firstOfMonthStr);
      setToDate(todayStr);
    }
    setAppliedFilters({
      reportType: id,
      fromDate: nextFrom,
      toDate: nextTo,
      departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
      employeeId: employeeFilter,
      shiftId: shiftFilter,
      status: statusFilter !== 'All' ? statusFilter : undefined,
    });
  };

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      reportType: activeReportType,
      fromDate,
      toDate: toDate < fromDate ? fromDate : toDate,
      departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
      employeeId: employeeFilter,
      shiftId: shiftFilter,
      status: statusFilter !== 'All' ? statusFilter : undefined,
    });
  };

  const { data, isLoading, error, refetch } = useAttendanceReports(appliedFilters);

  // Back to the first page whenever a different report is loaded
  useEffect(() => setPage(1), [appliedFilters, pageSize]);

  const departments = data?.departments || [];
  const shifts = data?.shifts || [];
  const statuses = data?.statuses || ['All', 'Present', 'Absent', 'Half Day', 'On Leave', 'Weekly Off', 'Holiday', 'Missing Punch', 'Late'];
  const employees = data?.employees || [];
  const reportResult = data?.data;

  // Export handler
  const handleExport = () => {
    if (!reportResult || !reportResult.rows || reportResult.rows.length === 0) {
      alert('No data available to export for the selected criteria.');
      return;
    }

    if (exportFormat === 'PDF') {
      window.print();
      return;
    }

    // CSV / Excel CSV formatting
    let csvHeaders: string[] = [];
    let csvRows: string[][] = [];

    if (activeReportType === 'daily') {
      csvHeaders = ['Emp ID', 'Name', 'Department', 'Shift', 'Date', 'In', 'Out', 'Hours', 'Status'];
      csvRows = reportResult.rows.map((r: any) => [
        r.employee_code,
        r.name,
        r.department,
        r.shift,
        r.date,
        r.in_time,
        r.out_time,
        r.hours,
        r.status,
      ]);
    } else if (activeReportType === 'monthly_summary') {
      const dateCols = reportResult.date_columns || [];
      csvHeaders = ['Emp ID', 'Name', 'Department', ...dateCols, 'Present', 'Absent', 'Half Day', 'Leave', 'WO', 'Holiday', 'Late Marks', 'Total Hours'];
      csvRows = reportResult.rows.map((r: any) => [
        r.employee_code,
        r.name,
        r.department,
        ...dateCols.map((d: string) => r.days?.[d] || ''),
        String(r.present),
        String(r.absent),
        String(r.half_day),
        String(r.leave),
        String(r.weekly_off),
        String(r.holiday),
        String(r.late_marks),
        r.total_hours,
      ]);
    } else if (activeReportType === 'employee') {
      csvHeaders = ['Date', 'Shift', 'In', 'Out', 'Hours', 'Late By', 'Early Exit By', 'Status'];
      csvRows = reportResult.rows.map((r: any) => [
        r.date,
        r.shift,
        r.in_time,
        r.out_time,
        r.hours,
        r.late_by,
        r.early_exit_by,
        r.status,
      ]);
    } else if (activeReportType === 'department') {
      csvHeaders = ['Department', 'Employees', 'Present', 'Absent', 'Half Day', 'Leave', 'Late Marks', 'Average Hours'];
      csvRows = reportResult.rows.map((r: any) => [
        r.department,
        String(r.employees),
        String(r.present),
        String(r.absent),
        String(r.half_day),
        String(r.leave),
        String(r.late_marks),
        r.average_hours,
      ]);
    } else if (activeReportType === 'late_early') {
      csvHeaders = ['Date', 'Emp ID', 'Employee', 'Department', 'Shift', 'In', 'Out', 'Late By', 'Early Exit By', 'Monthly Late Marks'];
      csvRows = reportResult.rows.map((r: any) => [
        r.date,
        r.employee_code,
        r.name,
        r.department,
        r.shift,
        r.in_time,
        r.out_time,
        r.late_by,
        r.early_exit_by,
        String(r.late_marks_in_month),
      ]);
    } else if (activeReportType === 'regularization') {
      csvHeaders = ['Request ID', 'Employee', 'Date', 'Type', 'Status', 'Approver', 'Days Taken'];
      csvRows = reportResult.rows.map((r: any) => [
        r.request_id,
        `${r.employee} (${r.employee_code})`,
        r.date,
        r.type,
        r.status,
        r.approver,
        r.days_taken,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        csvHeaders.map((h) => `"${h}"`).join(','),
        ...csvRows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const ext = exportFormat === 'Excel' ? 'csv' : 'csv';
    link.setAttribute('download', `attendance_report_${activeReportType}_${fromDate}_${toDate}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allRows: any[] = reportResult?.rows ?? [];
  const safePage = Math.min(page, Math.max(1, Math.ceil(allRows.length / pageSize)));
  const pagedRows = allRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeReportObj = REPORT_TYPES.find((r) => r.id === activeReportType)!;

  return (
    <div className="space-y-6">
      {/* Layout: Left Sidebar (Report Types) + Right Content (Filters & Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Report Types Selector */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs p-2 lg:p-3 flex gap-1.5 overflow-x-auto lg:block lg:space-y-1.5 lg:overflow-visible">
          <div className="hidden lg:block px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Report Type
          </div>
          {REPORT_TYPES.map((rep) => {
            const Icon = rep.icon;
            const isSelected = activeReportType === rep.id;
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => handleSelectReportType(rep.id)}
                className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 lg:py-3 rounded-xl transition-all flex items-start gap-2.5 lg:gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/25'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="text-xs tracking-tight">{rep.label}</div>
                  <div
                    className={`hidden lg:block text-[10px] line-clamp-1 mt-0.5 ${
                      isSelected ? 'text-blue-100' : 'text-slate-400 font-normal'
                    }`}
                  >
                    {rep.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Filters & Preview Table */}
        <div className="lg:col-span-9 space-y-5">
          {/* Filter Bar */}
          <form
            onSubmit={handleApplyFilters}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* From Date * */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  From Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                />
              </div>

              {/* To Date * */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  To Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee (Conditional Mandatory for Employee-wise) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Employee {activeReportType === 'employee' && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={employeeFilter ?? ''}
                  onChange={(e) => setEmployeeFilter(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="">{activeReportType === 'employee' ? 'Select Employee' : 'All Employees'}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} · {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Shift
                </label>
                <select
                  value={shiftFilter ?? ''}
                  onChange={(e) => setShiftFilter(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="">All Shifts</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 cursor-pointer"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export As * */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Export As <span className="text-rose-500">*</span>
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full h-10 px-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 transition focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="Excel">Excel (.xlsx / .csv)</option>
                  <option value="CSV">CSV (.csv)</option>
                  <option value="PDF">PDF (Printable)</option>
                </select>
              </div>

              {/* Action Buttons: Export & View Report */}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Report</span>
                </button>
              </div>
            </div>
          </form>

          {/* Report Results Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {activeReportObj.label} Report
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Period: {appliedFilters.fromDate} to {appliedFilters.toDate}
                  {activeReportType === 'employee' && reportResult?.employee && (
                    <span className="ml-2 font-semibold text-blue-700">
                      · {reportResult.employee.name} ({reportResult.employee.employee_code})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-xs font-bold text-slate-600">
                {reportResult?.rows ? `${reportResult.rows.length} rows` : ''}
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-xs text-slate-400 font-medium">
                Loading report data...
              </div>
            ) : error ? (
              <div className="py-20 text-center text-xs font-medium space-y-2">
                <p className="text-rose-500 font-semibold">Failed to load attendance report data.</p>
                <p className="text-slate-400 text-[11px]">
                  {(error as any)?.message || 'Please verify your permissions or try again.'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : !reportResult || !reportResult.rows || reportResult.rows.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400 font-medium">
                No report records match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 1. DAILY ATTENDANCE TABLE */}
                {activeReportType === 'daily' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Emp ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Dept.</th>
                        <th className="px-4 py-3">Shift</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">In</th>
                        <th className="px-4 py-3">Out</th>
                        <th className="px-4 py-3">Hours</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((row: any, idx: number) => (
                        <tr key={`${row.emp_id}_${row.date}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{row.employee_code}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.name}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.department}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.shift}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">{row.in_time}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-mono">{row.out_time}</td>
                          <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{row.hours}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_BADGE_COLORS[row.status] || 'bg-slate-100 text-slate-600'}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 2. MONTHLY SUMMARY MATRIX TABLE */}
                {activeReportType === 'monthly_summary' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 whitespace-nowrap sticky left-0 bg-slate-50 z-10 shadow-xs">Emp ID</th>
                        <th className="px-3 py-3 whitespace-nowrap sticky left-24 bg-slate-50 z-10 shadow-xs">Name</th>
                        <th className="px-3 py-3 whitespace-nowrap">Dept</th>
                        {(reportResult.date_columns || []).map((d: string) => {
                          const dayNum = d.split('-')[2];
                          return (
                            <th key={d} className="px-2 py-3 text-center min-w-[28px] whitespace-nowrap">
                              {dayNum}
                            </th>
                          );
                        })}
                        <th className="px-3 py-3 text-center whitespace-nowrap text-emerald-700 font-extrabold">P</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap text-rose-700 font-extrabold">A</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap text-amber-700 font-extrabold">HD</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap text-blue-700 font-extrabold">L</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap text-slate-600 font-extrabold">WO</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap text-purple-700 font-extrabold">H</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap text-orange-700 font-extrabold">LM</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap text-slate-900 font-extrabold">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((row: any) => (
                        <tr key={row.emp_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-white z-10 shadow-xs">{row.employee_code}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap sticky left-24 bg-white z-10 shadow-xs">{row.name}</td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">{row.department}</td>
                          {(reportResult.date_columns || []).map((d: string) => {
                            const code = row.days?.[d] || '';
                            let badgeClass = 'text-slate-300';
                            if (code === 'P') badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
                            if (code === 'A') badgeClass = 'bg-rose-100 text-rose-800 font-bold';
                            if (code === 'HD') badgeClass = 'bg-amber-100 text-amber-800 font-bold';
                            if (code === 'L') badgeClass = 'bg-blue-100 text-blue-800 font-bold';
                            if (code === 'WO') badgeClass = 'bg-slate-100 text-slate-600 font-bold';
                            if (code === 'H') badgeClass = 'bg-purple-100 text-purple-800 font-bold';
                            if (code === 'MP') badgeClass = 'bg-orange-100 text-orange-800 font-bold';

                            return (
                              <td key={d} className="px-1 py-1.5 text-center">
                                {code ? (
                                  <span className={`inline-block w-5 h-5 leading-5 rounded text-[9px] ${badgeClass}`}>
                                    {code}
                                  </span>
                                ) : (
                                  <span className="text-slate-200">·</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{row.present}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-rose-700">{row.absent}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-amber-700">{row.half_day}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-blue-700">{row.leave}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-600">{row.weekly_off}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-purple-700">{row.holiday}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-orange-700">{row.late_marks}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">{row.total_hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 3. EMPLOYEE-WISE TABLE */}
                {activeReportType === 'employee' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Shift</th>
                        <th className="px-4 py-3">In</th>
                        <th className="px-4 py-3">Out</th>
                        <th className="px-4 py-3">Hours</th>
                        <th className="px-4 py-3">Late By</th>
                        <th className="px-4 py-3">Early Exit By</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((row: any, idx: number) => (
                        <tr key={`${row.date}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.shift}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{row.in_time}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{row.out_time}</td>
                          <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap font-mono">{row.hours}</td>
                          <td className="px-4 py-3 font-semibold text-rose-600 whitespace-nowrap">{row.late_by}</td>
                          <td className="px-4 py-3 font-semibold text-orange-600 whitespace-nowrap">{row.early_exit_by}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_BADGE_COLORS[row.status] || 'bg-slate-100 text-slate-600'}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 4. DEPARTMENT-WISE TABLE */}
                {activeReportType === 'department' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3 text-center">Employees</th>
                        <th className="px-4 py-3 text-center text-emerald-700">Present</th>
                        <th className="px-4 py-3 text-center text-rose-700">Absent</th>
                        <th className="px-4 py-3 text-center text-amber-700">Half Day</th>
                        <th className="px-4 py-3 text-center text-blue-700">Leave</th>
                        <th className="px-4 py-3 text-center text-orange-700">Late Marks</th>
                        <th className="px-4 py-3 text-right">Average Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((row: any) => (
                        <tr key={row.department_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{row.department}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-700">{row.employees}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-700">{row.present}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-rose-700">{row.absent}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-amber-700">{row.half_day}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-blue-700">{row.leave}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-orange-700">{row.late_marks}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono">{row.average_hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 5. LATE AND EARLY EXIT TABLE */}
                {activeReportType === 'late_early' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Emp ID</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Shift</th>
                        <th className="px-4 py-3">Late By</th>
                        <th className="px-4 py-3">Early Exit By</th>
                        <th className="px-4 py-3 text-center">Late Marks in Month</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((row: any, idx: number) => (
                        <tr key={`${row.emp_id}_${row.date}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{row.employee_code}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.name}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.department}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.shift}</td>
                          <td className="px-4 py-3 font-bold text-rose-600 whitespace-nowrap">{row.late_by}</td>
                          <td className="px-4 py-3 font-bold text-amber-600 whitespace-nowrap">{row.early_exit_by}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">
                              {row.late_marks_in_month}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 6. REGULARIZATION TABLE */}
                {activeReportType === 'regularization' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Request ID</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Approver</th>
                        <th className="px-4 py-3">Days Taken</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pagedRows.map((row: any) => (
                        <tr key={row.request_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 whitespace-nowrap">{row.request_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">
                            {row.employee} <span className="text-slate-400 font-mono text-[11px]">({row.employee_code})</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{row.type}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_COLORS[row.status] || 'bg-slate-100 text-slate-600'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{row.approver}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.days_taken}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {!isLoading && !error && allRows.length > 0 && (
              <Pagination page={safePage} pageSize={pageSize} total={allRows.length} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizes={[10, 25, 50, 100]} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
