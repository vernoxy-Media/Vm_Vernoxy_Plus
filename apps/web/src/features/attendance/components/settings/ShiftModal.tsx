import React, { useState, useEffect } from 'react';
import { X, Clock, Loader2, Sparkles, AlertCircle, Calendar } from 'lucide-react';
import type { AttendanceShift } from '../../types/attendance.types';
import {
  useCreateShiftMutation,
  useUpdateShiftMutation,
} from '../../hooks/use-attendance-settings';

export interface ShiftModalProps {
  shift: AttendanceShift | null; // null for creating new
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

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

export const ShiftModal: React.FC<ShiftModalProps> = ({ shift, isOpen, onClose }) => {
  const isEditing = Boolean(shift);

  const [shiftName, setShiftName] = useState(shift?.shift_name || '');
  const [shiftCode, setShiftCode] = useState(shift?.shift_code || '');
  const [startTime, setStartTime] = useState(shift?.start_time || '09:30');
  const [endTime, setEndTime] = useState(shift?.end_time || '18:30');
  const [fullDayHours, setFullDayHours] = useState<number>(shift?.full_day_hours ?? 8);
  const [halfDayHours, setHalfDayHours] = useState<number>(shift?.half_day_hours ?? 4);
  const [breakDuration, setBreakDuration] = useState<number>(shift?.break_duration_minutes ?? 60);
  const [breakType, setBreakType] = useState<string>(shift?.break_type || 'unpaid');
  const [lateGrace, setLateGrace] = useState<number>(shift?.late_arrival_grace_minutes ?? 15);
  const [earlyGrace, setEarlyGrace] = useState<number>(shift?.early_exit_grace_minutes ?? 15);
  const [weeklyOff, setWeeklyOff] = useState<number[]>(shift?.weekly_off_days || [0]);
  const [isDefault, setIsDefault] = useState<boolean>(shift?.is_default || false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateShiftMutation();
  const updateMutation = useUpdateShiftMutation();

  useEffect(() => {
    if (shift) {
      setShiftName(shift.shift_name);
      setShiftCode(shift.shift_code);
      setStartTime(shift.start_time.slice(0, 5));
      setEndTime(shift.end_time.slice(0, 5));
      setFullDayHours(Number(shift.full_day_hours));
      setHalfDayHours(Number(shift.half_day_hours));
      setBreakDuration(Number(shift.break_duration_minutes));
      setBreakType(shift.break_type || 'unpaid');
      setLateGrace(Number(shift.late_arrival_grace_minutes));
      setEarlyGrace(Number(shift.early_exit_grace_minutes));
      setWeeklyOff(Array.isArray(shift.weekly_off_days) ? shift.weekly_off_days : [0]);
      setIsDefault(Boolean(shift.is_default));
    } else {
      setShiftName('');
      setShiftCode('');
      setStartTime('09:30');
      setEndTime('18:30');
      setFullDayHours(8);
      setHalfDayHours(4);
      setBreakDuration(60);
      setBreakType('unpaid');
      setLateGrace(15);
      setEarlyGrace(15);
      setWeeklyOff([0]);
      setIsDefault(false);
    }
    setErrorMsg(null);
  }, [shift, isOpen]);

  if (!isOpen) return null;

  // AUTO CALCULATION 1: User changes full day hours -> calculate and set end time
  const handleFullDayChange = (newHours: number) => {
    setFullDayHours(newHours);
    setHalfDayHours(Math.round((newHours / 2) * 10) / 10);

    if (startTime) {
      const unpaidBreak = breakType === 'unpaid' ? breakDuration : 0;
      const totalMinutes = Math.round(newHours * 60) + unpaidBreak;
      const startMin = timeToMinutes(startTime);
      const newEndStr = minutesToTime(startMin + totalMinutes);
      setEndTime(newEndStr);
    }
  };

  // AUTO CALCULATION 2: User changes start time -> calculate and update end time preserving full day hours
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && fullDayHours > 0) {
      const unpaidBreak = breakType === 'unpaid' ? breakDuration : 0;
      const totalMinutes = Math.round(fullDayHours * 60) + unpaidBreak;
      const startMin = timeToMinutes(newStart);
      const newEndStr = minutesToTime(startMin + totalMinutes);
      setEndTime(newEndStr);
    }
  };

  // AUTO CALCULATION 3: User changes end time -> calculate full day & half day hours
  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const startMin = timeToMinutes(startTime);
      const endMin = timeToMinutes(newEnd);
      let diffMin = endMin - startMin;
      if (diffMin <= 0) diffMin += 1440; // overnight shift

