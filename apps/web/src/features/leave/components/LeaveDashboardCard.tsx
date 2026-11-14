import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarOff, Plus, ArrowRight, AlertCircle, Hourglass, UserX, CalendarCheck } from 'lucide-react';
import { useLeaveDashboardQuery } from '../hooks/use-leave';
import { colorStyle, dateRangeLabel, fmtDayMonth, fmtDays } from './leave-ui';

const CARD = 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5';
const initialsOf = (name?: string) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** Leave cards for the dashboard (BFD 13: Admin, Employee and Reporting Manager). */
export const LeaveDashboardCard: React.FC = () => {
  const { data } = useLeaveDashboardQuery();
  if (!data) return null;
  const emp = data.employee;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Employee */}
      <section className={`${CARD} space-y-4`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarOff className="h-4 w-4" />
            </span>
            My Leave
          </h3>
          {emp.can_apply && (
            <Link
              to="/leave?apply=1"
              className="inline-flex h-8 items-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" /> Apply Leave
            </Link>
          )}
        </div>
        {!emp.has_policy ? (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            No leave policy is assigned to you. Please contact the Admin.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {emp.balances.map((b) => {
              const c = colorStyle(b.calendar_color);
              const credited = b.credited ?? 0;
              const pct = b.balance_tracked && credited > 0 ? Math.max(0, Math.min(100, ((b.available ?? 0) / credited) * 100)) : 0;
              return (
                <div key={b.leave_type_id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                  <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} />
                  <div className="pl-1.5">
                    <div className="text-xl font-extrabold leading-none tabular-nums text-slate-900">{b.balance_tracked ? fmtDays(b.available) : 'No limit'}</div>
                    <div className="mt-1 truncate text-[11px] font-medium text-slate-500">{b.leave_type_name}</div>
                    {b.balance_tracked && credited > 0 && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            <span className="font-semibold text-slate-700">Next approved leave: </span>
            {emp.next_leave
              ? `${emp.next_leave.leave_type_name}, ${dateRangeLabel(emp.next_leave.from_date, emp.next_leave.to_date, emp.next_leave.duration)}`
              : 'None'}
          </span>
        </div>
      </section>

      {/* Admin */}
      {data.admin && (
        <section className={`${CARD} space-y-4`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Hourglass className="h-4 w-4" />
            </span>
            Leave
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { to: '/leave?tab=requests', n: data.admin.pending_count, label: 'Pending', tone: 'text-amber-600' },
              { to: '/leave?tab=requests', n: data.admin.cancellation_requests_count, label: 'Cancel requests', tone: 'text-rose-600' },
              { to: '/leave?tab=calendar', n: data.admin.on_leave_today.length, label: 'On leave today', tone: 'text-blue-600' },
            ].map((t) => (
              <Link key={t.label} to={t.to} className="rounded-xl border border-slate-200 p-3 text-center transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm">
                <div className={`text-xl font-extrabold tabular-nums ${t.n ? t.tone : 'text-slate-900'}`}>{t.n}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{t.label}</div>
              </Link>
            ))}
          </div>
          <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs">
            {data.admin.on_leave_today.map((p) => (
              <li key={`${p.emp_id}-${p.leave_type_name}`} className="flex items-center gap-2.5">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                  {initialsOf(p.employee_name)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{p.employee_name}</span>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {p.leave_type_name} · back after {fmtDayMonth(p.to_date)}
                </span>
              </li>
            ))}
            {data.admin.on_leave_today.length === 0 && <li className="text-slate-400">Nobody is on leave today.</li>}
          </ul>
        </section>
      )}

      {/* Reporting Manager */}
      {data.manager && (
        <section className={`${CARD} space-y-4`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <UserX className="h-4 w-4" />
            </span>
            My team on leave
          </h3>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Today</div>
            {data.manager.today.length ? (
              <ul className="space-y-1.5">
                {data.manager.today.map((p) => (
                  <li key={`t-${p.emp_id}`} className="flex items-center gap-2 text-xs text-slate-700">
                    <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[9px] font-bold text-purple-700">
                      {initialsOf(p.employee_name)}
                    </span>
                    <span className="font-medium text-slate-800">{p.employee_name}</span>
                    <span className="text-slate-500">· {p.leave_type_name} ({p.part})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-slate-400">Nobody</div>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">This week</div>
            {data.manager.this_week.length ? (
              <ul className="space-y-1.5">
                {data.manager.this_week.map((p, i) => (
                  <li key={`w-${p.emp_id}-${i}`} className="text-xs text-slate-700">
                    <span className="font-medium text-slate-800">{p.employee_name}</span> · {p.leave_type_name} ·{' '}
                    {p.first_day === p.last_day ? fmtDayMonth(p.first_day) : `${fmtDayMonth(p.first_day)} – ${fmtDayMonth(p.last_day)}`}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-slate-400">Nobody</div>
            )}
          </div>
          <Link to="/leave?tab=team" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:gap-1.5 hover:underline">
            See team leave <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}
    </div>
  );
};
