import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExportMenu } from '@/shared/ui/ExportMenu';
import { dmy } from '@/shared/utils/table-export';
import {
  BarChart3,
  ArrowLeft,
  Filter,
  FilterX,
  Loader2,
  TrendingUp,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Timer,
  SearchX,
} from 'lucide-react';
import { useComplaintReportsQuery } from '../hooks/use-complaints';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { useComplaintTypesQuery, ComplaintTypeItem } from '../hooks/use-complaint-settings';
import {
  useDepartmentOptionsQuery,
  useEmployeeOptionsQuery,
} from '@/features/organization/hooks/use-organization';
import { Badge, Field, PRIORITY_TONE, STATUS_TONE, StatCard, initials, inputCls } from '../components/complaint-ui';

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
  // Summary "Group by" (BFD 11 marker 7) and the complaints behind a breakdown row
  const [summaryGroup, setSummaryGroup] = useState<'type' | 'department' | 'handler'>('type');
  const [focus, setFocus] = useState<{ field: 'type_name' | 'department_name' | 'handler_name'; value: string } | null>(null);
  const navigate = useNavigate();

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
        : reportType === 'summary'
        ? summaryGroup
        : undefined,
  });

  /** Export (Excel, PDF or CSV) of the tab on screen with the filters applied; subjects never included (BFD 11). */
  const buildExport = () => {
    const tabLabel = tabs.find((t) => t.id === reportType)?.label || 'Report';
    const period = month || `${fromDate || '…'} to ${toDate || '…'}`;
    const base = { title: `Complaint Reports · ${tabLabel} · ${period}`, sheet: `Complaints ${tabLabel}`, endpoint: '/api/v1/complaints/export' };
    const groupHeader = reportType === 'by_department' ? 'Department' : reportType === 'handler_performance' ? 'Handler' : reportType === 'summary' ? summaryGroup[0].toUpperCase() + summaryGroup.slice(1) : 'Type';
    if ((reportType === 'summary' || data?.breakdown?.length) && data?.breakdown) {
      return {
        ...base,
        columns: [
          { header: groupHeader, key: 'name' },
          { header: 'Received', key: 'received' },
          { header: 'Active', key: 'active' },
          { header: 'Closed', key: 'closed' },
          { header: 'Overdue', key: 'overdue' },
          { header: 'Average days', key: 'avg_days' },
        ],
        rows: data.breakdown.map((b) => ({ ...b })),
      };
    }
    return {
      ...base,
      columns: [
        { header: 'Complaint No.', key: 'complaint_no' },
        { header: 'Date', key: 'date' },
        { header: 'Raised by', key: 'complainant_name' },
        { header: 'Department', key: 'department_name' },
        { header: 'Type', key: 'type_name' },
        { header: 'Priority', key: 'priority' },
        { header: 'Handler', key: 'handler_name' },
        { header: 'Status', key: 'status' },
        { header: 'Target', key: 'target' },
        { header: 'Outcome', key: 'outcome' },
        { header: 'Closure Type', key: 'closure_type' },
        { header: 'Times reopened', key: 'reopen_count' },
      ],
      rows: registerRows.map((c: any) => ({ ...c, date: dmy(c.complaint_date), target: dmy(c.target_date) })),
    };
  };

  // Quick picks: This quarter, Last quarter, This financial year (April to March)
  const quickPick = (kind: 'this_q' | 'last_q' | 'fy') => {
    const now = new Date();
    const y = now.getFullYear();
    const q = Math.floor(now.getMonth() / 3);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let from: Date;
    let to: Date;
    if (kind === 'this_q') {
      from = new Date(y, q * 3, 1);
      to = new Date(y, q * 3 + 3, 0);
    } else if (kind === 'last_q') {
      from = new Date(y, q * 3 - 3, 1);
      to = new Date(y, q * 3, 0);
    } else {
      const fyStart = now.getMonth() >= 3 ? y : y - 1;
      from = new Date(fyStart, 3, 1);
      to = new Date(fyStart + 1, 2, 31);
    }
    setMonth('');
    setFromDate(iso(from));
    setToDate(iso(to));
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

  const filtersChanged =
    month !== currentMonth || Boolean(fromDate || toDate || deptId || handlerId || typeId || priority || status) || dateBasis !== 'SUBMITTED';
  const resetFilters = () => {
    setFocus(null);
    setMonth(currentMonth);
    setFromDate('');
    setToDate('');
    setDateBasis('SUBMITTED');
    setDeptId(undefined);
    setHandlerId(undefined);
    setTypeId(undefined);
    setPriority('');
    setStatus('');
  };

  const trend = data?.trend ?? [];
  // A breakdown row lists the complaints behind it (BFD 11 marker 7)
  const registerRows = (data?.complaints ?? []).filter((c: any) => !focus || (c[focus.field] || '') === focus.value);
  const focusField = (): 'type_name' | 'department_name' | 'handler_name' => {
    const g = reportType === 'summary' ? summaryGroup : reportType === 'by_department' ? 'department' : reportType === 'handler_performance' ? 'handler' : 'type';
    return g === 'department' ? 'department_name' : g === 'handler' ? 'handler_name' : 'type_name';
  };
  const openGroup = (name: string) => {
    setFocus({ field: focusField(), value: name });
    setReportType('register');
  };
  const trendMax = Math.max(1, ...trend.map((m) => Math.max(m.received, m.closed)));
  const th = 'whitespace-nowrap px-5 py-3';
  const headRow = 'border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/complaints?tab=manage"
            className="mb-2 inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to complaints
          </Link>
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Reports & Analytics</h1>
              <p className="mt-0.5 text-sm text-slate-500">Trends, handler performance, SLA compliance and audit registers.</p>
            </div>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <ExportMenu disabled={isLoading || !data} build={buildExport} />
        </div>
      </div>

      {/* Report type */}
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Report type" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((tab) => {
            const on = reportType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setReportType(tab.id);
                  if (tab.id !== 'register') setFocus(null);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                  on ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Filter className="h-3.5 w-3.5" />
            </span>
            Report filters
          </div>
          <div className="ml-auto mr-2 hidden flex-wrap items-center gap-1.5 sm:flex">
            {(
              [
                ['this_q', 'This quarter'],
                ['last_q', 'Last quarter'],
                ['fy', 'This financial year'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => quickPick(k)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50">
                {l}
              </button>
            ))}
          </div>
          {filtersChanged && (
            <button type="button" onClick={resetFilters} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <FilterX className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Month">
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setFromDate('');
                setToDate('');
              }}
              className={inputCls}
            />
          </Field>

          <Field label="From date">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setMonth('');
              }}
              className={inputCls}
            />
          </Field>

          <Field label="To date">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setMonth('');
              }}
              className={inputCls}
            />
          </Field>

          <Field label="Date basis">
            <SearchableSelect
              value={dateBasis}
              onChange={(v) => v && setDateBasis(v as 'SUBMITTED' | 'RESOLVED' | 'CLOSED')}
              options={[
                { value: 'SUBMITTED', label: 'Complaint Date' },
                { value: 'RESOLVED', label: 'Resolution Date' },
                { value: 'CLOSED', label: 'Closure Date' },
              ]}
            />
          </Field>

          <Field label="Complaint type">
            <SearchableSelect
              placeholder="All Types"
              value={typeId ?? null}
              onChange={(v) => setTypeId(v ? Number(v) : undefined)}
              options={types.map((t: ComplaintTypeItem) => ({ value: t.type_id, label: t.name }))}
              clearable
            />
          </Field>

          <Field label="Department">
            <SearchableSelect
              placeholder="All Departments"
              value={deptId ?? null}
              onChange={(v) => setDeptId(v ? Number(v) : undefined)}
              options={deptOptions.map((d: any) => ({ value: d.dep_id || d.id, label: d.name }))}
              clearable
            />
          </Field>

          <Field label="Handler">
            <SearchableSelect
              placeholder="All Handlers"
              value={handlerId ?? null}
              onChange={(v) => setHandlerId(v ? Number(v) : undefined)}
              options={empOptions.map((emp: any) => ({ value: emp.emp_id || emp.id, label: emp.name }))}
              clearable
            />
          </Field>

          <Field label="Priority">
            <SearchableSelect
              placeholder="All Priorities"
              value={priority || null}
              onChange={(v) => setPriority(v ? String(v) : '')}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' },
              ]}
              clearable
            />
          </Field>

          <Field label="Status">
            <SearchableSelect
              placeholder="All Statuses"
              value={status || null}
              onChange={(v) => setStatus(v ? String(v) : '')}
              options={[
                { value: 'New', label: 'New' },
                { value: 'Open', label: 'Open' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Resolved', label: 'Resolved' },
                { value: 'Closed', label: 'Closed' },
              ]}
              clearable
            />
          </Field>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Generating report data...</p>
        </div>
      ) : reportType === 'summary' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 lg:gap-4">
            <StatCard label="Total received" value={data?.totals?.received || 0} icon={Inbox} tone="text-slate-900" tile="bg-slate-50 text-slate-600 ring-slate-100" bar="from-slate-400 to-slate-500" />
            <StatCard label="Total closed" value={data?.totals?.closed || 0} icon={CheckCircle2} tone="text-teal-600" tile="bg-teal-50 text-teal-600 ring-teal-100" bar="from-teal-400 to-emerald-400" />
            <StatCard label="Overdue now" value={data?.totals?.overdue_now || 0} icon={AlertTriangle} tone="text-rose-600" tile="bg-rose-50 text-rose-600 ring-rose-100" bar="from-rose-500 to-pink-500" />
            <StatCard label="Reopened" value={data?.totals?.reopened || 0} icon={RotateCcw} tone="text-amber-600" tile="bg-amber-50 text-amber-600 ring-amber-100" bar="from-amber-400 to-orange-400" />
            <StatCard label="Avg days to resolve" value={data?.totals?.avg_time_to_resolve_days || 0} unit="days" icon={Timer} tone="text-indigo-600" tile="bg-indigo-50 text-indigo-600 ring-indigo-100" bar="from-indigo-500 to-violet-500" />
          </div>

          {trend.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  6-month volume & resolution trend
                </h3>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Received
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-teal-400" /> Closed
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 sm:gap-4">
                {trend.map((m: any, i) => (
                  <button
                    type="button"
                    key={i}
                    title={`Open ${m.label}`}
                    onClick={() => {
                      // Clicking a bar opens that month (BFD 11 marker 6)
                      if (m.month) {
                        setMonth(m.month);
                        setFromDate('');
                        setToDate('');
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center rounded-xl px-1 pb-3 pt-3 transition hover:bg-slate-50 ${m.is_selected ? 'bg-indigo-50/70 ring-1 ring-indigo-200' : ''}`}
                  >
                    <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-2" title={`${m.label}: ${m.received} received, ${m.closed} closed`}>
                      <div className="flex h-full w-3.5 flex-col justify-end sm:w-6">
                        <span className="mb-1 text-center text-[11px] font-bold text-slate-700">{m.received}</span>
                        <div className="rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all" style={{ height: `${Math.max((m.received / trendMax) * 100, m.received > 0 ? 6 : 2)}%` }} />
                      </div>
                      <div className="flex h-full w-3.5 flex-col justify-end sm:w-6">
                        <span className="mb-1 text-center text-[11px] font-bold text-slate-500">{m.closed}</span>
                        <div className="rounded-t-md bg-gradient-to-t from-teal-500 to-teal-300 transition-all" style={{ height: `${Math.max((m.closed / trendMax) * 100, m.closed > 0 ? 6 : 2)}%` }} />
                      </div>
                    </div>
                    <span className={`mt-2 text-center text-[11px] font-semibold leading-tight sm:text-xs ${m.is_selected ? 'text-indigo-700' : 'text-slate-500'}`}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown by type, or by department or handler with "Group by" */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 pt-4">
              <h3 className="text-[15px] font-bold text-slate-900">By {summaryGroup === 'type' ? 'complaint type' : summaryGroup}</h3>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Group by
                <select value={summaryGroup} onChange={(e) => setSummaryGroup(e.target.value as any)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">
                  <option value="type">Complaint Type</option>
                  <option value="department">Department</option>
                  <option value="handler">Handler</option>
                </select>
              </label>
            </div>
            {(data?.breakdown ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No complaints match your filters</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="mt-2 w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50/95">
                    <tr className={headRow}>
                      <th className={th}>{summaryGroup === 'type' ? 'Type' : summaryGroup === 'department' ? 'Department' : 'Handler'}</th>
                      <th className={`${th} text-center`}>Received</th>
                      <th className={`${th} text-center`}>Closed</th>
                      <th className={`${th} text-center`}>Active</th>
                      <th className={`${th} text-center`}>Avg days</th>
                      <th className={`${th} text-center`}>Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.breakdown ?? []).map((row) => (
                      <tr key={row.name} onClick={() => openGroup(row.name)} className="cursor-pointer transition-colors hover:bg-blue-50/30" title="List the complaints behind it">
                        <td className="px-5 py-3 font-semibold text-slate-800">{row.name}</td>
                        <td className="px-5 py-3 text-center">{row.received}</td>
                        <td className="px-5 py-3 text-center">{row.closed}</td>
                        <td className="px-5 py-3 text-center">{row.active}</td>
                        <td className="px-5 py-3 text-center">{row.avg_days ? `${row.avg_days}` : '—'}</td>
                        <td className={`px-5 py-3 text-center ${row.overdue ? 'font-bold text-rose-600' : ''}`}>{row.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : data?.breakdown && data.breakdown.length > 0 ? (
        /* By Type / By Department / Handler Performance */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50/95">
                <tr className={headRow}>
                  <th className={th}>Group / Entity</th>
                  <th className={`${th} text-center`}>Received</th>
                  <th className={`${th} text-center`}>Active</th>
                  <th className={`${th} text-center`}>Closed</th>
                  <th className={`${th} text-center`}>Overdue</th>
                  <th className={`${th} text-center`}>Avg days</th>
                  <th className={th}>Share of total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.breakdown.map((row, idx) => {
                  const total = data.totals?.received || 1;
                  const pct = Math.round((row.received / total) * 100);
                  return (
                    <tr key={idx} onClick={() => openGroup(row.name)} title="List the complaints behind it" className="cursor-pointer transition-colors hover:bg-blue-50/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">{initials(row.name)}</span>
                          <span className="font-semibold text-slate-800">{row.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-900">{row.received}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex min-w-8 justify-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100">{row.active}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex min-w-8 justify-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100">{row.closed}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${row.overdue > 0 ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-slate-50 text-slate-400 ring-slate-100'}`}>{row.overdue}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{row.avg_days}d</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.max(pct, 3)}%` }} />
                          </div>
                          <span className="w-9 text-xs font-bold text-slate-700">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : registerRows.length > 0 ? (
        /* Register, Overdue, Reopened, Closed Without Action */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50/95">
                <tr className={headRow}>
                  <th className={th}>Complaint No</th>
                  <th className={th}>Date</th>
                  <th className={th}>Type</th>
                  <th className={th}>Complainant</th>
                  <th className={th}>Department</th>
                  <th className={th}>Handler</th>
                  <th className={th}>Priority</th>
                  <th className={th}>Status</th>
                  <th className={th}>Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registerRows.map((c: any) => (
                  <tr
                    key={c.complaint_id}
                    onClick={() => navigate(`/complaints?tab=manage&open=${c.complaint_id}`)}
                    className="cursor-pointer transition-colors hover:bg-blue-50/30"
                  >
                    <td className="px-5 py-3.5">
                      <span className="whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{c.complaint_no}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{c.complaint_date?.slice(0, 10)}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{c.type_name}</td>
                    <td className="px-5 py-3.5 text-slate-700">{c.complainant_name || 'Anonymous'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.department_name}</td>
                    <td className="px-5 py-3.5">
                      {c.handler_name ? <span className="text-slate-700">{c.handler_name}</span> : <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5">{c.priority && c.priority !== '—' ? <Badge label={c.priority} tone={PRIORITY_TONE[c.priority]} /> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <Badge label={c.status} tone={STATUS_TONE[c.status]} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{c.target_date?.slice(0, 10) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
            <b className="font-semibold text-slate-800">{registerRows.length}</b> {registerRows.length === 1 ? 'complaint' : 'complaints'}
            {focus && (
              <button type="button" onClick={() => setFocus(null)} className="ml-3 font-semibold text-indigo-600 hover:underline">
                Showing {focus.value} only · show all
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
            <SearchX className="h-7 w-7" />
          </span>
          <p className="text-base font-semibold text-slate-800">No complaints match your filters</p>
          {(filtersChanged || focus) && (
            <button type="button" onClick={resetFilters} className="mt-3 text-[13px] font-semibold text-indigo-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
