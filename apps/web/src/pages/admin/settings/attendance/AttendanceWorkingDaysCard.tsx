import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { useUpdateWorkingDaysMutation } from '../../../../features/attendance/hooks/use-attendance-settings';

const DAYS_OF_WEEK = [
  { dow: 1, label: 'Monday', short: 'Mon' },
  { dow: 2, label: 'Tuesday', short: 'Tue' },
  { dow: 3, label: 'Wednesday', short: 'Wed' },
  { dow: 4, label: 'Thursday', short: 'Thu' },
  { dow: 5, label: 'Friday', short: 'Fri' },
  { dow: 6, label: 'Saturday', short: 'Sat' },
  { dow: 0, label: 'Sunday', short: 'Sun' },
];

function getWeekDate(dow: number): string {
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const offset = dow === 0 ? 6 : dow - 1;
  const target = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset);
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface AttendanceWorkingDaysCardProps {
  initialWorkingDays?: number[];
}

export const AttendanceWorkingDaysCard: React.FC<AttendanceWorkingDaysCardProps> = ({
  initialWorkingDays = [1, 2, 3, 4, 5, 6],
}) => {
  const [selectedDays, setSelectedDays] = useState<number[]>(initialWorkingDays);
  const [successMsg, setSuccessMsg] = useState(false);
  const mutation = useUpdateWorkingDaysMutation();

  useEffect(() => {
    if (initialWorkingDays) setSelectedDays(initialWorkingDays);
  }, [initialWorkingDays]);

  const toggleDay = (dow: number) => {
    setSelectedDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync(selectedDays);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Working & Work Off Days</h3>
            <p className="text-xs text-slate-500">
              Select standard company operational days. Days not selected are treated as Weekly Offs.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 self-start sm:self-auto">
          {selectedDays.length} Working Days
        </span>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Working days schedule updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {DAYS_OF_WEEK.map((day) => {
            const isWorking = selectedDays.includes(day.dow);
            return (
              <button
                type="button"
                key={day.dow}
                id={`working-day-toggle-${day.short.toLowerCase()}`}
                title={day.label}
                onClick={() => toggleDay(day.dow)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-24 ${
                  isWorking
                    ? 'border-blue-500/80 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-800">{day.short}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                      isWorking ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isWorking && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    {getWeekDate(day.dow)}
                  </span>
                  <span
                    className={`inline-block mt-1 text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                      isWorking
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {isWorking ? 'Working' : 'Work Off'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            id="save-working-days-button"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Working Days
          </button>
        </div>
      </form>
    </div>
  );
};
