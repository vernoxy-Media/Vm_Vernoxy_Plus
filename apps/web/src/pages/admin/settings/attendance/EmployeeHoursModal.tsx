import React, { useState, useEffect } from 'react';
import { X, Clock, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import {
  useUpdateEmployeeWorkingHoursMutation,
  useAssignEmployeeShiftMutation,
} from '../../../../features/attendance/hooks/use-attendance-settings';
import type { AttendanceShift, WorkingHoursConfig } from '../../../../features/attendance/types/attendance.types';

export interface EmployeeHoursModalProps {
  employee: {
    emp_id: number;
    name: string;
    email: string;
    currentHours?: WorkingHoursConfig;
    currentShiftId?: number | null;
  } | null;
  defaultHours: WorkingHoursConfig;
  shifts?: AttendanceShift[];
  onClose: () => void;
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const EmployeeHoursModal: React.FC<EmployeeHoursModalProps> = ({
  employee,
  defaultHours,
  shifts = [],
  onClose,
}) => {
  const defaultShift = shifts.find((s) => s.is_default) || shifts[0] || null;

  const [assignmentMode, setAssignmentMode] = useState<'shift' | 'custom'>('shift');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('default');
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('18:30');
  const [fullDay, setFullDay] = useState<number>(8);
  const [halfDay, setHalfDay] = useState<number>(4);

  const hoursMutation = useUpdateEmployeeWorkingHoursMutation();
  const assignMutation = useAssignEmployeeShiftMutation();

  useEffect(() => {
    if (employee) {
      if (employee.currentShiftId) {
        setAssignmentMode('shift');
        setSelectedShiftId(String(employee.currentShiftId));
        const matched = shifts.find((s) => s.shift_id === employee.currentShiftId);
        if (matched) {
          setFullDay(Number(matched.full_day_hours));
          setHalfDay(Number(matched.half_day_hours));
          setStartTime(matched.start_time.slice(0, 5));
          setEndTime(matched.end_time.slice(0, 5));
        }
      } else if (employee.currentHours) {
        setAssignmentMode('custom');
        setSelectedShiftId('custom');
        setFullDay(employee.currentHours.full_day_hours);
        setHalfDay(employee.currentHours.half_day_hours);
        setStartTime(
          employee.currentHours.start_time
            ? employee.currentHours.start_time.slice(0, 5)
            : (defaultShift?.start_time.slice(0, 5) || '09:30')
        );
        setEndTime(
          employee.currentHours.end_time
            ? employee.currentHours.end_time.slice(0, 5)
            : (defaultShift?.end_time.slice(0, 5) || '18:30')
        );
      } else {
        setAssignmentMode('shift');
        setSelectedShiftId('default');
        setFullDay(defaultShift ? Number(defaultShift.full_day_hours) : (defaultHours.full_day_hours || 8));
        setHalfDay(defaultShift ? Number(defaultShift.half_day_hours) : (defaultHours.half_day_hours || 4));
        setStartTime(defaultShift ? defaultShift.start_time.slice(0, 5) : '09:30');
        setEndTime(defaultShift ? defaultShift.end_time.slice(0, 5) : '18:30');
      }
    }
  }, [employee, defaultHours, shifts, defaultShift]);

  if (!employee) return null;

  const handleShiftSelect = (val: string) => {
    setSelectedShiftId(val);
    if (val === 'custom') {
      setAssignmentMode('custom');
    } else if (val === 'default') {
      setAssignmentMode('shift');
      const hours = defaultShift ? Number(defaultShift.full_day_hours) : (defaultHours.full_day_hours || 8);
      setFullDay(hours);
      setHalfDay(Math.round((hours / 2) * 10) / 10);
      setStartTime(defaultShift ? defaultShift.start_time.slice(0, 5) : '09:30');
      setEndTime(defaultShift ? defaultShift.end_time.slice(0, 5) : '18:30');
    } else {
      setAssignmentMode('shift');
      const idNum = parseInt(val, 10);
      const matched = shifts.find((s) => s.shift_id === idNum);
      if (matched) {
        setFullDay(Number(matched.full_day_hours));
        setHalfDay(Number(matched.half_day_hours));
        setStartTime(matched.start_time.slice(0, 5));
        setEndTime(matched.end_time.slice(0, 5));
      }
    }
  };

  // Two-way calculation 1: Change start time -> auto update end time
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && fullDay > 0) {
      // 60 min standard unpaid break
      const totalMinutes = Math.round(fullDay * 60) + 60;
      setEndTime(minutesToTime(timeToMinutes(newStart) + totalMinutes));
    }
  };

  // Two-way calculation 2: Change end time -> auto compute full day & half day hours
  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const startMin = timeToMinutes(startTime);
      const endMin = timeToMinutes(newEnd);
      let diff = endMin - startMin;
      if (diff <= 0) diff += 1440; // overnight shift

      const netWorkingMin = Math.max(0, diff - 60); // 60m break deduction
      const computedFull = Math.round((netWorkingMin / 60) * 10) / 10;
      setFullDay(computedFull);
      setHalfDay(Math.round((computedFull / 2) * 10) / 10);
    }
  };

  // Two-way calculation 3: Change full day hours -> auto update end time
  const handleFullDayChange = (val: number) => {
    setFullDay(val);
    setHalfDay(Math.round((val / 2) * 10) / 10);
    if (startTime && val > 0) {
      const totalMinutes = Math.round(val * 60) + 60;
      setEndTime(minutesToTime(timeToMinutes(startTime) + totalMinutes));
    }
  };

  const applyPreset = (full: number, half: number) => {
    setFullDay(full);
    setHalfDay(half);
    if (startTime && full > 0) {
      const totalMinutes = Math.round(full * 60) + 60;
      setEndTime(minutesToTime(timeToMinutes(startTime) + totalMinutes));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assignmentMode === 'shift') {
      const shiftId = selectedShiftId === 'default' ? null : parseInt(selectedShiftId, 10);
      await assignMutation.mutateAsync({ empId: employee.emp_id, shiftId });
      // Reset any manual custom hours override so shift timing governs
      if (employee.currentHours) {
        await hoursMutation.mutateAsync({
          empId: employee.emp_id,
          hours: { reset_to_default: true },
        });
      }
    } else {
      // Manual custom hours & shift timings
      await assignMutation.mutateAsync({ empId: employee.emp_id, shiftId: null });
      await hoursMutation.mutateAsync({
        empId: employee.emp_id,
        hours: {
          full_day_hours: fullDay,
          half_day_hours: halfDay,
          start_time: startTime,
          end_time: endTime,
        },
      });
    }

    onClose();
  };

  const isPending = hoursMutation.isPending || assignMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Shift & Working Hours</h3>
              <p className="text-xs text-slate-500">{employee.name} ({employee.email})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Shift Selection */}
          <div className="space-y-1.5">
            <label htmlFor="assign-shift-select" className="block text-xs font-bold text-slate-700">
              Operational Shift Assignment *
            </label>
            <select
              id="assign-shift-select"
              value={selectedShiftId}
              onChange={(e) => handleShiftSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="default">
                General Shift (Company Default · {defaultShift?.start_time.slice(0, 5) || '09:30'} - {defaultShift?.end_time.slice(0, 5) || '18:30'}, {defaultShift?.full_day_hours || 8}h)
              </option>
              {shifts
                .filter((s) => !s.is_default)
                .map((s) => (
                  <option key={s.shift_id} value={String(s.shift_id)}>
                    {s.shift_name} ({s.shift_code} · {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}, {s.full_day_hours}h)
                  </option>
                ))}
              <option value="custom">-- Custom Hours Target (Manual Override) --</option>
            </select>
            <p className="text-[11px] text-slate-400">
              By default, all employees inherit the company general shift. Selecting a different shift automatically synchronizes their full day target and work off schedule.
            </p>
          </div>

          {/* Computed Target Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Daily Target: <span className="font-bold">{fullDay} hours Full Day</span> · <span className="font-bold">{halfDay} hours Half Day</span>
              </span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {startTime} - {endTime}
            </span>
          </div>

          {/* Custom Shift Timings & Working Hours Target Box */}
          <div className={`space-y-3.5 p-4 rounded-xl border transition-all ${
            assignmentMode === 'custom'
              ? 'border-indigo-300 bg-indigo-50/30 shadow-2xs'
              : 'border-slate-200 bg-slate-50/50 opacity-80 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Custom Shift Timings & Hours
              </span>
              {assignmentMode === 'custom' ? (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Editable Custom Override
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  Linked to Selected Shift
                </span>
              )}
            </div>

            {/* Custom Start Time and End Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="employee-start-time-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Shift Start Time *
                </label>
                <input
                  type="time"
                  id="employee-start-time-input"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  disabled={assignmentMode !== 'custom'}
                  className="w-full px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label htmlFor="employee-end-time-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Shift End Time *
                </label>
                <input
                  type="time"
                  id="employee-end-time-input"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  disabled={assignmentMode !== 'custom'}
                  className="w-full px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Custom Full Day & Half Day Targets */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="employee-full-day-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Day Target *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="employee-full-day-input"
                    min="1"
                    max="16"
                    step="0.5"
                    value={fullDay}
                    onChange={(e) => handleFullDayChange(parseFloat(e.target.value) || 0)}
                    disabled={assignmentMode !== 'custom'}
                    className="w-full px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
                  />
                  <span className="text-xs font-semibold text-slate-500">hrs</span>
                </div>
              </div>

              <div>
                <label htmlFor="employee-half-day-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Half Day Target *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="employee-half-day-input"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={halfDay}
                    onChange={(e) => setHalfDay(parseFloat(e.target.value) || 0)}
                    disabled={assignmentMode !== 'custom'}
                    className="w-full px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
                  />
                  <span className="text-xs font-semibold text-slate-500">hrs</span>
                </div>
              </div>
            </div>

            {assignmentMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Presets:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset(8, 4)}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  8h / 4h
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(7, 3.5)}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  7h / 3.5h
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(9, 4.5)}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  9h / 4.5h
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-employee-shift-button"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
