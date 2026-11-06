import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { PaidAs, PayrollDayItem, errorText, fieldErrors, useRemoveDayAdjustmentMutation, useSaveDayAdjustmentMutation } from '../hooks/use-payroll';
import { Banner, FieldError, Modal, PAID_AS_LABEL, btn, fmtDate, inputCls, money } from './payroll-ui';

const REASONS = ['Attendance correction after month lock', 'Approved work outside office', 'Management approval (paid absence)', 'Penalty', 'Other'];
const CODE_LABEL: Record<string, string> = { P: 'P – Present', HD: 'HD – Half Day', A: 'A – Absent (no check-in)', L: 'L – Paid leave', LWP: 'LWP – Unpaid leave', MP: 'MP – Missing punch', 'L+HD': 'Half-day leave + Half Day worked', 'L/A': 'Half-day leave, other half absent' };
const value = (p: PaidAs) => (p === 'FULL' ? 1 : p === 'HALF' ? 0.5 : 0);

/** Screen 6: Day Adjustment pop-up (BFD 8 Part 1). Attendance is never changed. */
export const DayAdjustmentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  day: PayrollDayItem | null;
  payrollEmployeeId: number;
  employeeLabel: string;
  basicSalary: number;
  locked: boolean;
}> = ({ open, onClose, day, payrollEmployeeId, employeeLabel, basicSalary, locked }) => {
  const save = useSaveDayAdjustmentMutation();
  const remove = useRemoveDayAdjustmentMutation();
  const [payAs, setPayAs] = useState<'FULL' | 'HALF' | 'UNPAID' | ''>('');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [removing, setRemoving] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayAs('');
    setReason(REASONS[0]);
    setNote('');
    setRemoving(false);
    setErrs({});
    setBanner(null);
  }, [open, day?.payroll_employee_day_id]);

  if (!day) return null;
  const rate = day.daily_rate;
  const delta = payAs ? (value(payAs) - value(day.paid_as)) * rate : 0;

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!removing) {
      if (!payAs) e.pay_this_day_as = 'Please fill this field.';
      else if (payAs === day.paid_as) e.pay_this_day_as = `This day is already paid as ${PAID_AS_LABEL[day.paid_as]}.`;
      if (!reason) e.reason = 'Please fill this field.';
    }
    if (note.trim().length < 10) e.note = 'Please write at least 10 characters.';
    if (Object.keys(e).length) return setErrs(e);
    setBanner(null);
    try {
      if (removing) await remove.mutateAsync({ peId: payrollEmployeeId, dayId: day.payroll_employee_day_id, reason: note.trim() });
      else await save.mutateAsync({ peId: payrollEmployeeId, dayId: day.payroll_employee_day_id, data: { pay_this_day_as: payAs, reason, note: note.trim() } });
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else setBanner(errorText(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Day Adjustment · ${new Date(`${day.attendance_date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}`}
      subtitle={employeeLabel}
      footer={
        locked ? (
          <button type="button" className={btn.secondary} onClick={onClose}>
            Close
          </button>
        ) : (
          <>
            {day.is_adjusted && !removing && (
              <button type="button" className={`${btn.secondary} mr-auto`} onClick={() => setRemoving(true)}>
                Remove adjustment
              </button>
            )}
            <button type="button" className={btn.secondary} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={removing ? btn.danger : btn.primary} disabled={save.isPending || remove.isPending} onClick={submit}>
              {removing ? 'Remove adjustment' : 'Save adjustment'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {locked && <Banner tone="warn">Payroll is locked. Ask the Admin to unlock.</Banner>}
        {banner && <Banner>{banner}</Banner>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Attendance status</p>
            <div className={`${inputCls} flex items-center justify-between bg-slate-50 text-slate-600`}>
              {CODE_LABEL[day.attendance_code] || day.attendance_code}
              <Lock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paid now as</p>
            <div className={`${inputCls} flex items-center bg-slate-50 text-slate-600`}>
              {PAID_AS_LABEL[day.paid_as]} · {money(day.calculated_amount)}
              {day.is_adjusted && day.original_paid_as ? <span className="ml-2 text-[11px] text-orange-600">(attendance: {PAID_AS_LABEL[day.original_paid_as]})</span> : null}
            </div>
          </div>
        </div>

        {!removing && !locked && (
          <>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Pay this day as<span className="text-rose-500">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(['FULL', 'HALF', 'UNPAID'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayAs(p)}
                    className={`rounded-xl border px-3 py-2 text-[12.5px] font-semibold ${payAs === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {PAID_AS_LABEL[p]} · {money(value(p) * rate)}
                  </button>
                ))}
              </div>
              <FieldError msg={errs.pay_this_day_as} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Reason<span className="text-rose-500">*</span>
              </p>
              <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <FieldError msg={errs.reason} />
            </div>
          </>
        )}

        {!locked && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {removing ? 'Reason for removing' : 'Note'}
              <span className="text-rose-500">*</span>
            </p>
            <textarea rows={3} maxLength={250} className={`${inputCls} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
            <FieldError msg={errs.note || errs.reason} />
          </div>
        )}

        {!removing && payAs && payAs !== day.paid_as && (
          <Banner tone="ok">
            Basic Salary {money(basicSalary)} → <b>{money(basicSalary + delta)}</b> ({delta >= 0 ? '+' : ''}
            {money(delta)}). PF and Total Salary are worked out again. Attendance is not changed.
          </Banner>
        )}
        {removing && <Banner tone="info">The day goes back to the attendance value ({fmtDate(day.attendance_date)}).</Banner>}
      </div>
    </Modal>
  );
};
