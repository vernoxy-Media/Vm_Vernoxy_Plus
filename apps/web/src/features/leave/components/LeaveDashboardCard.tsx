import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarOff, Plus } from 'lucide-react';
import { useLeaveDashboardQuery } from '../hooks/use-leave';
import { dateRangeLabel, fmtDayMonth, fmtDays } from './leave-ui';

/** Leave cards for the dashboard (BFD 13: Admin, Employee and Reporting Manager). */
export const LeaveDashboardCard: React.FC = () => {
  const { data } = useLeaveDashboardQuery();
  if (!data) return null;
  const emp = data.employee;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Employee */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-blue-600" /> My Leave
          </h3>
          {emp.can_apply && (
            <Link to="/leave?apply=1" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Apply Leave
            </Link>
          )}
        </div>
        {!emp.has_policy ? (
          <p className="text-xs text-amber-700">No leave policy is assigned to you. Please contact the Admin.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {emp.balances.map((b) => (
              <div key={b.leave_type_id} className="rounded-xl border border-slate-200 p-2.5">
                <div className="text-lg font-extrabold text-slate-900">{b.balance_tracked ? fmtDays(b.available) : 'No limit'}</div>
                <div className="text-[11px] text-slate-500">{b.leave_type_name}</div>
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Next approved leave: </span>
          {emp.next_leave
            ? `${emp.next_leave.leave_type_name}, ${dateRangeLabel(emp.next_leave.from_date, emp.next_leave.to_date, emp.next_leave.duration)}`
            : 'None'}
        </div>
      </div>

      {/* Admin */}
      {data.admin && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Leave</h3>
          <div className="grid grid-cols-3 gap-2">
            <Link to="/leave?tab=requests" className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
              <div className="text-lg font-extrabold text-slate-900">{data.admin.pending_count}</div>
              <div className="text-[11px] text-slate-500">Pending requests</div>
            </Link>
            <Link to="/leave?tab=requests" className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
              <div className="text-lg font-extrabold text-slate-900">{data.admin.cancellation_requests_count}</div>
              <div className="text-[11px] text-slate-500">Cancellation requests</div>
            </Link>
            <Link to="/leave?tab=calendar" className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
              <div className="text-lg font-extrabold text-slate-900">{data.admin.on_leave_today.length}</div>
              <div className="text-[11px] text-slate-500">On leave today</div>
            </Link>
          </div>
          <ul className="space-y-1 text-xs max-h-28 overflow-y-auto">
            {data.admin.on_leave_today.map((p) => (
              <li key={`${p.emp_id}-${p.leave_type_name}`} className="flex justify-between text-slate-600">
                <span className="font-medium text-slate-800">{p.employee_name}</span>
                <span>{p.leave_type_name} · {p.part} · back after {fmtDayMonth(p.to_date)}</span>
              </li>
            ))}
            {data.admin.on_leave_today.length === 0 && <li className="text-slate-400">Nobody is on leave today.</li>}
          </ul>
        </div>
      )}

      {/* Reporting Manager */}
      {data.manager && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">My team on leave</h3>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Today</div>
            {data.manager.today.length ? (
              data.manager.today.map((p) => (
                <div key={`t-${p.emp_id}`} className="text-xs text-slate-700">
                  {p.employee_name} · {p.leave_type_name} ({p.part})
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400">Nobody</div>
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">This week</div>
            {data.manager.this_week.length ? (
              data.manager.this_week.map((p, i) => (
                <div key={`w-${p.emp_id}-${i}`} className="text-xs text-slate-700">
                  {p.employee_name} · {p.leave_type_name} · {p.first_day === p.last_day ? fmtDayMonth(p.first_day) : `${fmtDayMonth(p.first_day)} – ${fmtDayMonth(p.last_day)}`}
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400">Nobody</div>
            )}
          </div>
          <Link to="/leave?tab=team" className="text-xs font-semibold text-blue-600 hover:underline">
            See team leave
          </Link>
        </div>
      )}
    </div>
  );
};
