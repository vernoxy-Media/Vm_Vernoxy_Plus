import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ShieldAlert, BarChart3 } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { MyComplaintsPage } from './MyComplaintsPage';
import { ComplaintsManagementPage } from './ComplaintsManagementPage';
import { ComplaintReportsPage } from './ComplaintReportsPage';

export const ComplaintsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.access?.can_manage_organization;
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');

  let activeTab: 'my-complaints' | 'manage' | 'reports' = 'my-complaints';
  if (currentTab === 'manage' || currentTab === 'management') {
    activeTab = 'manage';
  } else if (isAdmin && currentTab === 'reports') {
    activeTab = 'reports';
  }

  const handleTabChange = (tab: 'my-complaints' | 'manage' | 'reports') => {
    if (tab === 'manage') {
      setSearchParams({ tab: 'manage' });
    } else if (tab === 'reports') {
      setSearchParams({ tab: 'reports' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs (Single Complaint Hub - just like My Tasks) */}
      <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex">
        <button
          type="button"
          id="tab-my-complaints"
          onClick={() => handleTabChange('my-complaints')}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'my-complaints'
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertCircle className={`h-4 w-4 ${activeTab === 'my-complaints' ? 'text-white' : 'text-blue-500'}`} />
          <span>My Complaints</span>
        </button>

        <button
          type="button"
          id="tab-manage-complaints"
          onClick={() => handleTabChange('manage')}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'manage'
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className={`h-4 w-4 ${activeTab === 'manage' ? 'text-white' : 'text-purple-500'}`} />
          <span>{isAdmin ? 'Manage Complaints' : 'Assigned Complaints'}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            id="tab-complaint-reports"
            onClick={() => handleTabChange('reports')}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 className={`h-4 w-4 ${activeTab === 'reports' ? 'text-white' : 'text-emerald-500'}`} />
            <span>Complaint Reports</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'manage' ? (
        <ComplaintsManagementPage />
      ) : activeTab === 'reports' && isAdmin ? (
        <ComplaintReportsPage />
      ) : (
        <MyComplaintsPage />
      )}
    </div>
  );
};

