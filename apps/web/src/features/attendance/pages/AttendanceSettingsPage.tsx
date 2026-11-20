import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Calendar, CalendarDays, Clock, Users } from 'lucide-react';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
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

type TabSection =
  | 'shifts'
  | 'shift_types'
  | 'statuses'
  | 'request_types'
  | 'reasons'
  | 'working_days'
  | 'holidays'
  | 'employee_hours';

export const AttendanceSettingsPage: React.FC = () => {
  const { data, isLoading, error } = useAttendanceSettingsQuery();
  const [activeSection, setActiveSection] = useState<TabSection>('shifts');

  const subtabs = [
    { id: 'shifts', label: 'Shifts & Hours', icon: Clock },
    { id: 'shift_types', label: 'Shift Types', icon: Clock },
    { id: 'statuses', label: 'Attendance Statuses', icon: Tag },
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

        {/* Section Sub-Tabs */}
        <div className="-mx-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label="Attendance settings sections"
            className="inline-flex min-w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:min-w-0"
          >
            {subtabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  id={`attendance-settings-subtab-${tab.id.replace('_', '-')}`}
                  onClick={() => setActiveSection(tab.id as TabSection)}
                  className={`inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[13px] font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading attendance configuration...</span>
          </div>
        ) : error || !data ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-white border border-rose-200 rounded-2xl">
            Failed to load attendance settings. Please refresh or verify server connection.
          </div>
        ) : (
          <div className="space-y-6">
            {activeSection === 'shifts' && (
              <AttendanceDefaultHoursCard
                initialConfig={data.default_working_hours}
                shifts={data.shifts}
                defaultShift={data.default_shift}
              />
            )}

            {activeSection === 'shift_types' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] p-4 sm:p-6">
                <React.Suspense fallback={null}>
                  <SettingsShiftTypesSection />
                </React.Suspense>
              </div>
            )}

            {activeSection === 'statuses' && (
              <AttendanceStatusesCard statuses={data.statuses} />
            )}

            {activeSection === 'request_types' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] p-4 sm:p-6">
                <React.Suspense fallback={null}>
                  <SettingsRequestTypesSection />
                </React.Suspense>
              </div>
            )}

            {activeSection === 'reasons' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] p-4 sm:p-6">
                <React.Suspense fallback={null}>
                  <SettingsAttendanceReasonsSection />
                </React.Suspense>
              </div>
            )}

            {activeSection === 'working_days' && (
              <AttendanceWorkingDaysCard
                initialWorkingDays={data.working_days}
                holidays={data.holidays}
              />
            )}

            {activeSection === 'holidays' && (
              <AttendanceHolidaysCard holidays={data.holidays} />
            )}

            {activeSection === 'employee_hours' && (
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

