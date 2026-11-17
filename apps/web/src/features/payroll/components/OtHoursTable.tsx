import React, { useMemo, useState } from 'react';
import { Check, Loader2, Minus, X } from 'lucide-react';
import { PayrollOtItem, errorText, fieldErrors, useBulkApproveOtMutation, useDecideOtMutation } from '../hooks/use-payroll';
import { Banner, FieldError, Modal, btn, fmtDate, inputCls, money } from './payroll-ui';

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  REDUCED: 'bg-blue-50 text-blue-700 ring-blue-100',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-100',
};
const DAY_TYPE: Record<string, string> = { WORKING_DAY: 'Working day', WEEKLY_OFF: 'Weekly Off', HOLIDAY: 'Holiday' };

/**
 * BFD Section 9: OT entries proposed from Attendance. The approver approves, reduces
 * with a comment, or rejects with a comment. Amounts are hidden for Reporting Managers.
 */
export const OtHoursTable: React.FC<{ entries: PayrollOtItem[]; showAmounts: boolean; canDecideAll?: boolean; locked?: boolean }> = ({
  entries,
  showAmounts,
  canDecideAll,
  locked,
}) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [popup, setPopup] = useState<{ entry: PayrollOtItem; status: 'REDUCED' | 'REJECTED' } | null>(null);
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
  const decide = useDecideOtMutation();
  const bulk = useBulkApproveOtMutation();

  const can = (e: PayrollOtItem) => !locked && (e.can_decide ?? canDecideAll ?? false);
  const rows = useMemo(() => entries.filter((e) => filter === 'ALL' || e.status === 'PENDING'), [entries, filter]);
  const pendingSelectable = rows.filter((e) => e.status === 'PENDING' && can(e));

  const approve = async (e: PayrollOtItem) => {
    setMsg(null);
    try {
      await decide.mutateAsync({ id: e.payroll_ot_entry_id, status: 'APPROVED' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorText(err) });
    }
  };

  const submitPopup = async () => {
    if (!popup) return;
    const e: Record<string, string> = {};
    if (popup.status === 'REDUCED' && !(Number(hours) > 0 && Number(hours) < popup.entry.proposed_hours)) {
      e.approved_hours = `Enter hours more than 0 and less than ${popup.entry.proposed_hours}.`;
    }
    if (comment.trim().length < 10) e.comment = 'Please write at least 10 characters.';
    if (Object.keys(e).length) return setErrs(e);
    try {
      await decide.mutateAsync({ id: popup.entry.payroll_ot_entry_id, status: popup.status, approved_hours: popup.status === 'REDUCED' ? Number(hours) : undefined, comment: comment.trim() });
      setPopup(null);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else setErrs({ form: errorText(err) });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="inline-flex rounded-xl border border-slate-200 p-0.5">
          {(['ALL', 'PENDING'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {f === 'ALL' ? `All (${entries.length})` : `Pending (${entries.filter((x) => x.status === 'PENDING').length})`}
            </button>
          ))}
        </div>
        {pendingSelectable.length > 0 && (
          <button
            type="button"
            className={btn.success}
            disabled={!selected.length || bulk.isPending}
            onClick={async () => {
              setMsg(null);
              try {
                const r = await bulk.mutateAsync(selected);
                setSelected([]);
                setMsg({ tone: r.skipped.length ? 'error' : 'ok', text: `${r.approved} approved${r.skipped.length ? `; ${r.skipped.length} skipped` : ''}.` });
              } catch (err) {
                setMsg({ tone: 'error', text: errorText(err) });
              }
            }}
          >
            {bulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve Selected ({selected.length})
          </button>
        )}
      </div>
      {msg && (
        <div className="px-4 pb-3">
          <Banner tone={msg.tone === 'ok' ? 'ok' : 'error'}>{msg.text}</Banner>
        </div>
      )}
      {!rows.length ? (
        <p className="px-4 py-12 text-center text-[13px] text-slate-500">No OT entries{filter === 'PENDING' ? ' are pending' : ' for this month'}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[12.5px]">
            <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all pending"
                    checked={pendingSelectable.length > 0 && pendingSelectable.every((e) => selected.includes(e.payroll_ot_entry_id))}
                    onChange={(ev) => setSelected(ev.target.checked ? pendingSelectable.map((e) => e.payroll_ot_entry_id) : [])}
                    disabled={!pendingSelectable.length}
                  />
                </th>
                <th className="px-3 py-2.5">Employee</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Day type</th>
                <th className="px-3 py-2.5 text-right">Worked</th>
                <th className="px-3 py-2.5 text-right">Proposed</th>
                <th className="px-3 py-2.5 text-right">Approved</th>
                {showAmounts && <th className="px-3 py-2.5 text-right">OT Amount</th>}
                <th className="px-3 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => (
                <tr key={e.payroll_ot_entry_id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    {e.status === 'PENDING' && can(e) && (
                      <input
                        type="checkbox"
                        checked={selected.includes(e.payroll_ot_entry_id)}
                        onChange={() => setSelected((s) => (s.includes(e.payroll_ot_entry_id) ? s.filter((x) => x !== e.payroll_ot_entry_id) : [...s, e.payroll_ot_entry_id]))}
                        aria-label="Select"
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">{e.employee_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {e.employee_code}
                      {e.ot_paid_as === 'COMP_OFF' ? ' · Comp-off' : ''}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{fmtDate(e.attendance_date)}</td>
                  <td className="px-3 py-3 text-slate-600">{DAY_TYPE[e.day_type] || e.day_type}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{e.worked_hours} h</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-800">{e.proposed_hours} h</td>
                  <td className="px-3 py-3 text-right text-slate-800">{e.status === 'PENDING' ? '—' : `${e.approved_hours} h`}</td>
                  {showAmounts && <td className="px-3 py-3 text-right text-slate-800">{e.ot_paid_as === 'COMP_OFF' ? '—' : money(e.ot_amount)}</td>}
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_TONE[e.status]}`}>{e.status[0] + e.status.slice(1).toLowerCase()}</span>
                    {e.status !== 'PENDING' && (
                      <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-slate-400" title={e.comment || ''}>
                        {e.approver_name}
                        {e.comment ? ` · ${e.comment}` : ''}
                      </p>
                    )}
                    {e.status === 'PENDING' && e.approver && <p className="mt-0.5 text-[11px] text-slate-400">Approver: {e.approver}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.status === 'PENDING' && can(e) ? (
                      <div className="flex justify-end gap-1">
                        <button type="button" title="Approve" className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100" onClick={() => approve(e)}>
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Reduce"
                          className="rounded-lg bg-blue-50 p-1.5 text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                          onClick={() => {
                            setPopup({ entry: e, status: 'REDUCED' });
                            setHours('');
                            setComment('');
                            setErrs({});
                          }}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Reject"
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100"
                          onClick={() => {
                            setPopup({ entry: e, status: 'REJECTED' });
                            setComment('');
                            setErrs({});
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!popup}
        onClose={() => setPopup(null)}
        title={popup?.status === 'REDUCED' ? 'Reduce OT hours' : 'Reject OT entry'}
        subtitle={popup ? `${popup.entry.employee_name} · ${fmtDate(popup.entry.attendance_date)} · proposed ${popup.entry.proposed_hours} h` : undefined}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPopup(null)}>
              Cancel
            </button>
            <button type="button" className={popup?.status === 'REJECTED' ? btn.danger : btn.primary} disabled={decide.isPending} onClick={submitPopup}>
              {popup?.status === 'REDUCED' ? 'Reduce' : 'Reject'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {errs.form && <Banner>{errs.form}</Banner>}
          {popup?.status === 'REDUCED' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Approved hours<span className="text-rose-500">*</span>
              </label>
              <input type="number" step="0.25" min="0.25" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} />
              <FieldError msg={errs.approved_hours} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Comment<span className="text-rose-500">*</span>
            </label>
            <textarea rows={3} maxLength={250} className={`${inputCls} h-auto py-2`} value={comment} onChange={(e) => setComment(e.target.value)} />
            <FieldError msg={errs.comment} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
