import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Who is on leave on each day, by department.' : 'Approved leave of your team.'} Reasons are never shown here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <option value="">Department: All</option>
              {(departments as any[]).map((d) => (
                <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-0.5">
            <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 w-32 text-center">
              {MONTHS[ym.m - 1]} {ym.y}
            </span>
            <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
        {types.filter((t) => t.status === 'ACTIVE').map((t) => (
          <span key={t.leave_type_id} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${colorStyle(t.calendar_color).dot}`} />
            {t.name} ({t.code})
          </span>
        ))}
        <span className="text-slate-400">½ = half day</span>
      </div>

      {error && <p className="text-xs text-rose-600">{errMessage(error)}</p>}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
        <table className="text-[11px] border-collapse min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 z-10 text-left px-3 py-2 font-semibold text-slate-600 min-w-[180px]">Employee</th>
              {days.map((d) => {
                const dow = new Date(ym.y, ym.m - 1, d).getDay();
                return (
                  <th key={d} className={`px-0.5 py-1 font-semibold text-center w-7 ${isToday(d) ? 'text-blue-700' : dow === 0 ? 'text-slate-400' : 'text-slate-600'}`}>
                    <div className="text-[9px] font-normal">{DOW[dow]}</div>
                    {d}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={daysInMonth + 1} className="py-10 text-center text-slate-400">Loading…</td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 1} className="py-10 text-center text-slate-500">Nobody is on leave in {MONTHS[ym.m - 1]}.</td>
              </tr>
            ) : (
              groups.map(([dep, emps]) => (
                <React.Fragment key={dep}>
                  <tr className="bg-slate-50/60 border-y border-slate-100">
                    <td colSpan={daysInMonth + 1} className="sticky left-0 px-3 py-1.5 font-bold text-slate-700">{dep}</td>
                  </tr>
                  {Array.from(emps.entries()).map(([empId, e]) => (
                    <tr key={empId} className="border-b border-slate-100">
                      <td className="sticky left-0 bg-white z-10 px-3 py-1.5 text-slate-800 font-medium">{e.name}</td>
                      {days.map((d) => {
                        const c = e.cells.get(d);
                        if (!c) return <td key={d} className={`text-center ${isToday(d) ? 'bg-blue-50/40' : ''}`} />;
                        const st = colorStyle(c.color);
                        return (
                          <td key={d} className="p-0.5 text-center" title={`${c.type}${c.half ? ' (half day)' : ''} · ${c.no}`}>
                            <span className={`block rounded ${st.soft} ${st.text} font-bold text-[9px] py-1`}>
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