      const unpaidBreak = breakType === 'unpaid' ? breakDuration : 0;
      const netWorkingMin = Math.max(0, diffMin - unpaidBreak);
      const computedFull = Math.round((netWorkingMin / 60) * 10) / 10;
      setFullDayHours(computedFull);
      setHalfDayHours(Math.round((computedFull / 2) * 10) / 10);
    }
  };

  // When break duration or break type changes -> update end time based on current full day hours
  const handleBreakChange = (newDuration: number, newType: string) => {
    setBreakDuration(newDuration);
    setBreakType(newType);
    if (startTime && fullDayHours > 0) {
      const unpaidBreak = newType === 'unpaid' ? newDuration : 0;
      const totalMinutes = Math.round(fullDayHours * 60) + unpaidBreak;
      const startMin = timeToMinutes(startTime);
      setEndTime(minutesToTime(startMin + totalMinutes));
    }
  };

  const toggleWeeklyOff = (dayId: number) => {
    if (weeklyOff.includes(dayId)) {
      setWeeklyOff(weeklyOff.filter((d) => d !== dayId));
    } else {
      setWeeklyOff([...weeklyOff, dayId].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) {
      setErrorMsg('Shift name is required.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMsg('Both start time and end time are required.');
      return;
    }
    if (fullDayHours <= 0) {
      setErrorMsg('Full day hours must be greater than zero.');
      return;
    }

    try {
      const payload: Partial<AttendanceShift> = {
        shift_name: shiftName.trim(),
        shift_code: shiftCode.trim() || undefined,
        shift_type: 'fixed',
        start_time: startTime,
        end_time: endTime,
        full_day_hours: fullDayHours,
        half_day_hours: halfDayHours,
        break_duration_minutes: breakDuration,
        break_type: breakType,
        late_arrival_grace_minutes: lateGrace,
        early_exit_grace_minutes: earlyGrace,
        weekly_off_days: weeklyOff,
        is_default: isDefault,
        is_active: true,
      };

      if (isEditing && shift) {
        await updateMutation.mutateAsync({ id: shift.shift_id, shift: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save shift.');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Shift · ${shift?.shift_name}` : 'Create New Attendance Shift'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure timing, working hour thresholds, break allowances, and default assignments.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Hours Highlight Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                  Computed Shift Targets
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Full Day: <span className="text-blue-700">{fullDayHours} hrs</span> · Half Day:{' '}
                  <span className="text-indigo-700">{halfDayHours} hrs</span>
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-blue-200 text-slate-700 shadow-2xs">
              {startTime} → {endTime}
            </span>
          </div>

          {/* Shift Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-name-input" className="block text-xs font-bold text-slate-700 mb-1">
                Shift Name *
              </label>
              <input
                type="text"
                id="shift-name-input"
                placeholder="e.g. General Shift, Morning Shift"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
            <div>
              <label htmlFor="shift-code-input" className="block text-xs font-bold text-slate-700 mb-1">
                Shift Code (Optional)
              </label>
              <input
                type="text"
                id="shift-code-input"
                placeholder="e.g. SHF-001 (auto if empty)"
                value={shiftCode}
                onChange={(e) => setShiftCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Timing & Interactive Calculation */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Shift Timing & Two-Way Calculation
              </span>
              <span className="text-[11px] text-slate-400">
                Adjusting hours updates end time; adjusting end time updates hours.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="shift-start-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  id="shift-start-time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="shift-end-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  id="shift-end-time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="shift-full-day-hours" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Day Target Hours *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="shift-full-day-hours"
                    min="1"
                    max="18"
                    step="0.5"
                    value={fullDayHours}
                    onChange={(e) => handleFullDayChange(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-xs text-slate-500 font-semibold">hrs</span>
                </div>
              </div>

              <div>
                <label htmlFor="shift-half-day-hours" className="block text-xs font-semibold text-slate-700 mb-1">
                  Half Day Target Hours *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="shift-half-day-hours"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={halfDayHours}
                    onChange={(e) => setHalfDayHours(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-xs text-slate-500 font-semibold">hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Break Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-break-duration" className="block text-xs font-semibold text-slate-700 mb-1">
                Break Duration (Minutes)
              </label>
              <input
                type="number"
                id="shift-break-duration"
                min="0"
                max="240"
                step="5"
                value={breakDuration}
                onChange={(e) => handleBreakChange(parseInt(e.target.value, 10) || 0, breakType)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label htmlFor="shift-break-type" className="block text-xs font-semibold text-slate-700 mb-1">
                Break Deduction Type
              </label>
              <select
                id="shift-break-type"
                value={breakType}
                onChange={(e) => handleBreakChange(breakDuration, e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="unpaid">Unpaid (Excluded from full day span)</option>
                <option value="paid">Paid (Included in full day span)</option>
              </select>
            </div>
          </div>

          {/* Grace Periods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-late-grace" className="block text-xs font-semibold text-slate-700 mb-1">
                Late Arrival Grace (Minutes)
              </label>
              <input
                type="number"
                id="shift-late-grace"
                min="0"
                max="120"
                value={lateGrace}
                onChange={(e) => setLateGrace(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
            <div>
              <label htmlFor="shift-early-grace" className="block text-xs font-semibold text-slate-700 mb-1">
                Early Exit Grace (Minutes)
              </label>
              <input
                type="number"
                id="shift-early-grace"
                min="0"
                max="120"
                value={earlyGrace}
                onChange={(e) => setEarlyGrace(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Weekly Off Days */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Weekly Off Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = weeklyOff.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleWeeklyOff(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-rose-50 text-rose-700 border border-rose-300'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Selected days will automatically be evaluated as Weekly Off for employees assigned to this shift.
            </p>
          </div>

          {/* Default Shift Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Set as Company Default Shift (General Shift)
                </span>
                <span className="text-[11px] text-slate-500">
                  All employees without a custom shift assignment will automatically follow this shift.
                </span>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
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
              id="submit-shift-button"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Shift'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
