import React, { useState } from 'react';
import { Users, Search, Edit2, RotateCcw, Loader2, Clock } from 'lucide-react';
import { useEmployeesQuery } from '../../../../hooks/use-organization';
import {
  useUpdateEmployeeWorkingHoursMutation,
  useAssignEmployeeShiftMutation,
} from '../../../../features/attendance/hooks/use-attendance-settings';
import { EmployeeHoursModal } from './EmployeeHoursModal';
import type { AttendanceShift, WorkingHoursConfig } from '../../../../features/attendance/types/attendance.types';

export interface AttendanceEmployeeHoursCardProps {
  defaultHours: WorkingHoursConfig;
  employeeHours: Record<string, WorkingHoursConfig>;
  shifts?: AttendanceShift[];
  employeeShifts?: Record<string, number>;
}

export const AttendanceEmployeeHoursCard: React.FC<AttendanceEmployeeHoursCardProps> = ({
  defaultHours,
  employeeHours,
  shifts = [],
  employeeShifts = {},
}) => {
  const [search, setSearch] = useState('');
  const [editingEmp, setEditingEmp] = useState<any | null>(null);

  const { data: employeesData, isLoading } = useEmployeesQuery({ q: search || undefined, limit: 50 });
  const resetMutation = useUpdateEmployeeWorkingHoursMutation();
  const resetShiftMutation = useAssignEmployeeShiftMutation();

  const defaultShift = shifts.find((s) => s.is_default) || shifts[0] || null;

  const handleReset = async (empId: number, empName: string) => {
    if (window.confirm(`Reset "${empName}" back to company default shift (${defaultShift?.shift_name || 'General Shift'})?`)) {
      await Promise.all([
        resetMutation.mutateAsync({ empId, hours: { reset_to_default: true } }),
        resetShiftMutation.mutateAsync({ empId, shiftId: null }),
      ]);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Workforce Shift & Hour Assignments</h3>
            <p className="text-xs text-slate-500">
              Assign company shifts to individual employees or customize daily targets. All staff follow General Shift by default.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="employee-hours-search-input"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs text-slate-500">Loading workforce records...</span>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-80 rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs" id="employee-hours-table">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Department & Role</th>
                <th className="py-2.5 px-4">Assigned Shift</th>
                <th className="py-2.5 px-4">Daily Targets</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeesData?.items.map((emp) => {
                const empIdKey = String(emp.emp_id);
                const assignedShiftId = employeeShifts[empIdKey];
                const assignedShift = assignedShiftId ? shifts.find((s) => s.shift_id === assignedShiftId) : null;
                const customHours = employeeHours[empIdKey];

                let displayShiftName = defaultShift?.shift_name || 'General Shift';
                let full = defaultShift ? Number(defaultShift.full_day_hours) : defaultHours.full_day_hours;
                let half = defaultShift ? Number(defaultShift.half_day_hours) : defaultHours.half_day_hours;
                let badgeType: 'default' | 'shift' | 'custom' = 'default';

                if (assignedShift) {
                  displayShiftName = assignedShift.shift_name;
                  full = Number(assignedShift.full_day_hours);
                  half = Number(assignedShift.half_day_hours);
                  badgeType = 'shift';
                } else if (customHours) {
                  displayShiftName = 'Custom Target';
                  full = customHours.full_day_hours;
                  half = customHours.half_day_hours;
                  badgeType = 'custom';
                }

                const isModified = Boolean(assignedShiftId || customHours);

                return (
                  <tr key={emp.emp_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{emp.name}</div>
                      <div className="text-[11px] font-normal text-slate-400">{emp.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{emp.department?.name || `Dep #${emp.dep_id}`}</div>
                      <div className="text-[11px] text-slate-400">{emp.role?.role_name || 'Unassigned'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{displayShiftName}</span>
                        {badgeType === 'shift' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                            Assigned
                          </span>
                        )}
                        {badgeType === 'custom' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            Custom Hours
                          </span>
                        )}
                        {badgeType === 'default' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{full}h Full · {half}h Half</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          id={`edit-hours-${emp.emp_id}`}
                          onClick={() =>
                            setEditingEmp({
                              ...emp,
                              currentHours: customHours,
                              currentShiftId: assignedShiftId || null,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Assign Shift</span>
                        </button>
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => handleReset(emp.emp_id, emp.name)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Reset to company default shift"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingEmp && (
        <EmployeeHoursModal
          employee={editingEmp}
          defaultHours={defaultHours}
          shifts={shifts}
          onClose={() => setEditingEmp(null)}
        />
      )}
    </div>
  );
};
