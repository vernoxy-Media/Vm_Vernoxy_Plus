import React, { useState } from 'react';
import { X, Clock, Loader2, Sparkles } from 'lucide-react';
import { useUpdateEmployeeWorkingHoursMutation } from '../../../../features/attendance/hooks/use-attendance-settings';

export interface EmployeeHoursModalProps {
  employee: {
    emp_id: number;
    name: string;
    email: string;
    currentHours?: { full_day_hours: number; half_day_hours: number };
  } | null;
  defaultHours: { full_day_hours: number; half_day_hours: number };
  onClose: () => void;
}

export const EmployeeHoursModal: React.FC<EmployeeHoursModalProps> = ({
  employee,
  defaultHours,
  onClose,
}) => {
  const [fullDay, setFullDay] = useState<number>(
    employee?.currentHours?.full_day_hours ?? defaultHours.full_day_hours ?? 8
  );
  const [halfDay, setHalfDay] = useState<number>(
    employee?.currentHours?.half_day_hours ?? defaultHours.half_day_hours ?? 4
  );

  const mutation = useUpdateEmployeeWorkingHoursMutation();

  if (!employee) return null;

  const handleFullDayChange = (val: number) => {
    setFullDay(val);
    setHalfDay(Math.round((val / 2) * 10) / 10);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync({
      empId: employee.emp_id,
      hours: { full_day_hours: fullDay, half_day_hours: halfDay },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Custom Working Hours</h3>
              <p className="text-xs text-slate-500">{employee.name} ({employee.email})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800">
            Setting full day to <span className="font-bold">{fullDay} hours</span> means this employee's target will convert to <span className="font-bold">{fullDay} hrs</span> and $\ge {fullDay}$ hours of production will mark them <span className="font-bold">Present</span>.
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="employee-full-day-input" className="block text-xs font-bold text-slate-700 mb-1">
                Full Day Hours *
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
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
            </div>

            <div>
              <label htmlFor="employee-half-day-input" className="block text-xs font-bold text-slate-700 mb-1">
                Half Day Hours *
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
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-xs font-semibold text-slate-500">Hours</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => { setFullDay(7); setHalfDay(3.5); }}
              className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
            >
              7h / 3.5h
            </button>
            <button
              type="button"
              onClick={() => { setFullDay(8); setHalfDay(4); }}
              className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
            >
              8h / 4h
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-employee-hours-submit-button"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Hours
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
