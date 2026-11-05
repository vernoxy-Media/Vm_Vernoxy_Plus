import React from 'react';

export interface AttendanceTimingsCardProps {
  todayWorkedSeconds: number;
  todayTargetSeconds?: number;
  shiftStart?: string;
  shiftEnd?: string;
  isOnBreak?: boolean;
  /** ISO time of today's clock-in, to draw how the day is going */
  clockInAt?: string | null;
}

const hm = (sec: number) => {
  const t = Math.max(0, Math.round(sec / 60));
  return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m`;
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AttendanceTimingsCard: React.FC<AttendanceTimingsCardProps> = ({
  todayWorkedSeconds,
  todayTargetSeconds = 28800, // 8h standard
  shiftStart = '09:00 AM',
  shiftEnd = '05:30 PM',
  isOnBreak = false,
  clockInAt = null,
}) => {
  const todayIdx = new Date().getDay();
  const pct = todayTargetSeconds > 0 ? Math.min(100, Math.round((todayWorkedSeconds / todayTargetSeconds) * 100)) : 0;
  const remaining = Math.max(0, todayTargetSeconds - todayWorkedSeconds);
  const done = todayTargetSeconds > 0 && todayWorkedSeconds >= todayTargetSeconds;
  // day timeline 6 AM – 10 PM with the 09:00 – 17:30 shift shaded
  const T0 = 360;
  const SPAN = 960;
  const at = (m: number) => Math.min(100, Math.max(0, ((m - T0) / SPAN) * 100));
  const nowD = new Date();
  const nowMin = nowD.getHours() * 60 + nowD.getMinutes();
  const inD = clockInAt ? new Date(clockInAt) : null;
  const inMin = inD ? inD.getHours() * 60 + inD.getMinutes() : null;
  const bar = isOnBreak ? 'bg-amber-400' : done ? 'bg-emerald-500' : 'bg-sky-500';

  return (
    <div id="attendance-timings-card" className="flex flex-col justify-between gap-3.5 rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-1" role="list" aria-label="Days of the week">
        {DAYS.map((d, i) => (
          <span
            key={i}
            role="listitem"
            aria-label={DAY_NAMES[i]}
            aria-current={i === todayIdx ? 'date' : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
              i === todayIdx ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="font-medium text-slate-800">
            Today <span className="font-normal text-slate-500">({shiftStart} – {shiftEnd})</span>
          </span>
          {isOnBreak ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">On break</span>
          ) : done ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Goal reached</span>
          ) : null}
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Today's progress">
          <div className={`${bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <div className="relative h-3.5 rounded-full bg-slate-100">
          <span
            className="absolute inset-y-0 rounded-full bg-sky-100"
            style={{ left: `${at(540)}%`, width: `${at(1050) - at(540)}%` }}
            title="Shift hours"
          />
          {inMin !== null && nowMin > inMin && (
            <span
              className={`absolute inset-y-1 rounded-full ${bar}`}
              style={{ left: `${at(inMin)}%`, width: `${Math.max(1, at(nowMin) - at(inMin))}%` }}
              title="Time at work today"
            />
          )}
          <span aria-hidden className="absolute -top-0.5 h-[18px] w-0.5 rounded bg-slate-700" style={{ left: `${at(nowMin)}%` }} title="Now" />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
          <span>6 AM</span><span>10 AM</span><span>2 PM</span><span>6 PM</span><span>10 PM</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-center">
        <div>
          <div className="text-base font-semibold tabular-nums text-slate-900">{hm(todayWorkedSeconds)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Worked</div>
        </div>
        <div>
          <div className="text-base font-semibold tabular-nums text-slate-900">{done ? '—' : hm(remaining)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Remaining</div>
        </div>
        <div>
          <div className="text-base font-semibold tabular-nums text-slate-900">{hm(todayTargetSeconds)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Goal</div>
        </div>
      </div>
    </div>
  );
};
