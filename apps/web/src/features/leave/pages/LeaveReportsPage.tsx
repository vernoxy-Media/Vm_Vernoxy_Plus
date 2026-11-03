import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useLeaveReportsQuery, useLeaveTypesQuery } from '../hooks/use-leave';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';

export const LeaveReportsPage: React.FC = (): React.ReactElement => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [reportType, setReportType] = useState<string>('summary');
  const [month, setMonth] = useState<string>(currentMonth);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [deptId, setDeptId] = useState<number | undefined>(undefined);
  const [empId, setEmpId] = useState<number | undefined>(undefined);
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'type' | 'department' | 'employee'>('type');

  // Queries
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: rawEmployees = [] } = useEmployeeOptionsQuery();
  const empOptions = React.useMemo(() => {
    if (Array.isArray(rawEmployees)) return rawEmployees;
    return (rawEmployees as any)?.items || (rawEmployees as any)?.data || [];
  }, [rawEmployees]);

  const { data, isLoading } = useLeaveReportsQuery({
    report_type: reportType,
    month: month || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    department_id: deptId,
    employee_id: empId,
    leave_type_id: typeId,
    status: status || undefined,
    group_by: groupBy,
  });

  const exportCsv = () => {
    if (!data) return;
    const csvRows: string[][] = [];

    if (reportType === 'summary') {
      csvRows.push(['Metric', 'Value']);
      csvRows.push(['Total Leave Days Taken', String(data.totals?.received || 0)]);
      csvRows.push(['Paid Leave Days', String(data.totals?.paid || 0)]);
      csvRows.push(['Unpaid Leave Days (LOP)', String(data.totals?.unpaid || 0)]);
      csvRows.push(['Pending Requests', String(data.totals?.pending || 0)]);
      if (data.breakdown && data.breakdown.length > 0) {
        csvRows.push([]);
        csvRows.push(['Group / Entity', 'Type', 'Total Days', 'Employees', 'Avg Days']);
        data.breakdown.forEach((b) => {
          csvRows.push([
            b.name,
            b.paid_unpaid || '',
            String(b.days),
            String(b.employees),
            String(b.avg_days),
          ]);
        });
      }
    } else if (data.requests && data.requests.length > 0) {
      csvRows.push([
        'Request No',
        'Employee',
        'Department',
        'Leave Type',
        'Paid/Unpaid',
        'From Date',
        'To Date',
        'Duration',
        'Days',
        'Status',
        'Applied At',
        'Decided By',
      ]);
      data.requests.forEach((r) => {
        csvRows.push([
          r.request_no,
          r.employee_name || '',
          r.department_name || '',
          r.leave_type_name || '',
          r.is_paid ? 'Paid' : 'Unpaid',
          r.from_date?.slice(0, 10) || '',
          r.to_date?.slice(0, 10) || '',
          r.duration || '',
          String(r.leave_days),
          r.status,
          r.applied_at?.slice(0, 10) || '',
          r.decided_by_name || '',
        ]);
      });
    } else if (data.on_leave_today && data.on_leave_today.length > 0) {
      csvRows.push(['Request No', 'Employee', 'Department', 'Leave Type', 'Duration', 'From', 'To', 'Days', 'Back On']);
      data.on_leave_today.forEach((o) => {
        csvRows.push([
          o.request_no,
          o.employee_name || '',
          o.department_name || '',
          o.leave_type_name || '',
          o.duration || '',
          o.from_date?.slice(0, 10) || '',
          o.to_date?.slice(0, 10) || '',
          String(o.leave_days),
          o.back_on?.slice(0, 10) || '',
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leave_report_${reportType}_${month || 'custom'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'register', label: 'Leave Register' },
    { id: 'balances', label: 'Balances' },
    { id: 'lop', label: 'Unpaid Leave (LOP)' },
    { id: 'on_leave_today', label: 'On Leave Today' },
    { id: 'pending', label: 'Pending' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/leave?tab=requests"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Leave Requests
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Leave Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analyze leave trends, departmental breakdown, SLA compliance, unpaid leaves, and export audit registers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/leave?tab=calendar"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            Leave Calendar
          </Link>
          <button
            onClick={exportCsv}
            disabled={isLoading || !data}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              reportType === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-600" /> Report Filters
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setFromDate('');
                setToDate('');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setMonth('');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setMonth('');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Leave Type</label>
            <SearchableSelect
              placeholder="All Types"
              value={typeId ?? null}
              onChange={(v) => setTypeId(v ? Number(v) : undefined)}
              options={types.map((t) => ({ value: t.leave_type_id, label: t.name }))}
              clearable
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
            <SearchableSelect
              placeholder="All Departments"
              value={deptId ?? null}
              onChange={(v) => setDeptId(v ? Number(v) : undefined)}
              options={deptOptions.map((d: any) => ({ value: d.dep_id || d.id, label: d.name }))}
              clearable
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <SearchableSelect
              placeholder="All Statuses"
              value={status || null}
              onChange={(v) => setStatus(v ? String(v) : '')}
              options={[
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'WITHDRAWN', label: 'Withdrawn' },
              ]}
              clearable
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Employee</label>
            <SearchableSelect
              placeholder="All Employees"
              value={empId ?? null}
              onChange={(v) => setEmpId(v ? Number(v) : undefined)}
              options={empOptions.map((e: any) => ({ value: e.emp_id || e.id, label: e.name }))}
              clearable
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">Generating report data...</p>
        </div>
      ) : reportType === 'summary' ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Total Leave Days Taken</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data?.totals?.received || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-emerald-600 font-bold uppercase text-[10px]">Paid Leave Days</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{data?.totals?.paid || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-rose-600 font-bold uppercase text-[10px]">Unpaid Leave Days (LOP)</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{data?.totals?.unpaid || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-amber-600 font-bold uppercase text-[10px]">Pending Requests</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{data?.totals?.pending || 0}</p>
            </div>
          </div>

          {/* Historical 6-Month Trend */}
          {data?.trend && data.trend.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" /> 6-Month Volume Trend
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {data.trend.map((m, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-center transition ${
                      m.is_selected ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-600">{m.label}</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">{m.received} <span className="text-[10px] font-normal text-slate-400">days</span></div>
                    <span className="text-[10px] text-slate-500 block">
                      {m.paid} paid • {m.unpaid} unpaid
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Leave Breakdown</h3>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                {(['type', 'department', 'employee'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={`px-3 py-1 rounded-md capitalize transition cursor-pointer ${
                      groupBy === g ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Group / Entity</th>
                    {groupBy === 'type' && <th className="py-3 px-4">Type</th>}
                    <th className="py-3 px-4 text-center">Total Leave Days</th>
                    <th className="py-3 px-4 text-center">Employees</th>
                    <th className="py-3 px-4 text-center">Avg Days / Employee</th>
                    <th className="py-3 px-4 text-right">Share of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data?.breakdown || data.breakdown.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No leave records found for this period.
                      </td>
                    </tr>
                  ) : (
                    data.breakdown.map((row, idx) => {
                      const total = data.totals?.received || 1;
                      const pct = Math.round((row.days / total) * 100);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-semibold text-slate-800">{row.name}</td>
                          {groupBy === 'type' && (
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  row.paid_unpaid === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {row.paid_unpaid}
                              </span>
                            </td>
                          )}
                          <td className="py-3 px-4 text-center font-bold text-slate-900">{row.days}</td>
                          <td className="py-3 px-4 text-center text-slate-600">{row.employees}</td>
                          <td className="py-3 px-4 text-center text-slate-600">{row.avg_days}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                              {pct}%
                              <span
                                className="inline-block h-2 bg-blue-500 rounded-full"
                                style={{ width: `${Math.max(pct, 5)}px` }}
                              />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'balances' ? (
        /* Balances Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Policy</th>
                  <th className="py-3 px-4">Leave Balances (Available / Credited)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data?.balances || data.balances.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No balance data available.
                    </td>
                  </tr>
                ) : (
                  data.balances.map((b: any) => (
                    <tr key={b.emp_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">{b.employee_name}</td>
                      <td className="py-3 px-4 text-slate-600">{b.department_name || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{b.policy_name || 'Standard'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          {(b.balances || []).map((bal: any) => (
                            <div
                              key={bal.leave_type_id}
                              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"
                            >
                              <span className="font-bold text-slate-800">{bal.code}: </span>
                              <span className="font-semibold text-blue-600">{bal.available_balance}</span>
                              <span className="text-slate-400"> / {bal.credited_days} credited</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : reportType === 'on_leave_today' ? (
        /* On Leave Today Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request No</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Leave Days</th>
                  <th className="py-3 px-4">Back On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data?.on_leave_today || data.on_leave_today.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No employees are on leave today.
                    </td>
                  </tr>
                ) : (
                  data.on_leave_today.map((o: any) => (
                    <tr key={o.request_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.request_no}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{o.employee_name}</td>
                      <td className="py-3 px-4 text-slate-600">{o.department_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {o.leave_type_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{o.duration?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {o.from_date?.slice(0, 10)} to {o.to_date?.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{o.leave_days}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{o.back_on?.slice(0, 10)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Requests Table (Register, LOP, Pending) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request No</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Status</th>
                  {reportType === 'pending' ? (
                    <th className="py-3 px-4">Waiting For</th>
                  ) : (
                    <th className="py-3 px-4">Decided By</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!data?.requests || data.requests.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No leave requests found for this filter.
                    </td>
                  </tr>
                ) : (
                  data.requests.map((r: any) => (
                    <tr key={r.request_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{r.request_no}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{r.employee_name}</td>
                      <td className="py-3 px-4 text-slate-600">{r.department_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {r.leave_type_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.from_date?.slice(0, 10)} to {r.to_date?.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{r.duration?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.leave_days}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : r.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      {reportType === 'pending' ? (
                        <td className="py-3 px-4">
                          <span className="font-semibold text-amber-600">{r.pending_hours || 0} hrs</span>
                          {r.is_short_notice && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Short notice
                            </span>
                          )}
                        </td>
                      ) : (
                        <td className="py-3 px-4 text-slate-600">{r.decided_by_name || '—'}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
