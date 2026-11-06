import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PayrollAdjustmentItem, PayrollDayItem, errorText, useEmployeeSalarySheetQuery, useRemoveAdjustmentMutation, useSalarySlipQuery } from '../hooks/use-payroll';
import { DayAdjustmentModal } from '../components/DayAdjustmentModal';
import { AddAdjustmentModal } from '../components/AddAdjustmentModal';
import { SalarySlipModal } from '../components/SalarySlipModal';
import { KindChip } from './PayrollRegisterPage';
import { Banner, FieldError, Modal, RunStatusBadge, btn, fmtDate, fmtStamp, inputCls, money, num } from '../components/payroll-ui';

type Tab = 'summary' | 'day_wise' | 'history';

const DAY_TONE: Record<string, string> = {
  FULL: 'border-emerald-200 bg-emerald-50/60',
  HALF: 'border-amber-200 bg-amber-50/70',
  UNPAID: 'border-rose-200 bg-rose-50/60',
  NOT_APPLICABLE: 'border-slate-200 bg-slate-50 text-slate-400',
};

/** Screens 4 and 5: Employee Salary Sheet (BFD Section 7). */
export const EmployeeSalarySheetPage: React.FC = () => {
  const p = useParams();
  const year = Number(p.year);
  const month = Number(p.month);
  const empId = Number(p.empId);
  const navigate = useNavigate();
  const { data, isLoading, error } = useEmployeeSalarySheetQuery(year, month, empId);
  const [tab, setTab] = useState<Tab>('summary');
  const [day, setDay] = useState<PayrollDayItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<PayrollAdjustmentItem | null>(null);
  const slip = useSalarySlipQuery(year, month, empId, slipOpen);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link to={`/admin/payroll/${year}/${month}`} className={btn.link}>
          ← Payroll Register
        </Link>
        <Banner>{errorText(error)}</Banner>
      </div>
    );
  }

  const { run, employee: e, days, adjustments, history } = data;
  const isDraft = run.status === 'DRAFT';
  const label = `${e.employee_name} · ${e.employee_code} · Payroll ${run.month_label} (${run.status[0] + run.status.slice(1).toLowerCase()})`;
  const additions = adjustments.filter((a) => a.is_active && a.type === 'ADDITION');
  const deductions = adjustments.filter((a) => a.is_active && a.type === 'DEDUCTION');
  const holidays = days.filter((d) => d.day_type === 'HOLIDAY').length;
  const weeklyOffs = days.filter((d) => d.day_type === 'WEEKLY_OFF').length;
  const adjustedDays = days.filter((d) => d.is_adjusted).length;
  const otRateLine = e.ot_hours > 0 ? `OT Amount = ${num(e.ot_hours)} h × ${money(e.ot_rate)}` : 'OT Amount';
  const pfLine = e.pf_applicable
    ? `PF = ${num(e.pf_wage)} × ${e.pf_wage && e.employee_pf ? Math.round((e.employee_pf / e.pf_wage) * 100) : 0}%${e.pf_wage < e.basic_salary ? ' (wage limit applied)' : ''}`
    : 'PF (not applicable)';

  const go = (id: number | null) => id && navigate(`/admin/payroll/${year}/${month}/employee/${id}`);
  const first = days[0] ? new Date(`${days[0].attendance_date}T00:00:00`).getDay() : 0;
  const lead = (first + 6) % 7; // Monday first

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/admin/payroll/${year}/${month}`} className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
            <ChevronLeft className="h-3.5 w-3.5" /> Payroll / {run.month_label}
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {e.employee_name} · {e.employee_code}
            </h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {[e.role_name, e.shift_name, `PF ${e.pf_applicable ? 'Yes' : 'No'}`, `OT ${e.ot_eligible ? `Yes${e.ot_label ? ` (${e.ot_label})` : ''}` : 'No'}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btn.secondary} onClick={() => setSlipOpen(true)}>
            <FileText className="h-4 w-4" /> Salary Slip
          </button>
          <button type="button" className={btn.secondary} disabled={!data.previous_emp_id} onClick={() => go(data.previous_emp_id)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button type="button" className={btn.secondary} disabled={!data.next_emp_id} onClick={() => go(data.next_emp_id)}>
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {e.issues.filter((i) => i.level !== 'INFO').map((i, idx) => (
        <Banner key={idx} tone={i.level === 'ERROR' ? 'error' : 'warn'}>
          {i.message}
        </Banner>
      ))}

      <div className="flex gap-1.5 border-b border-slate-200">
        {(
          [
            ['summary', 'Summary'],
            ['day_wise', 'Day-wise'],
            ['history', 'History'],
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[14px] font-bold text-slate-900">Days in the month</h2>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['Calendar days', days.length],
                  ['Weekly Offs', weeklyOffs],
                  ['Holidays', holidays],
                  ['Total Working Days', e.total_working_days, 'bg-blue-50'],
                  ['Present', e.present_days],
                  ['Paid Leave', e.paid_leave_days],
                  ['Half Day', e.half_days],
                  ['Unpaid Leave', e.unpaid_leave_days],
                  ['Absent', e.absent_days, '', adjustedDays ? `${adjustedDays} changed by adj.` : ''],
                  ['Full Days', e.full_days, 'bg-emerald-50'],
                  ['Half Days', e.half_days, 'bg-amber-50'],
                  ['LOP Days', e.lop_days, 'bg-rose-50'],
                  ...(e.not_employed_days ? [['Not employed', e.not_employed_days]] : []),
                  ...(e.missing_punch_days ? [['Missing Punch', e.missing_punch_days]] : []),
                ].map(([k, v, bg, note]: any) => (
                  <div key={k} className={`rounded-xl px-2.5 py-2 ${bg || 'bg-slate-50'}`}>
                    <p className="text-[10.5px] text-slate-500">{k}</p>
                    <p className="text-[16px] font-bold text-slate-900">{num(v)}</p>
                    {note && <p className="text-[10px] text-orange-600">{note}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[14px] font-bold text-slate-900">Calculation</h2>
              <ul className="divide-y divide-slate-100 text-[12.5px]">
                <CalcRow label="Monthly Salary" value={money(e.monthly_salary)} />
                <CalcRow label={`Daily Rate = ${num(e.monthly_salary)} ÷ ${num(e.total_working_days)}`} value={money(e.daily_rate)} />
                <CalcRow label={`Basic Salary = ${num(e.full_days)} × ${num(e.daily_rate)} + ${num(e.half_days)} × ${num(e.daily_rate)} × 0.5`} value={money(e.basic_salary)} />
                <CalcRow label={otRateLine} value={money(e.ot_amount)} />
                {additions.map((a) => (
                  <CalcRow key={a.payroll_adjustment_id} label={`Additions: ${a.category_label}`} value={money(a.amount)} />
                ))}
                <CalcRow label={pfLine} value={`− ${money(e.employee_pf)}`} />
                {deductions.map((a) => (
                  <CalcRow key={a.payroll_adjustment_id} label={`Deductions: ${a.category_label}`} value={`− ${money(a.amount)}`} />
                ))}
                <li className="flex justify-between pt-3 text-[15px] font-extrabold text-slate-900">
                  <span>Total Salary</span>
                  <span>{money(e.total_salary, 0)}</span>
                </li>
              </ul>
              <p className="mt-2 text-[11.5px] text-slate-400">Employer PF (not deducted): {money(e.employer_pf)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-[14px] font-bold text-slate-900">Adjustments</h2>
              {isDraft && (
                <button type="button" className={btn.primary} onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> Add adjustment
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12.5px]">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Kind</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Detail</th>
                    <th className="px-3 py-2.5 text-right">Effect</th>
                    <th className="px-3 py-2.5">By</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustments.map((a) => (
                    <tr key={a.payroll_adjustment_id} className={a.is_active ? '' : 'opacity-50'}>
                      <td className="px-4 py-2.5">
                        <KindChip type={a.type} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{a.related_date ? fmtDate(a.related_date) : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {a.type === 'DAY_ADJUSTMENT' ? `${a.old_paid_as} → ${a.new_paid_as} · ${a.reason}${a.note ? ` · ${a.note}` : ''}` : `${a.category_label} · ${a.reason}`}
                        {a.reference_number ? ` · ${a.reference_number}` : ''}
                        {a.attachment_url && (
                          <a href={a.attachment_url} target="_blank" rel="noreferrer" className={`${btn.link} ml-1`}>
                            File
                          </a>
                        )}
                        {!a.is_active && <p className="text-[11px] text-rose-500">Removed: {a.removed_reason}</p>}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${a.effect < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {a.effect > 0 ? '+' : ''}
                        {money(a.effect)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{a.created_by_name || '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {isDraft && a.is_active && a.type !== 'DAY_ADJUSTMENT' && (
                          <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove" onClick={() => setRemoveTarget(a)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!adjustments.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[12.5px] text-slate-400">
                        No adjustments this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'day_wise' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-slate-500">
            <span>
              <b>Legend</b> P Present · HD Half Day · L Paid Leave · LWP Unpaid Leave · A Absent · MP Missing Punch · WO Weekly Off · H Holiday
              <span className="ml-2 text-orange-600">Orange border = day adjustment</span>
            </span>
            <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700">Daily Rate {money(e.daily_rate)}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[700px] grid-cols-7 gap-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="pb-1 text-center text-[11px] font-semibold text-slate-500">
                  {d}
                </div>
              ))}
              {Array.from({ length: lead }).map((_, i) => (
                <div key={`l${i}`} />
              ))}
              {days.map((d) => {
                const clickable = d.day_type === 'WORKING_DAY';
                return (
                  <button
                    key={d.payroll_employee_day_id}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && setDay(d)}
                    className={`min-h-[72px] rounded-xl border p-2 text-left text-[11px] transition ${DAY_TONE[d.day_type === 'WORKING_DAY' || d.day_type === 'NOT_EMPLOYED' ? d.paid_as : 'NOT_APPLICABLE']} ${
                      d.is_adjusted ? 'ring-2 ring-orange-400' : ''
                    } ${clickable ? 'hover:shadow-sm' : 'cursor-default'}`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>{Number(d.attendance_date.slice(8))}</span>
                      <span className="text-[10px]">
                        {d.is_adjusted && d.original_paid_as ? `${d.attendance_code}→${d.paid_as[0]}` : d.day_type === 'WEEKLY_OFF' ? 'WO' : d.day_type === 'HOLIDAY' ? 'H' : d.attendance_code}
                      </span>
                    </div>
                    {d.day_type === 'WORKING_DAY' ? (
                      <div className="mt-1 text-slate-600">
                        {d.paid_as === 'FULL' ? 'Full' : d.paid_as === 'HALF' ? 'Half' : 'Unpaid'}
                        {d.is_adjusted && <Pencil className="ml-1 inline h-3 w-3 text-orange-500" />}
                        <div className="font-semibold text-slate-800">{money(d.calculated_amount, 0)}</div>
                      </div>
                    ) : d.day_type === 'NOT_EMPLOYED' ? (
                      <div className="mt-1 text-slate-400">Not employed</div>
                    ) : (
                      <div className="mt-1 text-slate-400">{d.holiday_name || 'not a working day'}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-[12.5px] text-slate-700">
            <b>Totals</b> Full days {num(e.full_days)} × {money(e.daily_rate)} + Half days {num(e.half_days)} × {money(e.daily_rate * 0.5)} · Unpaid{' '}
            {days.filter((d) => d.day_type === 'WORKING_DAY' && d.paid_as === 'UNPAID').length} · <b>Basic Salary {money(e.basic_salary)}</b>
          </p>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {history.map((h) => (
              <li key={h.history_id} className="text-[12.5px]">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                <p className="font-semibold text-slate-800">
                  {h.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                  <span className="font-normal text-slate-400"> · {fmtStamp(h.performed_at)}{h.performed_by_name ? ` · ${h.performed_by_name}` : ''}</span>
                </p>
                {h.reason && <p className="text-slate-500">{h.reason}</p>}
              </li>
            ))}
            {!history.length && <li className="text-[12.5px] text-slate-400">No history yet.</li>}
          </ol>
        </div>
      )}

      <DayAdjustmentModal open={!!day} onClose={() => setDay(null)} day={day} payrollEmployeeId={e.payroll_employee_id} employeeLabel={label} basicSalary={e.basic_salary} locked={!isDraft} />
      <AddAdjustmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        payrollEmployeeId={e.payroll_employee_id}
        employeeLabel={label}
        totalSalary={e.total_salary}
        monthStart={days[0]?.attendance_date || ''}
        monthEnd={days[days.length - 1]?.attendance_date || ''}
      />
      <RemoveAdjustmentModal target={removeTarget} onClose={() => setRemoveTarget(null)} />
      <SalarySlipModal open={slipOpen} onClose={() => setSlipOpen(false)} slip={slip.data} loading={slip.isLoading} error={slip.error} />
    </div>
  );
};

const CalcRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <li className="flex justify-between gap-3 py-2">
    <span className="text-slate-600">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </li>
);

const RemoveAdjustmentModal: React.FC<{ target: PayrollAdjustmentItem | null; onClose: () => void }> = ({ target, onClose }) => {
  const remove = useRemoveAdjustmentMutation();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Remove ${target?.type === 'ADDITION' ? 'addition' : 'deduction'}?`}
      subtitle={target ? `${target.category_label} · ${money(target.amount)}` : undefined}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btn.danger}
            disabled={remove.isPending}
            onClick={async () => {
              if (reason.trim().length < 10) return setErr('Please write at least 10 characters.');
              try {
                await remove.mutateAsync({ id: target!.payroll_adjustment_id, reason: reason.trim() });
                setReason('');
                onClose();
              } catch (e) {
                setErr(errorText(e));
              }
            }}
          >
            Remove
          </button>
        </>
      }
    >
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Reason<span className="text-rose-500">*</span>
      </label>
      <textarea rows={2} maxLength={250} className={`${inputCls} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
      <FieldError msg={err} />
    </Modal>
  );
};
