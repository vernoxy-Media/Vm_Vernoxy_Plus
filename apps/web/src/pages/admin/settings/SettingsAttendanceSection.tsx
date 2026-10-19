import React from 'react';
import { Loader2, Info } from 'lucide-react';
import { useAttendanceSettingsQuery } from '../../../features/attendance/hooks/use-attendance-settings';
import { AttendanceWorkingDaysCard } from './attendance/AttendanceWorkingDaysCard';
import { AttendanceHolidaysCard } from './attendance/AttendanceHolidaysCard';
import { AttendanceDefaultHoursCard } from './attendance/AttendanceDefaultHoursCard';
import { AttendanceEmployeeHoursCard } from './attendance/AttendanceEmployeeHoursCard';

export const SettingsAttendanceSection: React.FC = () => {
  const { data, isLoading, error } = useAttendanceSettingsQuery();

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading attendance settings...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
        Failed to load attendance settings. Please refresh or check connection.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure work schedules, weekly off days, statutory holidays, and customize daily working hour targets.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-bold block">Dynamic Schedule Rules</span>
          <p className="text-blue-800">
            Working days are Mon to Sat by default (Sunday is Weekly Off). Setting an employee's working hours (e.g. 7 hours for Employee #1) immediately converts their full-day target into 7 hours for attendance calculations, timesheets, and day status determination.
          </p>
        </div>
      </div>

      {/* 1. Working & Work Off Days */}
      <AttendanceWorkingDaysCard initialWorkingDays={data.working_days} />

      {/* 2. Official Holidays */}
      <AttendanceHolidaysCard holidays={data.holidays} />

      {/* 3. Company Default Working Hours */}
      <AttendanceDefaultHoursCard initialConfig={data.default_working_hours} />

      {/* 4. Employee-Specific Working Hours */}
      <AttendanceEmployeeHoursCard
        defaultHours={data.default_working_hours}
        employeeHours={data.employee_working_hours}
      />
    </div>
  );
};
