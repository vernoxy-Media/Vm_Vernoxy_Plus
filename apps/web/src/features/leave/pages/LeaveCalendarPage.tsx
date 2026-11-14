import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Users, CalendarDays } from 'lucide-react';
import { KpiStat } from '@/shared/ui/dashboard/DashboardShell';
import { useLeaveCalendarQuery, useLeaveTypesQuery } from '../hooks/use-leave';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { colorStyle, errMessage } from '../components/leave-ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Leave Calendar: a month view of who is on leave each day, by department. */
export const LeaveCalendarPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [depId, setDepId] = useState<number | undefined>();
  const month = `${ym.y}-${String(ym.m).padStart(2, '0')}`;
  const { data: items = [], isLoading, error } = useLeaveCalendarQuery(month, depId);
  const { data: departments = [] } = useDepartmentOptionsQuery({ enabled: isAdmin });
  const { data: types = [] } = useLeaveTypesQuery();

  const daysInMonth = new Date(ym.y, ym.m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group employees by department
  const groups = useMemo(() => {
    const byDep = new Map<string, Map<number, { name: string; cells: Map<number, { code: string; color: string; half: boolean; type: string; no: string }> }>>();
    for (const it of items) {
      const dep = it.department_name || '—';
      if (!byDep.has(dep)) byDep.set(dep, new Map());
      const emps = byDep.get(dep)!;
      if (!emps.has(it.emp_id)) emps.set(it.emp_id, { name: it.employee_name, cells: new Map() });
      const cells = emps.get(it.emp_id)!.cells;
      for (const d of it.dates || []) {
        if (d.slice(0, 7) !== month) continue;
        cells.set(Number(d.slice(8, 10)), {
          code: it.leave_type_code || it.leave_type_name.slice(0, 2).toUpperCase(),
          color: it.calendar_color,
          half: it.duration !== 'FULL_DAY',
          type: it.leave_type_name,
          no: it.request_no,
        });
      }
    }
    return Array.from(byDep.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, month]);

  const shift = (delta: number) => {
    let m = ym.m + delta;
    let y = ym.y;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    setYm({ y, m });
  };

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === ym.y && today.getMonth() + 1 === ym.m && today.getDate() === d;
  const isCurrentMonth = today.getFullYear() === ym.y && today.getMonth() + 1 === ym.m;
  const isWeekend = (d: number) => {
    const dow = new Date(ym.y, ym.m - 1, d).getDay();
    return dow === 0 || dow === 6;
  };

  // The numbers above the grid
  const stats = useMemo(() => {
    let people = 0;
    let leaveDays = 0;
    let awayToday = 0;
    for (const [, emps] of groups) {
      for (const [, e] of emps) {
        people += 1;
        leaveDays += e.cells.size;
        if (isCurrentMonth && e.cells.has(today.getDate())) awayToday += 1;
      }
    }
    return { people, leaveDays, awayToday };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, isCurrentMonth]);

  const FIELD =
    'h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
  const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

  return (
    <div className="w-full space-y-5">
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Leave Calendar</h1>
            <p className="mt-1 max-w-xl text-xs text-slate-500">
              {isAdmin ? 'Who is on leave on each day, by department.' : 'Approved leave of your team.'} Reasons are never shown here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} aria-label="Department" className={`${FIELD} cursor-pointer`}>
                <option value="">Department: All</option>
                {(departments as any[]).map((d) => (
                  <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button type="button" onClick={() => shift(-1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100" aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="w-36 text-center text-[13px] font-bold text-slate-900" aria-live="polite">
                {MONTHS[ym.m - 1]} {ym.y}
              </span>
              <button type="button" onClick={() => shift(1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100" aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setYm({ y: today.getFullYear(), m: today.getMonth() + 1 })}
              disabled={isCurrentMonth}
              className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:border-slate-200 disabled:hover:bg-white"
            >
              Today
            </button>
          </div>
        </div>
      </section>

      {!isLoading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-3">
          <KpiStat label="Away today" value={isCurrentMonth ? stats.awayToday : '—'} hint={isCurrentMonth ? 'On leave right now' : 'Go to this month to see today'} icon={CalendarCheck} tone="amber" />
          <KpiStat label="People on leave" value={stats.people} hint={`In ${MONTHS[ym.m - 1]}`} icon={Users} tone="blue" />
          <KpiStat label="Leave days" value={stats.leaveDays} hint="Counted per person per day" icon={CalendarDays} tone="purple" className="col-span-2 lg:col-span-1" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-[11px] text-slate-600 shadow-2xs">
        {types.filter((t) => t.status === 'ACTIVE').map((t) => (
          <span key={t.leave_type_id} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${colorStyle(t.calendar_color).dot}`} />
            {t.name} <span className="text-slate-400">({t.code})</span>
          </span>
        ))}
        <span className="text-slate-400">½ = half day · shaded columns are weekends</span>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errMessage(error)}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 min-w-[180px] bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">Employee</th>
              {days.map((d) => {
                const dow = new Date(ym.y, ym.m - 1, d).getDay();
                const todayCol = isToday(d);
                return (
                  <th key={d} className={`w-8 px-0.5 py-1.5 text-center font-semibold ${todayCol ? 'bg-blue-600 text-white' : isWeekend(d) ? 'bg-slate-100 text-slate-400' : 'text-slate-600'}`}>
                    <div className={`text-[9px] font-normal ${todayCol ? 'text-blue-100' : ''}`}>{DOW[dow]}</div>
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={daysInMonth + 1} className="py-10">
                  <div className="mx-auto h-24 max-w-md animate-pulse rounded-xl bg-slate-100" aria-busy="true" aria-label="Loading calendar" />
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 1} className="py-14 text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <CalendarCheck className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold text-slate-700">Nobody is on leave in {MONTHS[ym.m - 1]}</p>
                  <p className="mt-1 text-xs text-slate-500">Approved leave will show up here.</p>
                </td>
              </tr>
            ) : (
              groups.map(([dep, emps]) => (
                <React.Fragment key={dep}>
                  <tr className="border-y border-slate-100 bg-slate-50/70">
                    <td colSpan={daysInMonth + 1} className="sticky left-0 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      {dep} <span className="ml-1 font-medium normal-case text-slate-400">{emps.size} {emps.size === 1 ? 'person' : 'people'}</span>
                    </td>
                  </tr>
                  {Array.from(emps.entries()).map(([empId, e]) => (
                    <tr key={empId} className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                            {initialsOf(e.name)}
                          </span>
                          <span className="truncate font-medium text-slate-800">{e.name}</span>
                        </div>
                      </td>
                      {days.map((d) => {
                        const c = e.cells.get(d);
                        const shade = isToday(d) ? 'bg-blue-50/60' : isWeekend(d) ? 'bg-slate-50' : '';
                        if (!c) return <td key={d} className={`text-center ${shade}`} />;
                        const st = colorStyle(c.color);
                        return (
                          <td key={d} className={`p-0.5 text-center ${shade}`} title={`${c.type}${c.half ? ' (half day)' : ''} · ${c.no}`}>
                            <span className={`block rounded-md border py-1 text-[9px] font-bold ${st.soft} ${st.text} ${st.ring}`}>
                              {c.code}
                              {c.half ? '½' : ''}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
