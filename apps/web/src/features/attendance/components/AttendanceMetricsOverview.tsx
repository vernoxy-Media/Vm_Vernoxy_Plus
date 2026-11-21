import React, { useMemo } from 'react';
import { User, TrendingUp } from 'lucide-react';
import type { MonthSummary, DayRecord, AttendanceStatistics } from '../types/attendance.types';
import { summarize, type ShiftConfig } from '../utils/attendance-metrics';

/** "1h 38m", "45m", "0m" */
export const hm = (sec: number) => {
  if (!sec || sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, '0')}m`;
};

/** White dashboard card with a small uppercase label, shared by every card on the timesheet */
export const PanelCard: React.FC<{ id?: string; label: string; className?: string; children: React.ReactNode }> = ({ id, label, className = '', children }) => (
  <section id={id} className={`flex flex-col rounded-2xl border border-[#E8EBF2] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 ${className}`}>
    <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</h3>
    {children}
  </section>
);

/** One "label …… value" line, as used in Monthly attendance / Exceptions / Hours summary */
const ValueRow: React.FC<{ label: string; value: React.ReactNode; tone?: string; title?: string }> = ({ label, value, tone = 'text-slate-900', title }) => (
  <div className="flex items-center justify-between gap-3 py-1" title={title}>
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-xs font-semibold tabular-nums ${tone}`}>{value}</span>
  </div>
);

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

const StatPair: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="min-w-[56px] text-right">
    <div className="text-base font-bold leading-tight tabular-nums tracking-tight text-slate-900">{value}</div>
    <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
  </div>
);

export const AttendanceStatsSummaryCard: React.FC<{
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
  records: DayRecord[];
  monthSummary?: MonthSummary;
  statistics?: AttendanceStatistics;
  shift?: ShiftConfig;
}> = ({ todayWorkedSeconds, todayBreakSeconds, records, shift }) => {
  const stats = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 29);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    return summarize(records.filter((r) => r.date >= fromStr), shift);
  }, [records, shift]);

  const rows = [
    {
      key: 'today',
      label: 'Today',
      icon: <User className="h-4 w-4" />,
      tile: 'bg-[color:var(--ac-main,#5B4CF8)] text-white shadow-md shadow-[rgb(var(--ac-main-rgb,91_76_248)/0.3)]',
      a: { value: hm(todayWorkedSeconds), label: 'Worked' },
      b: { value: hm(todayBreakSeconds), label: 'On break' },
    },
    {
      key: 'overall',
      label: 'Overall Performance',
      icon: <TrendingUp className="h-4 w-4" />,
      tile: 'bg-[rgb(var(--ac-main-rgb,91_76_248)/0.12)] text-[color:var(--ac-main,#5B4CF8)]',
      a: { value: hm(stats.avgWorkedSeconds || todayWorkedSeconds), label: 'Avg worked' },
      b: { value: `${stats.onTimePct}%`, label: 'On time' },
    },
  ];

  return (
    <PanelCard id="attendance-stats-summary-card" label="Attendance stats (last 30 days)">
      <div className="flex flex-1 flex-col justify-center gap-3.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${r.tile}`}>{r.icon}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{r.label}</span>
            <StatPair {...r.a} />
            <span aria-hidden className="h-8 w-px bg-slate-200" />
            <StatPair {...r.b} />
          </div>
        ))}
      </div>
    </PanelCard>
  );
};

export const AttendanceBreakdownRow: React.FC<{
  monthSummary: MonthSummary;
  records: DayRecord[];
  statistics?: AttendanceStatistics;
  shift?: ShiftConfig;
}> = ({ monthSummary, records, shift }) => {
  const s = useMemo(() => summarize(records, shift), [records, shift]);

  const productiveSec = monthSummary.total_working_seconds || records.reduce((a, r) => a + (r.production_seconds || 0), 0);
  const breakSec = monthSummary.total_break_seconds || records.reduce((a, r) => a + (r.break_seconds || 0), 0);
  // Time clocked out before "Resume work": not worked and not a break, but it must not vanish from the summary
  const awaySec = records.reduce((sum, r) => {
    for (const b of r.breaks ?? []) {
      if (b.break_type !== 'Clocked out' || !b.ended_at) continue;
      sum += Math.max(0, Math.floor((new Date(b.ended_at).getTime() - new Date(b.started_at).getTime()) / 1000));
    }
    return sum;
  }, 0);

  const total = monthSummary.scheduled_days ?? 0;
  const present = monthSummary.present_days ?? 0;
  const absent = monthSummary.absent_days ?? 0;
  const leave = monthSummary.leave_days ?? 0;
  const holidays = monthSummary.holidays ?? 0;
  const weeklyOffs = monthSummary.weekly_offs ?? 0;

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
      <PanelCard label="Monthly attendance">
        <ValueRow label="Total Working Days" value={days(total)} />
        <ValueRow label="Present" value={days(present)} />
        <ValueRow label="Absent" value={days(absent)} tone={absent ? 'text-rose-500' : 'text-slate-900'} />
        <ValueRow label="On Leave" value={days(leave)} tone="text-amber-500" />
        {weeklyOffs > 0 && <ValueRow label="Weekly Off" value={days(weeklyOffs)} />}
        {holidays > 0 && <ValueRow label="Holidays" value={days(holidays)} />}
      </PanelCard>

      <PanelCard label="Exceptions">
        <ValueRow label="Late Arrivals" value={s.lateDays} />
        <ValueRow label="Early Exits" value={s.earlyExits} />
        {s.earlyDays > 0 && <ValueRow label="Early Arrivals" value={s.earlyDays} />}
        {s.missingClockOuts > 0 && (
          <ValueRow label="Missing Clock-outs" value={s.missingClockOuts} tone="text-rose-500" title="Needs regularisation" />
        )}
      </PanelCard>

      <PanelCard label="Hours summary" className="md:col-span-2 xl:col-span-1">
        <ValueRow label="Productive Hours" value={hm(productiveSec)} />
        <ValueRow label="Break Hours" value={hm(breakSec)} />
        {s.overtimeMinutes > 0 && <ValueRow label="Overtime" value={hm(s.overtimeMinutes * 60)} tone="text-[color:var(--ac-main,#5B4CF8)]" />}
        {awaySec >= 60 && (
          <ValueRow label="Clocked out & resumed" value={hm(awaySec)} tone="text-slate-500" title="Not counted as work or break" />
        )}
      </PanelCard>
    </div>
  );
};
