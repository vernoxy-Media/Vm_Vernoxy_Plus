import React, { useState } from 'react';
import { Search, SlidersHorizontal, Users, CheckCircle2, CalendarClock } from 'lucide-react';
import { useAllLeaveBalancesQuery, useLeaveGeneralSettingsQuery, useRunYearEndMutation } from '../hooks/use-leave';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { AdjustBalanceModal, BulkCreditModal } from '../components/AdjustBalanceModals';
import { LeaveLedgerModal } from '../components/LeaveLedgerModal';
import { Btn, ConfirmModal, errMessage, fmtDays } from '../components/leave-ui';

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

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Balances</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Available Balance of every employee{data ? ` · Leave year ${data.leave_year_label}` : ''}. Click a balance to open the Leave Ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings?.year_end_processing === 'MANUAL' && (
            <Btn onClick={() => setConfirmYearEnd(true)}>
              <CalendarClock className="w-4 h-4 text-slate-500" /> Run year end
            </Btn>
          )}
          <Btn onClick={() => setBulkOpen(true)}>
            <Users className="w-4 h-4 text-slate-500" /> Bulk credit
          </Btn>
          <Btn variant="primary" onClick={() => setAdjust({})}>
            <SlidersHorizontal className="w-4 h-4" /> Adjust Balance
          </Btn>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={year ?? currentYear ?? ''} onChange={(e) => setYear(Number(e.target.value))} className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                Year: {y}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee" className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-52" />
          </div>
          <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
            <option value="">Department: All</option>
            {(departments as any[]).map((d) => (
              <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-rose-600">{errMessage(error)}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Policy</th>
                {(data?.types || []).filter((t) => t.balance_tracked).map((t) => (
                  <th key={t.leave_type_id} className="py-2.5 px-3 text-right">{t.code}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={10} className="py-10 text-center text-slate-400">Loading…</td></tr>
              ) : !data?.employees.length ? (
                <tr><td colSpan={10} className="py-10 text-center text-slate-500">No employees match your filters.</td></tr>
              ) : (
                data.employees.map((e) => (
                  <tr key={e.emp_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{e.employee_name}</div>
                      <div className="text-[11px] text-slate-400">{e.emp_code} · {e.department_name || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{e.policy_name || '—'}</td>
                    {data.types.filter((t) => t.balance_tracked).map((t) => {
                      const b = e.balances.find((x) => x.leave_type_id === t.leave_type_id);
                      return (
                        <td key={t.leave_type_id} className="py-2.5 px-3 text-right">
                          {b ? (
                            <button
                              type="button"
                              title={`Opening ${fmtDays(b.opening_balance)} · Credited ${fmtDays(b.credited)} · Taken ${fmtDays(b.taken)} · Booked ${fmtDays(b.booked)}`}
                              onClick={() => setLedger({ empId: e.emp_id, name: e.employee_name, typeId: t.leave_type_id })}
                              className="font-bold text-blue-700 hover:underline cursor-pointer"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
