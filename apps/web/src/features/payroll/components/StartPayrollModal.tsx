import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Lock, XCircle } from 'lucide-react';
import { errorText, useStartPayrollEligibilityQuery, useStartPayrollMutation, useStartableMonths } from '../hooks/use-payroll';
import { Banner, Modal, btn, fmtDate, inputCls } from './payroll-ui';

/** Screen 2: Start Payroll pop-up (BFD Section 4). */
export const StartPayrollModal: React.FC<{ open: boolean; preset: { year: number; month: number } | null; onClose: () => void }> = ({ open, preset, onClose }) => {
  const navigate = useNavigate();
  const { data: months = [], isLoading: monthsLoading } = useStartableMonths(open);
  const [pick, setPick] = useState<string>('');
  const [showList, setShowList] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const start = useStartPayrollMutation();

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setShowList(false);
    if (preset) setPick(`${preset.year}-${preset.month}`);
    else {
      const first = months.find((m) => !m.run_status) || months[0];
      setPick(first ? `${first.year}-${first.month}` : '');
    }
  }, [open, preset, months]);

  const [year, month] = pick ? pick.split('-').map(Number) : [undefined, undefined];
  const { data: el, isLoading, error } = useStartPayrollEligibilityQuery(open ? year : undefined, open ? month : undefined);

  const picked = months.find((m) => m.year === year && m.month === month);
  const started = Boolean(picked?.run_status);
  const STATUS: Record<string, string> = { DRAFT: 'Draft', LOCKED: 'Locked', PAID: 'Paid' };

  const calculate = async () => {
    if (!year || !month) return;
    if (started) {
      onClose();
      navigate(`/admin/payroll/${year}/${month}`);
      return;
    }
    setErr(null);
    try {
      await start.mutateAsync({ year, month });
      onClose();
      navigate(`/admin/payroll/${year}/${month}`);
    } catch (e: any) {
      if (e?.code === 'RUN_EXISTS') {
        onClose();
        navigate(`/admin/payroll/${year}/${month}`);
        return;
      }
      setErr(errorText(e));
    }
  };

  const options = months;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title="Start Payroll"
      subtitle="The system lists everyone to be paid and checks the data before calculating."
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.primary} disabled={(!el && !started) || start.isPending} onClick={calculate}>
            {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {started ? 'Open' : start.isPending ? 'Calculating…' : 'Calculate'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <Banner>{err}</Banner>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Payroll Month<span className="text-rose-500">*</span>
            </label>
            {monthsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : options.length ? (
              <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
                {options.map((m) => (
                  <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.label}
                    {m.run_status ? ` · ${STATUS[m.run_status] || m.run_status} (open)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[12.5px] text-slate-500">Every month up to now already has a run.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Period</label>
            <div className={`${inputCls} flex items-center justify-between bg-slate-50 text-slate-500`}>
              {el ? `${fmtDate(el.period.start)} – ${fmtDate(el.period.end)}` : '—'}
              <Lock className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <Banner>{errorText(error)}</Banner>
        ) : el ? (
          <>
            {el.run_exists && (
              <Banner tone="info">
                {el.month_label} has already been started ({STATUS[picked?.run_status || ''] || 'Draft'}). A month cannot be started again; click Open to go to its Payroll Register.
              </Banner>
            )}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Attendance</p>
              <Banner tone={el.attendance_locked ? 'ok' : 'warn'}>{el.attendance_message}</Banner>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employees included</p>
              <div className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-[12.5px] text-slate-700">
                <span className="font-semibold">{el.total_employees_included} employees</span>: {el.breakdown.active_all_month} active all month
                {el.breakdown.joined.map((j) => ` · joined ${fmtDate(j.date).slice(0, 6)} (${j.emp_code})`).join('')}
                {el.breakdown.left.map((l) => ` · left ${fmtDate(l.date).slice(0, 6)} (${l.emp_code})`).join('')}
                <button type="button" className={`${btn.link} ml-2`} onClick={() => setShowList((v) => !v)}>
                  {showList ? 'Hide list' : 'View list'}
                </button>
                {showList && (
                  <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto border-t border-slate-100 pt-2">
                    {el.employees.map((e) => (
                      <li key={e.emp_id} className="flex justify-between gap-2">
                        <span>
                          {e.name} <span className="text-slate-400">· {e.emp_code}</span>
                        </span>
                        <span className="text-slate-400">{e.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Checks before calculation</p>
              <ul className="space-y-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5">
                {el.checks.map((c, i) => (
                  <li key={i} className={`flex items-start gap-2 text-[12.5px] ${c.level === 'OK' ? 'text-emerald-700' : c.level === 'ERROR' ? 'text-rose-700' : 'text-amber-700'}`}>
                    {c.level === 'OK' ? <CheckCircle2 className="mt-px h-4 w-4 shrink-0" /> : c.level === 'ERROR' ? <XCircle className="mt-px h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-px h-4 w-4 shrink-0" />}
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-400">Warnings do not stop the calculation. An error only stops that one employee from being paid.</p>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};
