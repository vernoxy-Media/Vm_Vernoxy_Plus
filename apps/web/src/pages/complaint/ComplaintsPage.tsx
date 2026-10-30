import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ShieldAlert, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MyComplaintsPage } from './MyComplaintsPage';
import { ComplaintsManagementPage } from '../admin/complaint/ComplaintsManagementPage';
import { ComplaintReportsPage } from '../admin/complaint/ComplaintReportsPage';

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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          id="tab-my-complaints"
          onClick={() => handleTabChange('my-complaints')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'my-complaints'
              ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-blue-500" />
          <span>My Complaints</span>
        </button>

        <button
          type="button"
          id="tab-manage-complaints"
          onClick={() => handleTabChange('manage')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
            activeTab === 'manage'
              ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-purple-500" />
          <span>{isAdmin ? 'Manage Complaints' : 'Assigned Complaints'}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            id="tab-complaint-reports"
            onClick={() => handleTabChange('reports')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
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

