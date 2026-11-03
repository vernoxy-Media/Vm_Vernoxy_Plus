import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { MyLeavePage } from './MyLeavePage';
import { LeaveRequestsPage } from './LeaveRequestsPage';
import { LeaveReportsPage } from './LeaveReportsPage';

export const LeavePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = !!user?.access?.can_manage_organization;
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  const activeTab: 'my-leave' | 'requests' | 'reports' =
    currentTab === 'reports' && isAdmin
      ? 'reports'
      : (currentTab === 'requests' || currentTab === 'management') && isAdmin
      ? 'requests'
      : 'my-leave';

  const handleTabChange = (tab: 'my-leave' | 'requests' | 'calendar' | 'reports') => {
    if (tab === 'calendar') {
      navigate('/calendar');
      return;
    }
    if (tab === 'my-leave') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Header Bar: Breadcrumb on left, Admin Pill Switcher on right */}
      <div className="w-full flex items-center justify-between pt-1 pb-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="hover:text-slate-600 transition-colors">Leave</span>
          <span className="text-slate-300">&gt;</span>
          <span className="font-semibold text-slate-700">
            {activeTab === 'requests'
              ? 'Leave Requests'
              : activeTab === 'reports'
              ? 'Leave Reports'
              : 'My Leave'}
          </span>
        </div>

        {isAdmin && (
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-semibold shadow-2xs">
            <button
              type="button"
              id="tab-my-leave"
              onClick={() => handleTabChange('my-leave')}
              className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                activeTab === 'my-leave'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Leave
            </button>
            <button
              type="button"
              id="tab-leave-requests"
              onClick={() => handleTabChange('requests')}
              className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Requests
            </button>
            <button
              type="button"
              id="tab-leave-calendar"
              onClick={() => handleTabChange('calendar')}
              className="px-3.5 py-1 rounded-full transition-all cursor-pointer text-slate-600 hover:text-slate-900"
            >
              Calendar
            </button>
            <button
              type="button"
              id="tab-leave-reports"
              onClick={() => handleTabChange('reports')}
              className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reports
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && isAdmin ? (
        <LeaveRequestsPage hideBreadcrumb />
      ) : activeTab === 'reports' && isAdmin ? (
        <LeaveReportsPage />
      ) : (
        <MyLeavePage hideBreadcrumb />
      )}
    </div>
  );
};
