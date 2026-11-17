import React, { useMemo, useState } from 'react';
import { Ban, BarChart3, Calendar, Clock, FileText, IndianRupee, PieChart, RotateCcw, Users } from 'lucide-react';
import { LicenseReportKey, LicenseReportParams, useLicenseReportQuery } from '../hooks/use-license-reports';
import { useLicenseAccessQuery } from '../hooks/use-licenses';
import { useLicenseCategoriesQuery, useLicenseVendorsQuery } from '../hooks/use-license-settings';
import { useDepartmentOptionsQuery, useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { ExportMenu } from '@/shared/ui/ExportMenu';
import { ExportColumn, dmy } from '@/shared/utils/table-export';
import { SoftwareDetailsModal } from './SoftwareDetailsModal';

/**
 * BFD 12 License Reports. Every tab has its filters, an Export (Excel, PDF, CSV) that matches the
 * screen, and rows that open Software Details. The server applies who sees what (Part 3).
 */
type Tab = 'register' | 'renewals' | 'assignments' | 'seats' | 'cost' | 'expired' | 'history';

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType; report: LicenseReportKey }> = [
  { key: 'register', label: 'Register', icon: FileText, report: 'register' },
  { key: 'renewals', label: 'Upcoming Renewals', icon: Calendar, report: 'renewals' },
  { key: 'assignments', label: 'Assignments by Employee', icon: Users, report: 'assignments' },
  { key: 'seats', label: 'Seat Use', icon: PieChart, report: 'seat-utilization' },
  { key: 'cost', label: 'Cost', icon: IndianRupee, report: 'cost-breakdown' },
  { key: 'expired', label: 'Expired & Discontinued', icon: Ban, report: 'expired-discontinued' },
  { key: 'history', label: 'History Log', icon: Clock, report: 'activity-logs' },
];

