import React, { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Download, Hourglass, Loader2, Search, Wallet } from 'lucide-react';
import { useDepartmentOptionsQuery, useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useExpenseCategoriesQuery } from '../hooks/use-expense-settings';
import { ClaimsListFilter, errorText, exportClaimsList, useClaimsList } from '../hooks/use-expenses';
import { ClaimReviewModal } from '../components/ClaimReviewModal';
import { Banner, ClaimStatusBadge, FilterField, FlagChips, Pager, StatCard, btn, filterCls, fmtDate, inr, todayIST } from '../components/expense-ui';

const TAB_LABEL: Record<string, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', all: 'All' };

/** Screen 3: Expense Claims for Authorised Approvers, Accounts and the Admin (BFD 6). */
export const ExpenseClaimsPage: React.FC = () => {
  const [tab, setTab] = useState<string | undefined>(undefined);
  const [empId, setEmpId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [tab, empId, deptId, categoryId, type, from, to, debounced]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filter: ClaimsListFilter = {
    tab,
    emp_id: empId ? Number(empId) : undefined,
    department_id: deptId ? Number(deptId) : undefined,
    category_id: categoryId ? Number(categoryId) : undefined,
    expense_type: type || undefined,
    from_date: from || undefined,
    to_date: to || undefined,
    search: debounced || undefined,
    page,
  };
  const { data, isLoading, error, isFetching } = useClaimsList(filter);
  const { data: depts = [] } = useDepartmentOptionsQuery();
  const { data: emps = [] } = useEmployeeOptionsQuery();
  const { data: categories = [] } = useExpenseCategoriesQuery();
  const k = data?.counters;
  const activeTab = data?.tab || tab || 'pending';
  const showPending = (data?.tabs || []).includes('pending');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expense Claims</h1>
          <p className="text-[13px] text-slate-500">Review claims, approve or reject them, and see what is waiting.</p>
        </div>
        <button
          type="button"
          className={btn.secondary}
          disabled={exporting || !data?.total}
          onClick={async () => {
            setExporting(true);
            setExportErr(null);
            try {
              await exportClaimsList({ ...filter, tab: activeTab }, todayIST());
            } catch (e: any) {
              setExportErr(e?.message || 'Export failed.');
            } finally {
              setExporting(false);
            }
          }}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
        </button>
      </div>

      {toast && <Banner tone="ok">{toast}</Banner>}
      {exportErr && <Banner>{exportErr}</Banner>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showPending ? (
          <>
            <StatCard
              label="Waiting for decision"
              value={k?.waiting_count ?? 0}
              icon={Hourglass}
              tone="text-amber-600"
              tile="bg-amber-50 text-amber-600 ring-amber-100"
              bar="from-amber-400 to-orange-400"
              hint={inr(k?.waiting_amount)}
              onClick={() => setTab('pending')}
            />
            <StatCard
              label="Oldest waiting"
              value={k?.oldest_waiting_days ?? 0}
              unit="days"
              icon={CalendarClock}
              tone={(k?.oldest_waiting_days ?? 0) >= 7 ? 'text-rose-600' : 'text-slate-700'}
              tile="bg-rose-50 text-rose-600 ring-rose-100"
              bar="from-rose-400 to-pink-400"
            />
          </>
        ) : null}
        <StatCard
          label="Approved this month"
          value={inr(k?.approved_this_month)}
          icon={CheckCircle2}
          tone="text-emerald-600"
          tile="bg-emerald-50 text-emerald-600 ring-emerald-100"
          bar="from-emerald-400 to-teal-400"
          onClick={() => setTab('approved')}
        />
        <StatCard
          label="Approved, not paid"
          value={inr(k?.approved_unpaid_amount)}
          icon={Wallet}
          tone="text-indigo-600"
          tile="bg-indigo-50 text-indigo-600 ring-indigo-100"
          bar="from-indigo-400 to-blue-500"
          hint={`${k?.approved_unpaid_count ?? 0} claims`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 pt-3">
          {(data?.tabs || ['pending', 'approved', 'rejected', 'all']).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${activeTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {TAB_LABEL[t]}
              {t === 'pending' && k?.waiting_count ? <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-700">{k.waiting_count}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <FilterField label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${filterCls} w-60 pl-9`} placeholder="Claim No. or employee name" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </FilterField>
          <FilterField label="Employee">
            <select className={`${filterCls} w-44`} value={empId} onChange={(e) => setEmpId(e.target.value)}>
              <option value="">All</option>
              {(emps as any[]).map((e) => (
                <option key={e.emp_id ?? e.id} value={e.emp_id ?? e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Department">
            <select className={`${filterCls} w-40`} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">All</option>
              {(depts as any[]).map((d) => (
                <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Category">
            <select className={`${filterCls} w-44`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All</option>
              {categories.map((c: any) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Type">
            <select className={`${filterCls} w-40`} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              <option value="Office Expense">Office Expense</option>
              <option value="Personal Expense">Personal Expense</option>
            </select>
          </FilterField>
          <FilterField label="Expense Date From">
            <input type="date" className={`${filterCls} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
          </FilterField>
          <FilterField label="Expense Date To">
            <input type="date" className={`${filterCls} w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
          </FilterField>
          {isFetching && !isLoading && <Loader2 className="mb-2.5 h-4 w-4 animate-spin text-slate-400" />}
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4">
            <Banner>{errorText(error)}</Banner>
          </div>
        ) : !data?.rows.length ? (
          <p className="px-4 py-14 text-center text-[13px] text-slate-500">{activeTab === 'pending' ? 'No claims are waiting for you.' : 'No claims match these filters.'}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-[12.5px]">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Claim No.</th>
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Expense Date</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5">Flags</th>
                    <th className="px-3 py-2.5">{activeTab === 'pending' ? 'Submitted' : 'Status'}</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r) => (
                    <tr key={r.claim_id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => setViewId(r.claim_id)}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.claim_no}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">{r.employee_name}</p>
                        <p className="text-[11px] text-slate-400">{r.department_name || '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{fmtDate(r.expense_date)}</td>
                      <td className="px-3 py-3 text-slate-700">{r.category_name || '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{r.expense_type}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">{inr(r.amount)}</td>
                      <td className="px-3 py-3">
                        <FlagChips claim={r} />
                      </td>
                      <td className="px-3 py-3">
                        {activeTab === 'pending' ? (
                          <span className="text-slate-600">{fmtDate(r.submitted_at)}</span>
                        ) : (
                          <>
                            <ClaimStatusBadge status={r.status} />
                            {r.decided_by_name && <p className="mt-0.5 text-[11px] text-slate-400">by {r.decided_by_name}</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={btn.link}>{r.status === 'SUBMITTED' ? 'Review' : 'View'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
      </div>

      <ClaimReviewModal claimId={viewId} onClose={() => setViewId(null)} onMessage={setToast} onOpenClaim={setViewId} />
    </div>
  );
};
