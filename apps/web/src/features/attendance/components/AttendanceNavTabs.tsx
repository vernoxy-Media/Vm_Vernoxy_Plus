import React from 'react';
import { NavLink } from 'react-router-dom';
import { Clock, CalendarClock, Shield } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

export interface AttendanceNavTabsProps {
  activeTab?: 'timesheet' | 'calendar' | 'settings';
}

export const AttendanceNavTabs: React.FC<AttendanceNavTabsProps> = ({ activeTab = 'timesheet' }) => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.access?.can_manage_organization);

  return (
    <div className="flex items-center justify-between pb-1 mb-6">
      <div
        className="inline-flex items-center gap-1 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Attendance Modules"
      >
        <NavLink
          to="/attendance"
          id="attendance-tab-timesheet"
          role="tab"
          aria-selected={activeTab === 'timesheet'}
          className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
            activeTab === 'timesheet'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timesheet & Dashboard</span>
        </NavLink>

        <NavLink
          to="/calendar"
          id="attendance-tab-calendar"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
            activeTab === 'calendar'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Calendar</span>
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/admin/attendance-settings"
            id="attendance-tab-settings"
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Attendance Settings</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                activeTab === 'settings'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Shield className="w-2.5 h-2.5" />
              Admin
            </span>
          </NavLink>
        )}
      </div>
    </div>
  );
};

