import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Info, ArrowLeft, Calendar, CalendarDays, Clock, Users, Layers } from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { AttendanceNavTabs } from '../../features/attendance/components/AttendanceNavTabs';
import { useAttendanceSettingsQuery } from '../../features/attendance/hooks/use-attendance-settings';
import { AttendanceWorkingDaysCard } from './settings/attendance/AttendanceWorkingDaysCard';
import { AttendanceHolidaysCard } from './settings/attendance/AttendanceHolidaysCard';
import { AttendanceDefaultHoursCard } from './settings/attendance/AttendanceDefaultHoursCard';
import { AttendanceEmployeeHoursCard } from './settings/attendance/AttendanceEmployeeHoursCard';

type TabSection = 'all' | 'working_days' | 'holidays' | 'default_hours' | 'employee_hours';

export const AttendanceSettingsPage: React.FC = () => {
  const { data, isLoading, error } = useAttendanceSettingsQuery();
  const [activeSection, setActiveSection] = useState<TabSection>('all');

  const subtabs = [
    { id: 'all', label: 'All Settings', icon: Layers },
    { id: 'working_days', label: 'Working & Off Days', icon: Calendar },
    { id: 'holidays', label: 'Official Holidays', icon: CalendarDays },
    { id: 'default_hours', label: 'Company Default Hours', icon: Clock },
    { id: 'employee_hours', label: 'Employee Working Hours', icon: Users },
  ] as const;

  return (
    <AdminLayout title="Attendance Settings" fluid>
      <div className="space-y-6">
        <PageHeader
          title="Attendance Settings"
          description="Dedicated administration for operational days, statutory holidays, and customizable employee daily working targets."
          actions={
            <Link
              to="/attendance"
              id="back-to-attendance-dashboard-button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Timesheet</span>
            </Link>
          }
        />

        <AttendanceNavTabs activeTab="settings" />

        {/* Section Sub-Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          {subtabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`attendance-settings-subtab-${tab.id.replace('_', '-')}`}
                onClick={() => setActiveSection(tab.id as TabSection)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Informative Guidance Banner */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-bold block">Configured Schedule & Working Hours</span>
            <p className="text-blue-800">
              Working days are Monday to Saturday by default (Sunday is Weekly Off). Customizing an employee's working hours (for example, setting Employee #1 to 7 hours) converts their daily Full Day target to 7 hours (and Half Day to 3.5 hours) across timesheets, reports, and attendance evaluation.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading attendance configuration...</span>
          </div>
        ) : error || !data ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-white border border-rose-200 rounded-2xl">
            Failed to load attendance settings. Please refresh or verify server connection.
          </div>
        ) : (
          <div className="space-y-6">
            {(activeSection === 'all' || activeSection === 'working_days') && (
              <AttendanceWorkingDaysCard
                initialWorkingDays={data.working_days}
                holidays={data.holidays}
              />
            )}

            {(activeSection === 'all' || activeSection === 'holidays') && (
              <AttendanceHolidaysCard holidays={data.holidays} />
            )}

            {(activeSection === 'all' || activeSection === 'default_hours') && (
              <AttendanceDefaultHoursCard initialConfig={data.default_working_hours} />
            )}

            {(activeSection === 'all' || activeSection === 'employee_hours') && (
              <AttendanceEmployeeHoursCard
                defaultHours={data.default_working_hours}
                employeeHours={data.employee_working_hours}
              />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
