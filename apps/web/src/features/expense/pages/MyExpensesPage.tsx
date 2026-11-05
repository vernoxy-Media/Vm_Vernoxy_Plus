import React, { useEffect, useState } from 'react';
import { BadgeIndianRupee, Clock, FileEdit, Loader2, Paperclip, Plus, Receipt, Wallet } from 'lucide-react';
import { useExpenseCategoriesQuery } from '../hooks/use-expense-settings';
import { MyClaimsFilter, errorText, useMyClaims } from '../hooks/use-expenses';
import { ClaimReviewModal } from '../components/ClaimReviewModal';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { Banner, ClaimStatusBadge, FilterField, FlagChips, Pager, StatCard, btn, filterCls, fmtDate, inr, todayIST } from '../components/expense-ui';

/** Screen 1: My Expenses (BFD 3). */
export const MyExpensesPage: React.FC = () => {
  const [mode, setMode] = useState<'month' | 'range'>('month');
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [formId, setFormId] = useState<number | null | undefined>(undefined); // undefined = closed, null = new
  const [viewId, setViewId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter: MyClaimsFilter = {
    ...(mode === 'month' ? { month } : from && to ? { from_date: from, to_date: to } : { month }),
    status: status || undefined,
    category_id: categoryId ? Number(categoryId) : undefined,
    expense_type: type || undefined,
    page,
  };
  const { data, isLoading, error, isFetching } = useMyClaims(filter);
  const { data: categories = [] } = useExpenseCategoriesQuery();

  useEffect(() => setPage(1), [mode, month, from, to, status, categoryId, type]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const rangeError = mode === 'range' && from && to && to < from ? 'The To date cannot be before the From date.' : null;
  const k = data?.counters;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Expenses</h1>
          <p className="text-[13px] text-slate-500">Claim money you spent for work and track it until it is paid back.</p>
        </div>
        <button type="button" className={btn.primary} onClick={() => setFormId(null)}>
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {toast && <Banner tone="ok">{toast}</Banner>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Drafts" value={k?.drafts ?? 0} icon={FileEdit} tone="text-slate-700" tile="bg-slate-50 text-slate-600 ring-slate-100" bar="from-slate-300 to-slate-400" hint="Not yet submitted" />
        <StatCard
          label="Waiting for approval"
          value={inr(k?.waiting_amount)}
          icon={Clock}
          tone="text-amber-600"
          tile="bg-amber-50 text-amber-600 ring-amber-100"
          bar="from-amber-400 to-orange-400"
          hint={`${k?.waiting_count ?? 0} claim${k?.waiting_count === 1 ? '' : 's'}`}
        />
        <StatCard label="Approved, not paid" value={inr(k?.approved_unpaid_amount)} icon={Wallet} tone="text-emerald-600" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-400" />
        <StatCard label="Reimbursed this year" value={inr(k?.reimbursed_this_year)} icon={BadgeIndianRupee} tone="text-indigo-600" tile="bg-indigo-50 text-indigo-600 ring-indigo-100" bar="from-indigo-400 to-blue-500" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <FilterField label="Period">
            <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 p-0.5">
              {(['month', 'range'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {m === 'month' ? 'Month' : 'Date range'}
                </button>
              ))}
            </div>
          </FilterField>
          {mode === 'month' ? (
            <FilterField label="Month">
              <input type="month" className={`${filterCls} w-44`} value={month} max={todayIST().slice(0, 7)} onChange={(e) => setMonth(e.target.value || todayIST().slice(0, 7))} />
            </FilterField>
          ) : (
            <>
              <FilterField label="Expense Date From">
                <input type="date" className={`${filterCls} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
              </FilterField>
              <FilterField label="Expense Date To">
                <input type="date" className={`${filterCls} w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
              </FilterField>
            </>
          )}
          <FilterField label="Status">
            <select className={`${filterCls} w-40`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REIMBURSED">Reimbursed</option>
            </select>
          </FilterField>
          <FilterField label="Category">
            <select className={`${filterCls} w-48`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
          {isFetching && !isLoading && <Loader2 className="mb-2.5 h-4 w-4 animate-spin text-slate-400" />}
        </div>
        {rangeError && (
          <div className="px-4 pt-3">
            <Banner>{rangeError}</Banner>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4">
            <Banner>{errorText(error)}</Banner>
          </div>
        ) : !data?.rows.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Receipt className="h-9 w-9 text-slate-300" />
            {data?.has_any_claim ? (
              <>
                <p className="text-[13px] text-slate-500">No expenses match your filters.</p>
                <button
                  type="button"
                  className={btn.link}
                  onClick={() => {
                    setMode('month');
                    setMonth(todayIST().slice(0, 7));
                    setFrom('');
                    setTo('');
                    setStatus('');
                    setCategoryId('');
                    setType('');
                  }}
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-slate-700">You have not added any expenses yet.</p>
                <button type="button" className={btn.primary} onClick={() => setFormId(null)}>
                  <Plus className="h-4 w-4" /> Add Expense
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[12.5px]">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Claim No.</th>
                    <th className="px-3 py-2.5">Expense Date</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5">Flags</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r) => (
                    <tr key={r.claim_id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => setViewId(r.claim_id)}>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {r.claim_no || <span className="font-normal italic text-slate-400">Not submitted</span>}
                        {r.receipts > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-normal text-slate-400">
                            <Paperclip className="h-3 w-3" />
                            {r.receipts}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{fmtDate(r.expense_date)}</td>
                      <td className="px-3 py-3 text-slate-700">{r.category_name || '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{r.expense_type || '—'}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">{r.amount != null ? inr(r.amount) : '—'}</td>
                      <td className="px-3 py-3">
                        <FlagChips claim={r} />
                      </td>
                      <td className="px-3 py-3">
                        <ClaimStatusBadge status={r.status} />
                        {r.status === 'REJECTED' && r.rejection_reason && <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-rose-500">{r.rejection_reason}</p>}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {r.actions.includes('EDIT') ? (
                          <button type="button" className={btn.link} onClick={() => setFormId(r.claim_id)}>
                            Edit
                          </button>
                        ) : r.actions.includes('WITHDRAW') ? (
                          <button type="button" className={btn.link} onClick={() => setViewId(r.claim_id)}>
                            Withdraw
                          </button>
                        ) : r.actions.includes('COPY') ? (
                          <button type="button" className={btn.link} onClick={() => setViewId(r.claim_id)}>
                            Copy to new claim
                          </button>
                        ) : (
                          <button type="button" className={btn.link} onClick={() => setViewId(r.claim_id)}>
                            View
                          </button>
                        )}
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

      <ExpenseFormModal
        open={formId !== undefined}
        claimId={formId ?? null}
        onClose={() => setFormId(undefined)}
        onDone={(m) => {
          setFormId(undefined);
          setToast(m);
        }}
      />
      <ClaimReviewModal
        claimId={viewId}
        onClose={() => setViewId(null)}
        onMessage={setToast}
        onOpenClaim={setViewId}
        onEdit={(id) => {
          setViewId(null);
          setFormId(id);
        }}
      />
    </div>
  );
};
