import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  ShieldCheck,
  Calendar,
  Coffee,
} from 'lucide-react';
import {
  useUpdateDefaultWorkingHoursMutation,
  useSetDefaultShiftMutation,
  useDeleteShiftMutation,
} from '../../hooks/use-attendance-settings';
import type {
  WorkingHoursConfig,
  AttendanceShift,
} from '../../types/attendance.types';
import { ShiftModal } from './ShiftModal';

export interface AttendanceDefaultHoursCardProps {
  initialConfig?: WorkingHoursConfig;
  shifts?: AttendanceShift[];
  defaultShift?: AttendanceShift | null;
}

export const AttendanceDefaultHoursCard: React.FC<AttendanceDefaultHoursCardProps> = ({
  initialConfig = { full_day_hours: 8, half_day_hours: 4 },
  shifts = [],
}) => {
  const [fullDay, setFullDay] = useState<number>(initialConfig.full_day_hours || 8);
  const [halfDay, setHalfDay] = useState<number>(initialConfig.half_day_hours || 4);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Shift Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<AttendanceShift | null>(null);

  const mutation = useUpdateDefaultWorkingHoursMutation();
  const setDefaultMutation = useSetDefaultShiftMutation();
  const deleteShiftMutation = useDeleteShiftMutation();

  useEffect(() => {
    if (initialConfig) {
      setFullDay(initialConfig.full_day_hours || 8);
      setHalfDay(initialConfig.half_day_hours || 4);
    }
  }, [initialConfig]);

  const handleFullDayChange = (val: number) => {
    setFullDay(val);
    setHalfDay(Math.round((val / 2) * 10) / 10);
  };

  const applyPreset = (full: number, half: number) => {
    setFullDay(full);
    setHalfDay(half);
  };

  const handleSaveDefaultHours = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync({ full_day_hours: fullDay, half_day_hours: halfDay });
    setSuccessMsg('Default working hours updated successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSetDefaultShift = async (shift: AttendanceShift) => {
    try {
      await setDefaultMutation.mutateAsync(shift.shift_id);
      setSuccessMsg(`"${shift.shift_name}" is now the Company Default Shift.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to set default shift.');
    }
  };

  const handleDeleteShift = async (shift: AttendanceShift) => {
    if (shift.is_default) {
      alert('Cannot delete the default shift. Please designate another shift as default first.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete shift "${shift.shift_name}"?`)) {
      try {
        await deleteShiftMutation.mutateAsync(shift.shift_id);
        setSuccessMsg(`Shift "${shift.shift_name}" was deleted.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete shift.');
      }
    }
  };

  const openCreateShiftModal = () => {
    setEditingShift(null);
    setIsShiftModalOpen(true);
  };

  const openEditShiftModal = (shift: AttendanceShift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* SHIFT MANAGEMENT CARD */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Company Shifts & Working Hours</h3>
              <p className="text-xs text-slate-500">
                Define operational shift hours, break policies, and default schedules for the workforce.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="add-attendance-shift-button"
            onClick={openCreateShiftModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Shift</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Shifts List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((s) => {
            const isDef = s.is_default;
            return (
              <div
                key={s.shift_id}
                className={`p-4 rounded-xl border transition-all relative ${
                  isDef
                    ? 'border-blue-300 bg-blue-50/30 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{s.shift_name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        {s.shift_code}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 block mt-0.5">
                      {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                    </span>
                  </div>

                  {isDef ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      General Shift (Default)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultShift(s)}
                      disabled={setDefaultMutation.isPending}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      <span>Set as Default</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Target Production
                    </span>
                    <span className="font-bold text-slate-800">
                      {s.full_day_hours}h Full · {s.half_day_hours}h Half
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Break Policy
                    </span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-slate-400" />
                      {s.break_duration_minutes}m ({s.break_type})
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Grace Allowances
                    </span>
                    <span className="text-slate-600">
                      Late: {s.late_arrival_grace_minutes}m · Early: {s.early_exit_grace_minutes}m
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Weekly Off
                    </span>
                    <span className="text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {s.weekly_off_days && s.weekly_off_days.length > 0
                        ? s.weekly_off_days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
                        : 'None'}
                    </span>
                  </div>
                </div>

                {/* Shift Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditShiftModal(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    <span>Edit</span>
                  </button>

                  {!isDef && (
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(s)}
                      disabled={deleteShiftMutation.isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {shifts.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No shifts configured yet. Click "Add Shift" to create your first attendance shift.
          </div>
        )}
      </div>

      {/* QUICK FULL DAY / HALF DAY WORKING HOURS CARD */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Standard Working Hours Target</h3>
              <p className="text-xs text-slate-500">
                Adjust the company default hours threshold used across timesheets and attendance registers.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
            Full: {fullDay}h · Half: {halfDay}h
          </span>
        </div>

        <form onSubmit={handleSaveDefaultHours} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <label htmlFor="default-full-day-input" className="block text-xs font-bold text-slate-700">
                Standard Full Day Hours *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="default-full-day-input"
                  min="1"
                  max="16"
                  step="0.5"
                  value={fullDay}
                  onChange={(e) => handleFullDayChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <p className="text-[11px] text-slate-400">Production needed to be marked Present (default 8 hours).</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <label htmlFor="default-half-day-input" className="block text-xs font-bold text-slate-700">
                Standard Half Day Hours *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="default-half-day-input"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={halfDay}
                  onChange={(e) => setHalfDay(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
              <p className="text-[11px] text-slate-400">Production needed to be marked Half Day (default 4 hours).</p>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(8, 4)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100"
            >
              8h / 4h (Standard)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7, 3.5)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100"
            >
              7h / 3.5h
            </button>
            <button
              type="button"
              onClick={() => applyPreset(9, 4.5)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100"
            >
              9h / 4.5h
            </button>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              id="save-default-hours-button"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Working Hours
            </button>
          </div>
        </form>
      </div>

      {/* SHIFT MODAL */}
      <ShiftModal
        shift={editingShift}
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
        }}
      />
    </div>
  );
};
