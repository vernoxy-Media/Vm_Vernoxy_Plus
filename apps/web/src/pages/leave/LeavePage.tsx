import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MyLeavePage } from './MyLeavePage';
import { LeaveRequestsPage } from '../admin/leave/LeaveRequestsPage';

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.access?.can_manage_organization;
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  const activeTab: 'my-leave' | 'requests' =
    isAdmin && (currentTab === 'requests' || currentTab === 'management')
      ? 'requests'
      : 'my-leave';

  const handleTabChange = (tab: 'my-leave' | 'requests') => {
    if (tab === 'requests') {
      setSearchParams({ tab: 'requests' });
    } else {
      setSearchParams({});
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
            {activeTab === 'requests' ? 'Leave Requests' : 'My Leave'}
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
              Leave Requests
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && isAdmin ? (
        <LeaveRequestsPage hideBreadcrumb />
      ) : (
        <MyLeavePage hideBreadcrumb />
      )}
    </div>
  );
};
