import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useComplaintReportsQuery } from '../../../hooks/use-complaints';
import { useComplaintTypesQuery, ComplaintTypeItem } from '../../../hooks/use-complaint-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '../../../hooks/use-organization';

export const ComplaintReportsPage: React.FC = (): React.ReactElement => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [reportType, setReportType] = useState<string>('summary');
  const [month, setMonth] = useState<string>(currentMonth);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dateBasis, setDateBasis] = useState<'SUBMITTED' | 'RESOLVED' | 'CLOSED'>('SUBMITTED');
  const [deptId, setDeptId] = useState<number | undefined>(undefined);
  const [handlerId, setHandlerId] = useState<number | undefined>(undefined);
  const [typeId, setTypeId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Queries
  const { data: types = [] } = useComplaintTypesQuery(true);
  const { data: deptOptions = [] } = useDepartmentOptionsQuery();
  const { data: empOptions = [] } = useEmployeeOptionsQuery();

  const { data, isLoading } = useComplaintReportsQuery({
    report_type: reportType,
    month: month || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    date_basis: dateBasis,
    department_id: deptId,
    handler_id: handlerId,
    complaint_type_id: typeId,
    priority: priority || undefined,
    status: status || undefined,
    group_by:
      reportType === 'by_type'
        ? 'type'
        : reportType === 'by_department'
        ? 'department'
        : reportType === 'handler_performance'
        ? 'handler'
        : undefined,
  });

  const exportCsv = () => {
    if (!data) return;
    const csvRows: string[][] = [];

    if (reportType === 'summary') {
      csvRows.push(['Metric', 'Value']);
      csvRows.push(['Total Received', String(data.totals?.received || 0)]);
      csvRows.push(['Total Closed', String(data.totals?.closed || 0)]);
      csvRows.push(['Avg Days to Resolve', String(data.totals?.avg_time_to_resolve_days || 0)]);
      csvRows.push(['Overdue Now', String(data.totals?.overdue_now || 0)]);
      csvRows.push(['Reopened', String(data.totals?.reopened || 0)]);
    } else if (data.breakdown && data.breakdown.length > 0) {
      csvRows.push(['Group / Entity', 'Received', 'Active', 'Closed', 'Overdue', 'Avg Days to Resolve']);
      data.breakdown.forEach((b) => {
        csvRows.push([
          b.name,
          String(b.received),
          String(b.active),
          String(b.closed),
          String(b.overdue),
          String(b.avg_days),
        ]);
      });
    } else if (data.complaints && data.complaints.length > 0) {
      csvRows.push(['Complaint No', 'Date', 'Type', 'Complainant', 'Department', 'Handler', 'Status', 'Priority', 'Target Date']);
      data.complaints.forEach((c) => {
        csvRows.push([
          c.complaint_no,
          c.complaint_date?.slice(0, 10) || '',
          c.type_name || '',
          c.complainant_name || '',
          c.department_name || '',
          c.handler_name || '',
          c.status,
          c.priority,
          c.target_date?.slice(0, 10) || '',
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `complaint_report_${reportType}_${month || 'custom'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'register', label: 'Register' },
    { id: 'by_type', label: 'By Type' },
    { id: 'by_department', label: 'By Department' },
    { id: 'handler_performance', label: 'Handler Performance' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'reopened', label: 'Reopened' },
    { id: 'closed_without_action', label: 'Closed Without Action' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/complaints?tab=manage"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Complaints
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Complaint Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analyze trends, handler performance, SLA compliance, and export complaint audit registers.
          </p>
        </div>

        <button
          onClick={exportCsv}
          disabled={isLoading || !data}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              reportType === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-600" /> Report Filters
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date Basis</label>
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as 'SUBMITTED' | 'RESOLVED' | 'CLOSED')}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <option value="SUBMITTED">Complaint Date</option>
              <option value="RESOLVED">Resolution Date</option>
              <option value="CLOSED">Closure Date</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Complaint Type</label>
            <select
              value={typeId || ''}
              onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {types.map((t: ComplaintTypeItem) => (
                <option key={t.type_id} value={t.type_id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
            <select
              value={deptId || ''}
              onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {deptOptions.map((d: any) => (
                <option key={d.dep_id || d.id} value={d.dep_id || d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Handler</label>
            <select
              value={handlerId || ''}
              onChange={(e) => setHandlerId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Handlers</option>
              {empOptions.map((emp: any) => (
                <option key={emp.emp_id || emp.id} value={emp.emp_id || emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-xs">Generating report data...</p>
        </div>
      ) : reportType === 'summary' ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Total Received</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data?.totals?.received || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-teal-600 font-bold uppercase text-[10px]">Total Closed</span>
              <p className="text-2xl font-bold text-teal-600 mt-1">{data?.totals?.closed || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-rose-600 font-bold uppercase text-[10px]">Overdue Now</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{data?.totals?.overdue_now || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-amber-600 font-bold uppercase text-[10px]">Reopened</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{data?.totals?.reopened || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-indigo-600 font-bold uppercase text-[10px]">Avg Days to Resolve</span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {data?.totals?.avg_time_to_resolve_days || 0} <span className="text-xs font-normal">days</span>
              </p>
            </div>
          </div>

          {/* Historical 6-Month Trend */}
          {data?.trend && data.trend.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> 6-Month Volume & Resolution Trend
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {data.trend.map((m, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-center ${
                      m.is_selected
                        ? 'bg-indigo-50/60 border-indigo-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-600">{m.label}</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">{m.received}</div>
                    <span className="text-[10px] text-slate-400 block">rcvd • {m.closed} closed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : data?.breakdown && data.breakdown.length > 0 ? (
        /* Breakdown Table for By Type / By Department / Handler Performance */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Group / Entity</th>
                  <th className="py-3 px-4 text-center">Total Received</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4 text-center">Closed</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Avg Days to Resolve</th>
                  <th className="py-3 px-4 text-right">Share of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.breakdown.map((row, idx) => {
                  const total = data.totals?.received || 1;
                  const pct = Math.round((row.received / total) * 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {row.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {row.received}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600 font-semibold">
                        {row.active}
                      </td>
                      <td className="py-3 px-4 text-center text-teal-600 font-semibold">
                        {row.closed}
                      </td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">
                        {row.overdue}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700">
                        {row.avg_days} days
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          {pct}%
                          <span
                            className="inline-block h-2 bg-indigo-500 rounded-full"
                            style={{ width: `${Math.max(pct, 5)}px` }}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : data?.complaints && data.complaints.length > 0 ? (
        /* Detailed Complaints Table (Register, Overdue, Reopened, Closed Without Action) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Complainant</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Handler</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.complaints.map((c) => (
                  <tr key={c.complaint_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {c.complaint_no}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.complaint_date?.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {c.type_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.complainant_name || 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.department_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.handler_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {c.priority}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.target_date?.slice(0, 10) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No data found for this report period and filters</p>
        </div>
      )}
    </div>
  );
};
