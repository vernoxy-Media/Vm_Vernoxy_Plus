import React, { useMemo, useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Layers,
  Snail,
  Smile,
  LogOut,
  AlertCircle,
  Timer,
  Coffee,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Plane,
  CalendarDays,
  Hourglass,
} from 'lucide-react';
import type { MonthSummary, DayRecord, AttendanceStatistics } from '../types/attendance.types';
import { describeMinutes, summarize, type ShiftConfig } from '../utils/attendance-metrics';

export interface AttendanceMetricsOverviewProps {
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
  monthSummary: MonthSummary;
  records: DayRecord[];
  statistics?: AttendanceStatistics;
}

const hm = (sec: number) => {
  if (!sec || sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, '0')}m`;
};

/** A circular percentage gauge */
const Ring: React.FC<{ pct: number; stroke: string; size?: number; children?: React.ReactNode }> = ({ pct, stroke, size = 72, children }) => {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, Math.max(0, pct)) / 100) * c}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

const IconTile: React.FC<{ tone: string; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>{children}</span>
);

const CardShell: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({ id, className = '', children }) => (
  <div id={id} className={`flex flex-col rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    {children}
  </div>
);

const CardTitle: React.FC<{ icon: React.ReactNode; tone: string; title: string; hint?: string; right?: React.ReactNode }> = ({ icon, tone, title, hint, right }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <IconTile tone={tone}>{icon}</IconTile>
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
        {hint && <p className="truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
    {right}
  </div>
);

export const AttendanceStatsSummaryCard: React.FC<{
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
  records: DayRecord[];
  monthSummary?: MonthSummary;
  statistics?: AttendanceStatistics;
  shift?: ShiftConfig;
}> = ({ todayWorkedSeconds, todayBreakSeconds, records: allRecords, shift }) => {
  const [range, setRange] = useState<'week' | 'month'>('week');

  const stats = useMemo(() => {
    let rows = allRecords;
    if (range === 'week') {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      const fromStr = from.toISOString().slice(0, 10);
      rows = allRecords.filter((r) => r.date >= fromStr);
    }
    return summarize(rows, shift);
  }, [allRecords, range, shift]);

  const avg = stats.avgWorkedSeconds || todayWorkedSeconds;

  // the last seven days as bars, 8 hours = a full bar
  const week = useMemo(() => {
    const byDate = new Map(allRecords.map((r) => [r.date, r]));
    const out: Array<{ date: string; label: string; sec: number; today: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rec = byDate.get(key);
      out.push({
        date: key,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        sec: rec ? (key === new Date().toISOString().slice(0, 10) ? Math.max(rec.production_seconds || 0, todayWorkedSeconds) : rec.production_seconds || 0) : 0,
        today: i === 0,
      });
    }
    return out;
  }, [allRecords, todayWorkedSeconds]);
  const onTimeTone = stats.onTimePct >= 90 ? '#10B981' : stats.onTimePct >= 60 ? '#F59E0B' : '#F43F5E';

  return (
    <CardShell id="attendance-stats-summary-card" className="gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[15px] font-semibold tracking-tight text-slate-900">My attendance</h4>
        <div role="group" aria-label="Stats period" className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
          {([['week', '7 days'], ['month', 'This month']] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={range === v}
              onClick={() => setRange(v)}
              className={`rounded-md px-2.5 py-1 transition cursor-pointer ${range === v ? 'bg-white text-[#1471DD] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-2.5 text-center">
          <Ring pct={stats.onTimePct} stroke={onTimeTone} size={56}>
            <span className="text-[13px] font-semibold tabular-nums text-slate-900">{stats.onTimePct}%</span>
          </Ring>
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">On time</div>
          <div className="text-[11px] text-slate-500">{stats.onTimeDays}/{stats.punchedDays} days</div>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-sky-50 p-2.5 text-center text-sky-700">
          <Timer className="mx-auto h-4 w-4 opacity-70" />
          <div className="mt-1.5 text-lg font-semibold tabular-nums leading-tight tracking-tight">{hm(avg)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Avg / day</div>
        </div>

        <div className={`flex flex-col justify-center rounded-xl p-2.5 text-center ${stats.lateDays ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <Snail className="mx-auto h-4 w-4 opacity-70" />
          <div className="mt-1.5 text-lg font-semibold tabular-nums leading-tight tracking-tight">{stats.lateDays}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Late</div>
          <div className="text-[11px] text-slate-500">{stats.lateMinutes ? describeMinutes(stats.lateMinutes) : 'never late'}</div>
        </div>
      </div>

      <div className="flex min-h-[88px] flex-1 flex-col justify-end rounded-xl border border-slate-100 px-3.5 pb-2.5 pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last 7 days</span>
          <span className="text-[10px] text-slate-400">8h = full bar</span>
        </div>
        <div className="mt-2 flex flex-1 items-end gap-2">
          {week.map((d) => {
            const pct = Math.min(100, Math.round((d.sec / 28800) * 100));
            return (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date} · ${hm(d.sec)}`}>
                <div className="flex w-full flex-1 items-end rounded-md bg-slate-100">
                  <div
                    className={`w-full rounded-md transition-all duration-500 ${d.today ? 'bg-sky-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-sky-300'}`}
                    style={{ height: `${Math.max(d.sec > 0 ? 8 : 0, pct)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${d.today ? 'text-sky-600' : 'text-slate-400'}`}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Today</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums tracking-tight text-slate-900">{hm(todayWorkedSeconds)}</span>
            <span className="text-xs text-slate-500">worked</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
          <Coffee className="h-4 w-4 text-amber-600" />
          <div>
            <div className="text-sm font-semibold tabular-nums leading-tight text-amber-700">{hm(todayBreakSeconds)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/70">On break</div>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; tone: string; sub?: string }> = ({ icon, label, value, tone, sub }) => (
  <div className={`rounded-xl px-3 py-2.5 ${tone}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
      {icon}
      {label}
    </div>
    <div className="mt-1 flex items-baseline gap-1.5">
      <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
      {sub && <span className="text-[11px] opacity-70">{sub}</span>}
    </div>
  </div>
);

const ExceptionRow: React.FC<{ icon: React.ReactNode; tone: string; label: string; sub?: string; count: number; badge: string }> = ({ icon, tone, label, sub, count, badge }) => (
  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
    <IconTile tone={tone}>{icon}</IconTile>
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium text-slate-800">{label}</div>
      {sub && <div className="truncate text-xs text-slate-500">{sub}</div>}
    </div>
    <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-bold ${count ? badge : 'bg-slate-200/70 text-slate-500'}`}>{count}</span>
  </div>
);

export const AttendanceBreakdownRow: React.FC<{
  monthSummary: MonthSummary;
  records: DayRecord[];
  statistics?: AttendanceStatistics;
  shift?: ShiftConfig;
}> = ({ monthSummary, records, shift }) => {
  const s = useMemo(() => summarize(records, shift), [records, shift]);

  const productiveSec = monthSummary.total_working_seconds || records.reduce((a, r) => a + (r.production_seconds || 0), 0);
  const breakSec = monthSummary.total_break_seconds || records.reduce((a, r) => a + (r.break_seconds || 0), 0);
  const grossSec = productiveSec + breakSec;
  const productivePct = grossSec ? Math.round((productiveSec / grossSec) * 100) : 0;

  const total = monthSummary.scheduled_days ?? 0;
  const present = monthSummary.present_days ?? 0;
  const absent = monthSummary.absent_days ?? 0;
  const leave = monthSummary.leave_days ?? 0;
  const presentPct = total > 0 ? Math.min(100, Math.round((present / total) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      <CardShell>
        <CardTitle
          title="Monthly attendance"
          hint={`${presentPct}% present so far`}
          tone="bg-indigo-50 text-indigo-600"
          icon={<Calendar className="h-4 w-4" />}
          right={
            <Ring pct={presentPct} stroke="#6366F1" size={44}>
              <span className="text-[10px] font-bold text-slate-700">{presentPct}%</span>
            </Ring>
          }
        />
        <div className="grid flex-1 grid-cols-2 gap-2.5">
          <Stat icon={<CalendarDays className="h-3.5 w-3.5" />} label="Working" value={total} sub={total === 1 ? 'day' : 'days'} tone="bg-slate-50 text-slate-800" />
          <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Present" value={present} sub={present === 1 ? 'day' : 'days'} tone="bg-emerald-50 text-emerald-700" />
          <Stat icon={<XCircle className="h-3.5 w-3.5" />} label="Absent" value={absent} sub={absent === 1 ? 'day' : 'days'} tone={absent ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'} />
          <Stat icon={<Plane className="h-3.5 w-3.5" />} label="On leave" value={leave} sub={leave === 1 ? 'day' : 'days'} tone={leave ? 'bg-violet-50 text-violet-700' : 'bg-slate-50 text-slate-500'} />
        </div>
      </CardShell>

      <CardShell>
        <CardTitle title="Exceptions" hint="Late, early and missing punches" tone="bg-amber-50 text-amber-600" icon={<AlertTriangle className="h-4 w-4" />} />
        <div className="flex flex-1 flex-col justify-between gap-2">
          <ExceptionRow
            icon={<Snail className="h-4 w-4" />}
            tone="bg-amber-100 text-amber-600"
            label="Late arrivals"
            sub={s.lateMinutes ? `${describeMinutes(s.lateMinutes)} in total` : 'Always on time'}
            count={s.lateDays}
            badge="bg-amber-100 text-amber-800"
          />
          <ExceptionRow
            icon={<Smile className="h-4 w-4" />}
            tone="bg-emerald-100 text-emerald-600"
            label="Early arrivals"
            sub="Before the shift starts"
            count={s.earlyDays}
            badge="bg-emerald-100 text-emerald-700"
          />
          <ExceptionRow
            icon={<LogOut className="h-4 w-4" />}
            tone="bg-orange-100 text-orange-600"
            label="Early exits"
            sub="Left before the shift ended"
            count={s.earlyExits}
            badge="bg-orange-100 text-orange-700"
          />
          <ExceptionRow
            icon={<AlertCircle className="h-4 w-4" />}
            tone="bg-rose-100 text-rose-600"
            label="Missing clock-outs"
            sub={s.missingClockOuts ? 'Needs regularisation' : 'None pending'}
            count={s.missingClockOuts}
            badge="bg-rose-100 text-rose-700"
          />
        </div>
      </CardShell>

      <CardShell className="md:col-span-2 xl:col-span-1">
        <CardTitle title="Hours summary" hint="This month" tone="bg-sky-50 text-sky-600" icon={<Layers className="h-4 w-4" />} />
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-sky-50 px-3 py-2.5 text-sky-700">
            <Hourglass className="h-4 w-4 opacity-70" />
            <div className="mt-1 text-base font-semibold tabular-nums tracking-tight">{hm(productiveSec)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Productive</div>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-amber-700">
            <Coffee className="h-4 w-4 opacity-70" />
            <div className="mt-1 text-base font-semibold tabular-nums tracking-tight">{hm(breakSec)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Break</div>
          </div>
          <div className="rounded-xl bg-orange-50 px-3 py-2.5 text-orange-700">
            <TrendingUp className="h-4 w-4 opacity-70" />
            <div className="mt-1 text-base font-semibold tabular-nums tracking-tight">{s.overtimeMinutes > 0 ? hm(s.overtimeMinutes * 60) : '0m'}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Overtime</div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Gross hours</span>
            <span className="font-semibold text-slate-800">{hm(grossSec)}</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${productivePct}% productive, ${100 - productivePct}% break`}>
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${productivePct}%` }} />
            <div className="h-full bg-amber-400 transition-all" style={{ width: grossSec ? `${100 - productivePct}%` : '0%' }} />
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Productive {productivePct}%</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Break {grossSec ? 100 - productivePct : 0}%</span>
          </div>
        </div>
      </CardShell>
    </div>
  );
};
