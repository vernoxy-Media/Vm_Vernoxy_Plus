import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useUpdateDefaultWorkingHoursMutation } from '../../../../features/attendance/hooks/use-attendance-settings';
import type { WorkingHoursConfig } from '../../../../features/attendance/types/attendance.types';

export interface AttendanceDefaultHoursCardProps {
  initialConfig?: WorkingHoursConfig;
}

export const AttendanceDefaultHoursCard: React.FC<AttendanceDefaultHoursCardProps> = ({
  initialConfig = { full_day_hours: 8, half_day_hours: 4 },
}) => {
  const [fullDay, setFullDay] = useState<number>(initialConfig.full_day_hours || 8);
  const [halfDay, setHalfDay] = useState<number>(initialConfig.half_day_hours || 4);
  const [successMsg, setSuccessMsg] = useState(false);

  const mutation = useUpdateDefaultWorkingHoursMutation();

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync({ full_day_hours: fullDay, half_day_hours: halfDay });
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Company Default Working Hours</h3>
            <p className="text-xs text-slate-500">
              Set standard full-day and half-day durations for employees without individual customizations.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
          Full: {fullDay}h · Half: {halfDay}h
        </span>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Default working hours updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
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
            Save Default Hours
          </button>
        </div>
      </form>
    </div>
  );
};
