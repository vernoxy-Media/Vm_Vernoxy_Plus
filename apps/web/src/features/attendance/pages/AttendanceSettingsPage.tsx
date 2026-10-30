import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Info, ArrowLeft, Calendar, CalendarDays, Clock, Users, Layers, CalendarOff } from 'lucide-react';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AttendanceNavTabs } from '../components/AttendanceNavTabs';
import { useAttendanceSettingsQuery } from '../hooks/use-attendance-settings';
import { AttendanceWorkingDaysCard } from '../components/settings/AttendanceWorkingDaysCard';
import { AttendanceHolidaysCard } from '../components/settings/AttendanceHolidaysCard';
import { AttendanceDefaultHoursCard } from '../components/settings/AttendanceDefaultHoursCard';
import { AttendanceEmployeeHoursCard } from '../components/settings/AttendanceEmployeeHoursCard';
import { AttendanceStatusesCard } from '../components/settings/AttendanceStatusesCard';
import { Tag, ClipboardCheck, HelpCircle } from 'lucide-react';

const SettingsRequestTypesSection = React.lazy(() =>
  import('@/features/settings/sections/SettingsRequestTypesSection').then((m) => ({ default: m.SettingsRequestTypesSection }))
);
const SettingsAttendanceReasonsSection = React.lazy(() =>
  import('@/features/settings/sections/SettingsAttendanceReasonsSection').then((m) => ({ default: m.SettingsAttendanceReasonsSection }))
);
const SettingsShiftTypesSection = React.lazy(() =>
  import('@/features/settings/sections/SettingsShiftTypesSection').then((m) => ({ default: m.SettingsShiftTypesSection }))
);
const SettingsLeaveTypesSection = React.lazy(() =>
  import('@/features/settings/sections/SettingsLeaveTypesSection').then((m) => ({ default: m.SettingsLeaveTypesSection }))
);

type TabSection =
  | 'all'
  | 'shifts'
  | 'shift_types'
  | 'statuses'
  | 'leave_types'
  | 'request_types'
  | 'reasons'
  | 'working_days'
  | 'holidays'
  | 'employee_hours';

export const AttendanceSettingsPage: React.FC = () => {
  const { data, isLoading, error } = useAttendanceSettingsQuery();
  const [activeSection, setActiveSection] = useState<TabSection>('all');

  const subtabs = [
    { id: 'all', label: 'All Settings', icon: Layers },
    { id: 'shifts', label: 'Shifts & Hours', icon: Clock },
    { id: 'shift_types', label: 'Shift Types', icon: Clock },
    { id: 'statuses', label: 'Attendance Statuses', icon: Tag },
    { id: 'leave_types', label: 'Leave Types', icon: CalendarOff },
    { id: 'request_types', label: 'Request Types', icon: ClipboardCheck },
    { id: 'reasons', label: 'Regularization Reasons', icon: HelpCircle },
    { id: 'working_days', label: 'Working & Off Days', icon: Calendar },
    { id: 'holidays', label: 'Official Holidays', icon: CalendarDays },
    { id: 'employee_hours', label: 'Employee Assignments', icon: Users },
  ] as const;

  return (
    <AdminLayout title="Attendance Settings" fluid>
      <div className="space-y-6">
        <PageHeader
          title="Attendance Settings"
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
            <span className="font-bold block">Configured Schedule, Shifts & Status Codes</span>
            <p className="text-blue-800">
              Employees are automatically assigned the Company Default General Shift ({data?.default_shift?.start_time.slice(0, 5) || '09:30'} to {data?.default_shift?.end_time.slice(0, 5) || '18:30'}, {data?.default_shift?.full_day_hours || 8}h). You can configure additional operational shifts (with automated two-way timing and target hours calculations), manage attendance status codes, and assign dedicated shifts per employee.
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
            {(activeSection === 'all' || activeSection === 'shifts') && (
              <AttendanceDefaultHoursCard
                initialConfig={data.default_working_hours}
                shifts={data.shifts}
                defaultShift={data.default_shift}
              />
            )}

            {(activeSection === 'all' || activeSection === 'shift_types') && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
                <React.Suspense fallback={null}>
                  <SettingsShiftTypesSection />
                </React.Suspense>
              </div>
            )}

            {(activeSection === 'all' || activeSection === 'statuses') && (
              <AttendanceStatusesCard statuses={data.statuses} />
            )}

            {(activeSection === 'all' || activeSection === 'leave_types') && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
                <React.Suspense fallback={null}>
                  <SettingsLeaveTypesSection />
                </React.Suspense>
              </div>
            )}

            {(activeSection === 'all' || activeSection === 'request_types') && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
                <React.Suspense fallback={null}>
                  <SettingsRequestTypesSection />
                </React.Suspense>
              </div>
            )}

            {(activeSection === 'all' || activeSection === 'reasons') && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
                <React.Suspense fallback={null}>
                  <SettingsAttendanceReasonsSection />
                </React.Suspense>
              </div>
            )}

            {(activeSection === 'all' || activeSection === 'working_days') && (
              <AttendanceWorkingDaysCard
                initialWorkingDays={data.working_days}
                holidays={data.holidays}
              />
            )}

            {(activeSection === 'all' || activeSection === 'holidays') && (
              <AttendanceHolidaysCard holidays={data.holidays} />
            )}

            {(activeSection === 'all' || activeSection === 'employee_hours') && (
              <AttendanceEmployeeHoursCard
                defaultHours={data.default_working_hours}
                employeeHours={data.employee_working_hours}
                shifts={data.shifts}
                employeeShifts={data.employee_shifts}
              />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

