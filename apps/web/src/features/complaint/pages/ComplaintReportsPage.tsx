import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ArrowLeft,
  Download,
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

  const filtersChanged =
    month !== currentMonth || Boolean(fromDate || toDate || deptId || handlerId || typeId || priority || status) || dateBasis !== 'SUBMITTED';
  const resetFilters = () => {
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

        <button
          type="button"
          onClick={exportCsv}
          disabled={isLoading || !data}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
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
                onClick={() => setReportType(tab.id)}
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
                {trend.map((m, i) => (
                  <div key={i} className={`flex flex-col items-center rounded-xl px-1 pb-3 pt-3 transition ${m.is_selected ? 'bg-indigo-50/70 ring-1 ring-indigo-200' : ''}`}>
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
                  </div>
                ))}
              </div>
            </div>
          )}
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
                    <tr key={idx} className="transition-colors hover:bg-blue-50/30">
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
      ) : data?.complaints && data.complaints.length > 0 ? (
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
                {data.complaints.map((c) => (
                  <tr key={c.complaint_id} className="transition-colors hover:bg-blue-50/30">
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
            <b className="font-semibold text-slate-800">{data.complaints.length}</b> {data.complaints.length === 1 ? 'complaint' : 'complaints'}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
            <SearchX className="h-7 w-7" />
          </span>
          <p className="text-base font-semibold text-slate-800">No data for this period and filters</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Try a different month or date range, or reset the filters.</p>
          {filtersChanged && (
            <button type="button" onClick={resetFilters} className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <FilterX className="h-4 w-4" /> Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
