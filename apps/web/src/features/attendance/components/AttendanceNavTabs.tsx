import React from 'react';
import { NavLink } from 'react-router-dom';
import { Clock, CalendarClock, Shield } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export interface AttendanceNavTabsProps {
  activeTab?: 'timesheet' | 'settings';
}

export const AttendanceNavTabs: React.FC<AttendanceNavTabsProps> = ({ activeTab = 'timesheet' }) => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.access?.can_manage_organization);

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-6" role="tablist" aria-label="Attendance Modules">
      <NavLink
        to="/attendance"
        id="attendance-tab-timesheet"
        role="tab"
        aria-selected={activeTab === 'timesheet'}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeTab === 'timesheet'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Timesheet & Dashboard</span>
      </NavLink>

      <NavLink
        to="/admin/attendance-settings"
        id="attendance-tab-settings"
        role="tab"
        aria-selected={activeTab === 'settings'}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
          activeTab === 'settings'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <CalendarClock className="w-3.5 h-3.5" />
        <span>Attendance Settings</span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
            activeTab === 'settings'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          <Shield className="w-2.5 h-2.5" />
          Admin
        </span>
      </NavLink>
    </div>
  );
};
