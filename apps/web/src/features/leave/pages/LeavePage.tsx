import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { MyLeavePage } from './MyLeavePage';
import { LeaveRequestsPage } from './LeaveRequestsPage';
import { LeaveReportsPage } from './LeaveReportsPage';
import { LeaveBalancesPage } from './LeaveBalancesPage';
import { LeaveCalendarPage } from './LeaveCalendarPage';
import { useLeaveDashboardQuery } from '../hooks/use-leave';

type Tab = 'my-leave' | 'requests' | 'team' | 'calendar' | 'balances' | 'reports';

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.access?.can_manage_organization;
  const { data: dashboard } = useLeaveDashboardQuery();
  const isManager = Boolean(dashboard?.manager?.team_size);
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = (searchParams.get('tab') || 'my-leave') as Tab | 'management';

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'my-leave', label: 'My Leave' },
    ...(isAdmin ? [{ id: 'requests' as Tab, label: 'Leave Requests' }] : []),
    ...(!isAdmin && isManager ? [{ id: 'team' as Tab, label: 'Team Leave' }] : []),
    ...(isAdmin || isManager ? [{ id: 'calendar' as Tab, label: 'Leave Calendar' }] : []),
    ...(isAdmin ? [{ id: 'balances' as Tab, label: 'Balances' }, { id: 'reports' as Tab, label: 'Reports' }] : []),
  ];
  const normalized: Tab = requested === 'management' ? 'requests' : (requested as Tab);
  const active: Tab = tabs.some((t) => t.id === normalized) ? normalized : 'my-leave';

  const go = (tab: Tab) => setSearchParams(tab === 'my-leave' ? {} : { tab });
  const current = tabs.find((t) => t.id === active)?.label || 'My Leave';

  return (
    <div className="w-full space-y-3">
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Leave</span>
          <span className="text-slate-300">&gt;</span>
          <span className="font-semibold text-slate-700">{current}</span>
        </div>
        {tabs.length > 1 && (
          <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-semibold">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                id={`tab-leave-${t.id}`}
                onClick={() => go(t.id)}
                className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                  active === t.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {active === 'requests' && <LeaveRequestsPage hideBreadcrumb onNavigate={(t) => go(t)} />}
      {active === 'team' && <LeaveRequestsPage hideBreadcrumb teamMode />}
      {active === 'calendar' && <LeaveCalendarPage isAdmin={isAdmin} />}
      {active === 'balances' && <LeaveBalancesPage />}
      {active === 'reports' && <LeaveReportsPage />}
      {active === 'my-leave' && <MyLeavePage hideBreadcrumb />}
    </div>
  );
};