const inr = (v: any) => (v === null || v === undefined || v === '' ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const year = new Date().getFullYear();
const fieldCls = 'h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-[12.5px] text-slate-700';
const labelCls = 'mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500';

interface Col extends ExportColumn {
  render?: (r: any) => React.ReactNode;
  align?: 'right';
}

export const LicenseReportsView: React.FC = () => {
  const { data: access } = useLicenseAccessQuery();
  const scope = access?.report_scope ?? 'all';
  const teamOnly = scope === 'team';
  const tabs = teamOnly ? TABS.filter((t) => t.key === 'assignments') : TABS;
  const [tab, setTab] = useState<Tab>('register');
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;
  const report = TABS.find((t) => t.key === active)!.report;

  // Filters
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [empId, setEmpId] = useState('');
  const [status, setStatus] = useState('');
  const [windowDays, setWindowDays] = useState('90');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [event, setEvent] = useState('');
  const [personId, setPersonId] = useState('');
  const [includePast, setIncludePast] = useState(true);
  const [groupBy, setGroupBy] = useState<'category' | 'vendor' | 'department'>('category');
  const [month, setMonth] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: categories = [] } = useLicenseCategoriesQuery();
  const { data: vendors = [] } = useLicenseVendorsQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();

  const costFrom = from || `${year}-01-01`;
  const costTo = to || `${year}-12-31`;
  const params: LicenseReportParams = {
    category_id: categoryId ? Number(categoryId) : undefined,
    vendor_id: vendorId ? Number(vendorId) : undefined,
    owner_id: ownerId ? Number(ownerId) : undefined,
    department_id: departmentId ? Number(departmentId) : undefined,
    emp_id: empId ? Number(empId) : undefined,
    status: status || undefined,
    days: active === 'renewals' && windowDays !== 'range' ? Number(windowDays) : undefined,
    from: active === 'cost' ? costFrom : active === 'renewals' && windowDays !== 'range' ? undefined : from || undefined,
    to: active === 'cost' ? costTo : active === 'renewals' && windowDays !== 'range' ? undefined : to || undefined,
    event: active === 'history' ? event || undefined : undefined,
    performed_by: active === 'history' && personId ? Number(personId) : undefined,
    include_past: active === 'assignments' ? includePast : undefined,
    limit: active === 'history' ? 2000 : undefined,
  };
  const { data, isLoading, error } = useLicenseReportQuery<any>(report, params, Boolean(access));

  const clearFilters = () => {
    setCategoryId('');
    setVendorId('');
    setOwnerId('');
    setDepartmentId('');
    setEmpId('');
    setStatus('');
    setWindowDays('90');
    setFrom('');
    setTo('');
    setEvent('');
    setPersonId('');
    setIncludePast(true);
    setMonth(null);
  };
  const filtersOn = Boolean(categoryId || vendorId || ownerId || departmentId || empId || status || from || to || event || personId || month || windowDays !== '90' || !includePast);

  const showCost = !teamOnly;
  const canOpen = (r: any) => !teamOnly && Boolean(r?.software_id);

  // ---------------------------------------------------------------------------
  // Columns and rows of the tab on screen
  // ---------------------------------------------------------------------------
  const view = useMemo(() => {
    const list: any[] = Array.isArray(data) ? data : [];
    const seatText = (used: number, total: number | null) => (total === null || total === undefined ? `${used} / No limit` : `${used} / ${total}`);
    switch (active) {
      case 'register':
        return {
          title: 'Software Register',
          cols: [
            { header: 'Software ID', key: 'software_code' },
            { header: 'Software', key: 'software_name' },
            { header: 'Vendor', key: 'vendor' },
            { header: 'Category', key: 'category' },
            { header: 'License Type', key: 'license_type' },
            { header: 'Seats Used / Total', key: 'seats' },
            { header: 'Start', key: 'start' },
            { header: 'Expiry', key: 'expiry' },
            ...(showCost ? [{ header: 'Yearly cost', key: 'yearly_cost', money: true, align: 'right' as const, render: (r: any) => inr(r.yearly_cost) }] : []),
            { header: 'Owner', key: 'owner' },
            { header: 'Status', key: 'status' },
          ] as Col[],
          rows: list.map((r) => ({
            ...r,
            seats: seatText(r.assigned_seats, r.total_seats),
            start: dmy(r.start_date),
            expiry: r.expiry_date ? dmy(r.expiry_date) : 'No expiry',
          })),
        };
      case 'renewals': {
        const rows = list
          .filter((r) => !month || r.month === month)
          .map((r) => ({ ...r, seats: seatText(r.seats_used, r.total_seats), expiry: dmy(r.expiry_date), auto: r.auto_renews ? 'Yes' : 'No' }));
        return {
          title: 'Upcoming Renewals',
          cols: [
            { header: 'Expiry Date', key: 'expiry' },
            { header: 'Software ID', key: 'software_code' },
            { header: 'Software', key: 'software_name' },
            { header: 'Owner', key: 'owner' },
            { header: 'Seats Used / Total', key: 'seats' },
            ...(showCost ? [{ header: 'Cost of term', key: 'current_term_cost', money: true, align: 'right' as const, render: (r: any) => inr(r.current_term_cost) }] : []),
            { header: 'Auto-renews', key: 'auto' },
            { header: 'Status', key: 'status' },
          ] as Col[],
          rows,
        };
      }
      case 'assignments':
        return {
          title: 'Assignments by Employee',
          cols: [
            { header: 'Employee', key: 'employee_name' },
            { header: 'Department', key: 'department' },
            { header: 'Software', key: 'software_name' },
            { header: 'Login', key: 'login_account_id' },
            { header: 'Assigned From', key: 'from' },
            { header: 'Revoked on', key: 'revoked' },
            { header: 'Reason', key: 'revoke_reason' },
          ] as Col[],
          rows: list.map((r) => ({ ...r, from: dmy(r.assigned_from), revoked: r.revoked_on ? dmy(r.revoked_on) : r.status === 'Active' ? 'In use' : '' })),
        };
      case 'seats':
        return {
          title: 'Seat Use',
          cols: [
            { header: 'Software', key: 'software_name' },
            { header: 'Total Seats', key: 'total_seats', align: 'right' as const },
            { header: 'Used', key: 'assigned_seats', align: 'right' as const },
            { header: 'Free', key: 'unused_seats', align: 'right' as const },
            { header: 'Free 90+ days', key: 'unused_seats_long', align: 'right' as const },
            ...(showCost ? [{ header: 'Cost of free seats per year', key: 'estimated_wastage_cost', money: true, align: 'right' as const, render: (r: any) => inr(r.estimated_wastage_cost) }] : []),
          ] as Col[],
          rows: list,
        };
      case 'cost': {
        const groups: any[] = (data as any)?.[`by_${groupBy}`] || [];
        return {
          title: `Cost by ${groupBy} (${dmy(costFrom)} to ${dmy(costTo)})`,
          cols: [
            { header: groupBy[0].toUpperCase() + groupBy.slice(1), key: groupBy },
            { header: 'Software', key: 'software_count', align: 'right' as const },
            { header: 'Yearly cost in the period', key: 'total_cost', money: true, align: 'right' as const, render: (r: any) => inr(r.total_cost) },
            { header: 'Share %', key: 'percentage_of_total', align: 'right' as const, render: (r: any) => `${r.percentage_of_total}%` },
          ] as Col[],
          rows: groups,
        };
      }
      case 'expired':
        return {
          title: 'Expired & Discontinued',
          cols: [
            { header: 'Software', key: 'name' },
            { header: 'Expiry Date', key: 'expiry' },
            { header: 'Discontinued on', key: 'ended' },
            { header: 'Reason', key: 'reason' },
            { header: 'Seats at the end', key: 'seats_at_end', align: 'right' as const },
            { header: 'Replaced by', key: 'replaced' },
          ] as Col[],
          rows: list.map((r) => ({
            ...r,
            name: `${r.software_code} ${r.software_name}`,
            expiry: dmy(r.software_license_terms?.[0]?.expiry_date),
            ended: r.status === 'Discontinued' ? dmy(r.discontinue_date) : '—',
            reason: r.software_license_discontinue_reasons?.label || r.software_license_discontinue_reasons?.name || (r.status === 'Expired' ? 'Not renewed' : ''),
            replaced: r.software_licenses ? `${r.software_licenses.software_code} ${r.software_licenses.software_name}` : '',
          })),
        };
      default:
        return {
          title: 'History Log',
          cols: [
            { header: 'Date and time', key: 'when' },
            { header: 'Software', key: 'software' },
            { header: 'Event', key: 'event_label' },
            { header: 'Details', key: 'summary' },
            { header: 'By', key: 'performed_by_name' },
          ] as Col[],
          rows: list.map((r) => ({
            ...r,
            when: new Date(r.performed_at).toLocaleString('en-GB'),
            event_label: String(r.event).replace(/_/g, ' ').toLowerCase().replace(/^./, (c: string) => c.toUpperCase()),
          })),
        };
    }
  }, [active, data, month, groupBy, showCost, costFrom, costTo]);

  // Totals and trend (Upcoming Renewals, BFD 12 markers 5 and 6)
  const renewals: any[] = active === 'renewals' && Array.isArray(data) ? data : [];
  const trend = useMemo(() => {
    const byMonth = new Map<string, number>();
    renewals.forEach((r) => byMonth.set(r.month, (byMonth.get(r.month) || 0) + Number(r.current_term_cost || 0)));
    return Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [renewals]);
  const maxTrend = Math.max(1, ...trend.map(([, v]) => v));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const events = active === 'history' && Array.isArray(data) ? Array.from(new Set((data as any[]).map((r) => r.event))).sort() : [];

  return (
    <div className="space-y-5">
      {/* Report tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setMonth(null);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition ${
                on ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {active === 'renewals' && (
          <div>
            <label className={labelCls}>Renewals due</label>
            <select className={`${fieldCls} w-40`} value={windowDays} onChange={(e) => { setWindowDays(e.target.value); setMonth(null); }}>
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90">Next 90 days</option>
              <option value="range">Date range</option>
            </select>
          </div>
        )}
        {(active === 'cost' || active === 'history' || active === 'assignments' || (active === 'renewals' && windowDays === 'range')) && (
          <>
            <div>
              <label className={labelCls}>{active === 'cost' ? 'Period from' : 'From'}</label>
              <input type="date" className={`${fieldCls} w-40`} value={active === 'cost' ? costFrom : from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To</label>
              <input type="date" className={`${fieldCls} w-40`} value={active === 'cost' ? costTo : to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}
        {!teamOnly && active !== 'assignments' && active !== 'history' && (
          <>
            <div>
              <label className={labelCls}>Category</label>
              <select className={`${fieldCls} w-44`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All</option>
                {categories.map((c: any) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vendor</label>
              <select className={`${fieldCls} w-40`} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">All</option>
                {vendors.map((v: any) => (
                  <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>
                ))}
              </select>
            </div>
            {scope === 'all' && (
              <div>
                <label className={labelCls}>Software Owner</label>
                <select className={`${fieldCls} w-44`} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">All</option>
                  {employees.map((emp: any) => (
                    <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        {(active === 'register' || active === 'renewals' || active === 'expired') && (
          <div>
            <label className={labelCls}>Status</label>
            <select className={`${fieldCls} w-40`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{active === 'expired' ? 'Expired & Discontinued' : 'All except Discontinued'}</option>
              {active === 'expired' ? (
                <>
                  <option value="Expired">Expired</option>
                  <option value="Discontinued">Discontinued</option>
                </>
              ) : (
                <>
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                  <option value="Trial">Trial</option>
                  {active === 'register' && <option value="All">All, with Discontinued</option>}
                </>
              )}
            </select>
          </div>
        )}
        {active === 'assignments' && (
          <>
            <div>
              <label className={labelCls}>Department</label>
              <select className={`${fieldCls} w-44`} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All</option>
                {departments.map((d: any) => (
                  <option key={d.dep_id} value={d.dep_id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Employee</label>
              <select className={`${fieldCls} w-48`} value={empId} onChange={(e) => setEmpId(e.target.value)}>
                <option value="">All</option>
                {employees.map((emp: any) => (
                  <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <label className="flex h-9 items-center gap-2 text-[12.5px] text-slate-700">
              <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Include past seats
            </label>
          </>
        )}
        {active === 'cost' && (
          <div>
            <label className={labelCls}>Group by</label>
            <select className={`${fieldCls} w-36`} value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
              <option value="category">Category</option>
              <option value="vendor">Vendor</option>
              <option value="department">Department</option>
            </select>
          </div>
        )}
        {active === 'history' && (
          <>
            <div>
              <label className={labelCls}>Event</label>
              <select className={`${fieldCls} w-44`} value={event} onChange={(e) => setEvent(e.target.value)}>
                <option value="">All events</option>
                {events.map((ev) => (
                  <option key={ev} value={ev}>{ev.replace(/_/g, ' ').toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Person</label>
              <select className={`${fieldCls} w-44`} value={personId} onChange={(e) => setPersonId(e.target.value)}>
                <option value="">Anyone</option>
                {employees.map((emp: any) => (
                  <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {filtersOn && (
          <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
        <div className="ml-auto">
          <ExportMenu
            disabled={!view.rows.length}
            build={() => ({
              title: view.title,
              sheet: view.title,
              columns: view.cols.map(({ header, key, money }) => ({ header, key, money })),
              rows: view.rows,
            })}
          />
        </div>
      </div>

      {/* Upcoming Renewals: totals and trend */}
      {active === 'renewals' && renewals.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="grid gap-3">
            <Stat label={`Renewals in the window`} value={String(renewals.length)} />
            {showCost && <Stat label="Cost of these renewals" value={inr(renewals.reduce((a, r) => a + Number(r.current_term_cost || 0), 0))} />}
            <Stat label="Free seats in these software" value={`${renewals.reduce((a, r) => a + Number(r.free_seats || 0), 0)} seats`} />
          </div>
          {showCost && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                  Renewal cost by month
                </h4>
                {month && (
                  <button type="button" onClick={() => setMonth(null)} className="text-[12px] font-semibold text-blue-600 hover:underline">
                    Show all months
                  </button>
                )}
              </div>
              <div className="flex h-40 items-end gap-3">
                {trend.map(([m, v]) => (
                  <button
                    key={m}
                    type="button"
                    title={`${m}: ${inr(v)} - click to list the software`}
                    onClick={() => setMonth(month === m ? null : m)}
                    className="group flex flex-1 flex-col items-center justify-end gap-1"
                  >
                    <span className="text-[10.5px] font-semibold text-slate-500">{inr(v)}</span>
                    <span
                      className={`w-full max-w-16 rounded-t-lg transition ${
                        month === m ? 'bg-indigo-600' : m === thisMonth ? 'bg-blue-500' : 'bg-blue-200 group-hover:bg-blue-300'
                      }`}
                      style={{ height: `${Math.max(6, (v / maxTrend) * 110)}px` }}
                    />
                    <span className="text-[11px] text-slate-500">{new Date(`${m}-01`).toLocaleString('en-GB', { month: 'short', year: '2-digit' })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost: totals */}
      {active === 'cost' && data && !Array.isArray(data) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Yearly cost in the period" value={inr((data as any).total_spend)} />
          <Stat label="One-time purchases in the period" value={inr((data as any).one_time_total)} />
          <Stat label="Software with cost in the period" value={String((data as any).total_active_software)} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-12 text-center text-xs text-slate-400">Loading report…</p>
        ) : error ? (
          <p className="p-12 text-center text-xs text-red-600">{(error as any)?.detail || (error as any)?.message || 'Could not load the report.'}</p>
        ) : view.rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[13px] font-semibold text-slate-700">No software matches your filters</p>
            {filtersOn && (
              <button type="button" onClick={clearFilters} className="mt-2 text-[12.5px] font-semibold text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {view.cols.map((c) => (
                    <th key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.rows.map((r: any, i: number) => (
                  <tr
                    key={r.log_id || r.assignment_id || r.software_id || r[view.cols[0].key] || i}
                    onClick={() => canOpen(r) && setOpenId(r.software_id)}
                    className={canOpen(r) ? 'cursor-pointer hover:bg-blue-50/40' : ''}
                  >
                    {view.cols.map((c) => (
                      <td key={c.key} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right font-mono' : ''}`}>
                        {c.render ? c.render(r) : r[c.key] === null || r[c.key] === undefined || r[c.key] === '' ? '—' : String(r[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost: software behind the totals */}
      {active === 'cost' && data && !Array.isArray(data) && (data as any).by_software?.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Software</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3 text-right">Yearly cost</th>
                <th className="px-4 py-3 text-right">In the period</th>
                <th className="px-4 py-3 text-right">One-time purchases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data as any).by_software.map((s: any) => (
                <tr key={s.software_id} onClick={() => setOpenId(s.software_id)} className="cursor-pointer hover:bg-blue-50/40">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{s.software_name}</td>
                  <td className="px-4 py-2.5">{s.category}</td>
                  <td className="px-4 py-2.5">{s.vendor}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(s.yearly_cost)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(s.period_cost)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{s.one_time ? inr(s.one_time) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
            Each term's cost × 12 ÷ the months of its Billing Cycle (Monthly ×12, Quarterly ×4, Yearly ×1); Multi-year ÷ its years. A term that crosses the period edge is split by days. One-time purchases are not in the yearly cost.
          </p>
        </div>
      )}

      {openId && <SoftwareDetailsModal isOpen softwareId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xl font-extrabold text-slate-900">{value}</div>
    <div className="mt-0.5 text-[12px] text-slate-500">{label}</div>
  </div>
);
