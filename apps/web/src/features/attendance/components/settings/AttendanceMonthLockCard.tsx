import React, { useState } from 'react';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { MonthLock, errorText, useAttendanceMonthLockMutation, useAttendanceMonthLocks } from '@/features/payroll/hooks/use-payroll';
import { Banner, FieldError, Modal, btn, fmtStamp, inputCls } from '@/features/payroll/components/payroll-ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Attendance month lock. Payroll can be calculated while a month is open, but can only be
 * locked after the month's attendance is locked. A locked month cannot be changed:
 * late corrections become payroll day adjustments.
 */
export const AttendanceMonthLockCard: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const { data = [], isLoading, error } = useAttendanceMonthLocks(year);
  const mutate = useAttendanceMonthLockMutation();
  const [unlockFor, setUnlockFor] = useState<MonthLock | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const ended = (m: number) => new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10) < today;

  const lock = async (m: MonthLock) => {
    setMsg(null);
    try {
      await mutate.mutateAsync({ year: m.year, month: m.month, action: 'lock' });
      setMsg(`${MONTHS[m.month - 1]} ${m.year} attendance locked.`);
    } catch (e) {
      setMsg(errorText(e));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">Month Lock</h3>
          <p className="text-[12px] text-slate-500">Lock a month once its attendance is final. Payroll for the month can only be locked after this.</p>
        </div>
        <select className="h-9 rounded-xl border border-slate-200 px-3 text-[13px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
      {msg && (
        <div className="px-5 pt-3">
          <Banner tone={/locked\.$/.test(msg) ? 'ok' : 'error'}>{msg}</Banner>
        </div>
      )}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-5">
          <Banner>{errorText(error)}</Banner>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data
            .filter((m) => year < now.getFullYear() || m.month <= now.getMonth() + 1)
            .reverse()
            .map((m) => (
              <li key={m.month} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-slate-900">
                    {MONTHS[m.month - 1]} {m.year}
                  </p>
                  <p className="text-[11.5px] text-slate-500">
                    {m.is_locked
                      ? `Locked ${fmtStamp(m.locked_at)}${m.locked_by_name ? ` by ${m.locked_by_name}` : ''}`
                      : m.unlocked_at
                        ? `Unlocked ${fmtStamp(m.unlocked_at)}: ${m.unlock_reason}`
                        : ended(m.month)
                          ? 'Open'
                          : 'Month not ended yet'}
                  </p>
                </div>
                {m.is_locked ? (
                  <button type="button" className={btn.secondary} onClick={() => { setUnlockFor(m); setReason(''); setErr(null); }}>
                    <Unlock className="h-4 w-4" /> Unlock
                  </button>
                ) : (
                  <button type="button" className={btn.primary} disabled={!ended(m.month) || mutate.isPending} onClick={() => lock(m)}>
                    <Lock className="h-4 w-4" /> Lock month
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}

      <Modal
        open={!!unlockFor}
        onClose={() => setUnlockFor(null)}
        title={unlockFor ? `Unlock ${MONTHS[unlockFor.month - 1]} ${unlockFor.year} attendance?` : ''}
        subtitle="Attendance of the month can be changed again. Payroll for the month cannot be locked until it is locked again."
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setUnlockFor(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.danger}
              disabled={mutate.isPending}
              onClick={async () => {
                if (reason.trim().length < 10) return setErr('Please write at least 10 characters.');
                try {
                  await mutate.mutateAsync({ year: unlockFor!.year, month: unlockFor!.month, action: 'unlock', reason: reason.trim() });
                  setUnlockFor(null);
                } catch (e) {
                  setErr(errorText(e));
                }
              }}
            >
              Unlock
            </button>
          </>
        }
      >
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Reason<span className="text-rose-500">*</span>
        </label>
        <textarea rows={3} maxLength={250} className={`${inputCls} h-auto py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
        <FieldError msg={err} />
      </Modal>
    </div>
  );
};
