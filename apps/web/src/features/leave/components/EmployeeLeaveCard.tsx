import React, { useEffect, useState } from 'react';
import { Calendar, History, SlidersHorizontal } from 'lucide-react';
import {
  useAssignEmployeePolicyMutation,
  useEmployeeLeaveSummaryQuery,
  useLeavePoliciesQuery,
  useSetOpeningBalanceMutation,
} from '../hooks/use-leave';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { BalanceCardView } from '../pages/MyLeavePage';
import { AdjustBalanceModal } from './AdjustBalanceModals';
import { LeaveLedgerModal } from './LeaveLedgerModal';
import { Btn, FieldError, Modal, errMessage, fmtDate, fmtDays } from './leave-ui';

/** Employee Profile > Pay & Policies > Leave (Leave Policy, Opening Balance, balances). */
export const EmployeeLeaveCard: React.FC<{ empId: number; employeeName: string; joiningDate?: string; isAdmin: boolean }> = ({
  empId,
  employeeName,
  joiningDate,
  isAdmin,
}) => {
  const { data: summary, isLoading } = useEmployeeLeaveSummaryQuery(empId);
  const { data: policies = [] } = useLeavePoliciesQuery();
  const assignMut = useAssignEmployeePolicyMutation();
  const openingMut = useSetOpeningBalanceMutation();
  const [changing, setChanging] = useState(false);
  const [policyId, setPolicyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [opening, setOpening] = useState<{ typeId: number; name: string; value: string; note: string; error: string } | null>(null);

  useEffect(() => {
    setPolicyId(summary?.policy_id ?? null);
  }, [summary?.policy_id]);

  const flash = (ok: boolean, text: string) => {
    setMessage({ ok, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-5 md:col-span-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Leave</h4>
            <p className="text-2xs text-slate-400">
              Leave Policy, Opening Balance (pro-rata from the Joining Date{joiningDate ? ` ${fmtDate(joiningDate.slice(0, 10))}` : ''}) and balances
              {summary ? ` · Leave year ${summary.leave_year_label}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setLedgerOpen(true)}>
            <History className="w-3.5 h-3.5" /> Leave Ledger
          </Btn>
          {isAdmin && (
            <>
              <Btn onClick={() => setAdjustOpen(true)} disabled={!summary?.policy_id}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Balance
              </Btn>
              {!changing ? (
                <Btn onClick={() => setChanging(true)}>Change Leave Policy</Btn>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-[200px]">
                    <SearchableSelect
                      placeholder="Select Leave Policy"
                      value={policyId}
                      onChange={(v) => setPolicyId(v ? Number(v) : null)}
                      options={policies.filter((p) => p.status === 'ACTIVE').map((p) => ({ value: p.policy_id, label: p.name }))}
                    />
                  </div>
                  <Btn
                    variant="primary"
                    disabled={!policyId}
                    loading={assignMut.isPending}
                    onClick={async () => {
                      if (!policyId) return;
                      try {
                        await assignMut.mutateAsync({ empId, policyId });
                        setChanging(false);
                        flash(true, 'Leave Policy changed. Current balances are kept; the new rules apply from the next credit date.');
                      } catch (e: any) {
                        flash(false, errMessage(e));
                      }
                    }}
                  >
                    Save
                  </Btn>
                  <Btn onClick={() => setChanging(false)}>Cancel</Btn>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs border ${message.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
        <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Leave Policy</span>
        <p className={`text-base font-bold mt-1 ${summary?.policy_name ? 'text-slate-900' : 'text-amber-700'}`}>
          {isLoading ? '…' : summary?.policy_name || 'Not assigned — required before activation'}
        </p>
      </div>

      {summary?.policy_id && (
        <div>
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Balances</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {summary.balances.map((b) => (
              <div key={b.leave_type_id} className="space-y-1">
                <BalanceCardView b={b} />
                {b.balance_tracked && (
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                    <span>Opening {fmtDays(b.opening_balance ?? 0)}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="font-semibold text-blue-600 hover:underline cursor-pointer"
                        onClick={() =>
                          setOpening({ typeId: b.leave_type_id, name: b.leave_type_name, value: String(b.opening_balance ?? 0), note: '', error: '' })
                        }
                      >
                        Adjust
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} presetEmpId={empId} onDone={(m) => flash(true, m)} />
      {ledgerOpen && (
        <LeaveLedgerModal
          open
          onClose={() => setLedgerOpen(false)}
          empId={empId}
          employeeName={employeeName}
          defaultYear={summary?.leave_year}
          yearOptions={summary ? [summary.leave_year, summary.leave_year - 1].map((y) => ({ value: y, label: String(y) })) : []}
          typeOptions={(summary?.balances || []).map((b) => ({ value: b.leave_type_id, label: b.leave_type_name }))}
        />
      )}

      <Modal
        open={Boolean(opening)}
        onClose={() => setOpening(null)}
        width="max-w-md"
        title={`Opening Balance · ${opening?.name || ''}`}
        subtitle="The same entry is saved in the Leave Ledger and the Employee Profile History."
        footer={
          <>
            <Btn onClick={() => setOpening(null)}>Cancel</Btn>
            <Btn
              variant="primary"
              loading={openingMut.isPending}
              onClick={async () => {
                if (!opening) return;
                const v = Number(opening.value);
                if (!(v >= 0 && v <= 365) || Math.abs(v * 2 - Math.round(v * 2)) > 1e-9) {
                  setOpening({ ...opening, error: 'The Opening Balance must be 0 to 365, in steps of 0.5.' });
                  return;
                }
                const len = opening.note.trim().length;
                if (len < 10 || len > 500) {
                  setOpening({ ...opening, error: 'Please write a note of 10 to 500 characters.' });
                  return;
                }
                try {
                  await openingMut.mutateAsync({ emp_id: empId, leave_type_id: opening.typeId, opening_balance: v, note: opening.note.trim() });
                  setOpening(null);
                  flash(true, 'Opening Balance saved. The employee has been told.');
                } catch (e: any) {
                  setOpening({ ...opening, error: errMessage(e) });
                }
              }}
            >
              Save
            </Btn>
          </>
        }
      >
        {opening && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Opening Balance (days) <span className="text-rose-500">*</span></label>
              <input type="number" min={0} max={365} step={0.5} value={opening.value} onChange={(e) => setOpening({ ...opening, value: e.target.value, error: '' })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Note <span className="text-rose-500">*</span> <span className="font-normal text-slate-400">10 to 500 characters</span>
              </label>
              <textarea rows={3} maxLength={500} value={opening.note} onChange={(e) => setOpening({ ...opening, note: e.target.value, error: '' })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
            </div>
            <FieldError message={opening.error} />
          </div>
        )}
      </Modal>
    </div>
  );
};
