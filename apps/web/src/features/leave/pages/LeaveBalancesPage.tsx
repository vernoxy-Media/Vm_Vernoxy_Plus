import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Users, CheckCircle2, CalendarClock, TriangleAlert, Layers } from 'lucide-react';
import { KpiStat } from '@/shared/ui/dashboard/DashboardShell';
import { useAllLeaveBalancesQuery, useLeaveGeneralSettingsQuery, useRunYearEndMutation } from '../hooks/use-leave';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { AdjustBalanceModal, BulkCreditModal } from '../components/AdjustBalanceModals';
import { LeaveLedgerModal } from '../components/LeaveLedgerModal';
import { Btn, ConfirmModal, errMessage, fmtDays } from '../components/leave-ui';

const FIELD =
  'h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

/** A balance as a coloured chip: red when nothing is left, amber when one day or less is. */
const chipClass = (available: number) =>
  available <= 0
    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    : available <= 1
      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100';

const initialsOf = (name?: string) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** Balances screen (BFD Section 10, Part 1). Admin only. */
export const LeaveBalancesPage: React.FC = () => {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [depId, setDepId] = useState<number | undefined>();
  const { data, isLoading, error } = useAllLeaveBalancesQuery({ year, search: search.trim() || undefined, department_id: depId });
  const { data: departments = [] } = useDepartmentOptionsQuery();
  const { data: settings } = useLeaveGeneralSettingsQuery();
  const yearEndMut = useRunYearEndMutation();

  const [adjust, setAdjust] = useState<{ empId?: number; typeId?: number } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [ledger, setLedger] = useState<{ empId: number; name: string; typeId?: number } | null>(null);
  const [confirmYearEnd, setConfirmYearEnd] = useState(false);
  const [toast, setToast] = useState('');
  const [yearEndError, setYearEndError] = useState('');

  const currentYear = data?.leave_year;
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 4000);
  };
  const yearOptions = currentYear ? [currentYear, currentYear - 1, currentYear - 2] : [];

  const trackedTypes = useMemo(() => (data?.types || []).filter((t) => t.balance_tracked), [data]);
  const kpi = useMemo(() => {
    const emps = data?.employees || [];
    const out = emps.filter((e) => e.balances.some((x) => (x.available ?? 0) <= 0 && ((x.credited ?? 0) > 0 || (x.opening_balance ?? 0) > 0))).length;
    return { employees: emps.length, out };
  }, [data]);

  return (
    <div className="w-full space-y-5">
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Balances</h1>
            <p className="mt-1 max-w-xl text-xs text-slate-500">
              Available balance of every employee{data ? ` · Leave year ${data.leave_year_label}` : ''}. Click a balance to open the leave ledger.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings?.year_end_processing === 'MANUAL' && (
              <Btn onClick={() => setConfirmYearEnd(true)}>
                <CalendarClock className="h-4 w-4 text-slate-500" /> Run year end
              </Btn>
            )}
            <Btn onClick={() => setBulkOpen(true)}>
              <Users className="h-4 w-4 text-slate-500" /> Bulk credit
            </Btn>
            <Btn variant="primary" onClick={() => setAdjust({})} className="h-10 px-4">
              <SlidersHorizontal className="h-4 w-4" /> Adjust balance
            </Btn>
          </div>
        </div>
      </section>

      {toast && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-3">
          <KpiStat label="Employees" value={kpi.employees} hint="Matching the filters" icon={Users} tone="blue" />
          <KpiStat label="Out of a balance" value={kpi.out} hint="At least one leave type has none left" icon={TriangleAlert} tone={kpi.out ? 'rose' : 'emerald'} />
          <KpiStat label="Leave types with a balance" value={trackedTypes.length} hint="Shown as columns" icon={Layers} tone="purple" className="col-span-2 lg:col-span-1" />
        </div>
      )}

      <section className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <select value={year ?? currentYear ?? ''} onChange={(e) => setYear(Number(e.target.value))} aria-label="Leave year" className={`${FIELD} cursor-pointer`}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                Year: {y}
              </option>
            ))}
          </select>
          <div className="relative min-w-[12rem] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee" aria-label="Search employee" className={`${FIELD} w-full pl-8 font-medium sm:w-56`} />
          </div>
          <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} aria-label="Department" className={`${FIELD} cursor-pointer`}>
            <option value="">Department: All</option>
            {(departments as any[]).map((d) => (
              <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="ml-auto hidden items-center gap-3 text-[11px] text-slate-500 lg:flex">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Available</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> 1 day or less</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> None left</span>
          </span>
        </div>
        {error && <p role="alert" className="text-xs text-rose-600">{errMessage(error)}</p>}

        {isLoading ? (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading balances">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : !data?.employees.length ? (
          <div className="py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Users className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-700">No employees match your filters</p>
            <p className="mt-1 text-xs text-slate-500">Try another department or search word.</p>
          </div>
        ) : (
          <>
            {/* Phones: one card per employee */}
            <ul className="space-y-2.5 md:hidden">
              {data.employees.map((e) => (
                <li key={e.emp_id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {initialsOf(e.employee_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{e.employee_name}</p>
                      <p className="truncate text-[11px] text-slate-500">{e.emp_code} · {e.department_name || '—'} · {e.policy_name || 'No policy'}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {trackedTypes.map((t) => {
                      const b = e.balances.find((x) => x.leave_type_id === t.leave_type_id);
                      return (
                        <button
                          key={t.leave_type_id}
                          type="button"
                          disabled={!b}
                          onClick={() => setLedger({ empId: e.emp_id, name: e.employee_name, typeId: t.leave_type_id })}
                          className={`cursor-pointer rounded-xl px-2 py-1.5 text-center transition disabled:cursor-default ${b ? chipClass(b.available ?? 0) : 'bg-slate-50 text-slate-300'}`}
                        >
                          <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">{t.code}</span>
                          <span className="block text-sm font-extrabold tabular-nums">{b ? fmtDays(b.available) : '—'}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablets and computers: a table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Policy</th>
                    {trackedTypes.map((t) => (
                      <th key={t.leave_type_id} className="px-3 py-2.5 text-center" title={t.name}>{t.code}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.map((e) => (
                    <tr key={e.emp_id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                            {initialsOf(e.employee_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{e.employee_name}</div>
                            <div className="truncate text-[11px] text-slate-400">{e.emp_code} · {e.department_name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{e.policy_name || '—'}</td>
                      {trackedTypes.map((t) => {
                        const b = e.balances.find((x) => x.leave_type_id === t.leave_type_id);
                        return (
                          <td key={t.leave_type_id} className="px-3 py-2.5 text-center">
                            {b ? (
                              <button
                                type="button"
                                title={`Opening ${fmtDays(b.opening_balance)} · Credited ${fmtDays(b.credited)} · Taken ${fmtDays(b.taken)} · Booked ${fmtDays(b.booked)}`}
                                onClick={() => setLedger({ empId: e.emp_id, name: e.employee_name, typeId: t.leave_type_id })}
                                className={`inline-flex min-w-[3rem] cursor-pointer justify-center rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums transition hover:brightness-95 ${chipClass(b.available ?? 0)}`}
                              >
                                {fmtDays(b.available)}
                              </button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <AdjustBalanceModal open={Boolean(adjust)} onClose={() => setAdjust(null)} onDone={flash} presetEmpId={adjust?.empId} presetTypeId={adjust?.typeId} />
      <BulkCreditModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={flash} />
      {ledger && (
        <LeaveLedgerModal
          open
          onClose={() => setLedger(null)}
          empId={ledger.empId}
          employeeName={ledger.name}
          defaultYear={year ?? currentYear}
          yearOptions={yearOptions.map((y) => ({ value: y, label: String(y) }))}
          typeOptions={(data?.types || []).map((t) => ({ value: t.leave_type_id, label: t.name }))}
        />
      )}
      <ConfirmModal
        open={confirmYearEnd}
        title={`Close leave year ${currentYear ? currentYear - 1 : ''}?`}
        message={
          <>
            Unused days up to each leave type's carry forward limit move to the new year as "Carried forward"; the rest are recorded as "Lapsed".
            This cannot be undone.
            {yearEndError && <p className="mt-2 text-rose-600">{yearEndError}</p>}
          </>
        }
        confirmLabel="Run year end"
        variant="danger"
        loading={yearEndMut.isPending}
        onCancel={() => {
          setConfirmYearEnd(false);
          setYearEndError('');
        }}
        onConfirm={async () => {
          if (!currentYear) return;
          try {
            const r = await yearEndMut.mutateAsync(currentYear - 1);
            setConfirmYearEnd(false);
            flash(`Year end done: ${r.processed} balances processed.`);
          } catch (e: any) {
            setYearEndError(errMessage(e));
          }
        }}
      />
    </div>
  );
};
