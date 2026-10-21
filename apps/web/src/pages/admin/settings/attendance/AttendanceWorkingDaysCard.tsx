import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { useUpdateWorkingDaysMutation } from '../../../../features/attendance/hooks/use-attendance-settings';
import type { AttendanceHoliday } from '../../../../features/attendance/types/attendance.types';

const DAYS_OF_WEEK = [
  { dow: 1, label: 'Monday', short: 'Mon' },
  { dow: 2, label: 'Tuesday', short: 'Tue' },
  { dow: 3, label: 'Wednesday', short: 'Wed' },
  { dow: 4, label: 'Thursday', short: 'Thu' },
  { dow: 5, label: 'Friday', short: 'Fri' },
  { dow: 6, label: 'Saturday', short: 'Sat' },
  { dow: 0, label: 'Sunday', short: 'Sun' },
];

function getWeekDateInfo(dow: number) {
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const offset = dow === 0 ? 6 : dow - 1;
  const target = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset);

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const formatted = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { formatted, dateStr };
}

export interface AttendanceWorkingDaysCardProps {
  initialWorkingDays?: number[];
  holidays?: AttendanceHoliday[];
}

export const AttendanceWorkingDaysCard: React.FC<AttendanceWorkingDaysCardProps> = ({
  initialWorkingDays = [1, 2, 3, 4, 5, 6],
  holidays = [],
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

  // Find holidays that occur during this current week
  const weekDaysInfo = DAYS_OF_WEEK.map((d) => {
    const { formatted, dateStr } = getWeekDateInfo(d.dow);
    const holiday = holidays.find((h) => h.date === dateStr);
    const isWorking = selectedDays.includes(d.dow);
    return {
      ...d,
      formatted,
      dateStr,
      holiday,
      isWorking,
    };
  });

  const holidaysInCurrentWeek = weekDaysInfo.filter((d) => Boolean(d.holiday));

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
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {holidaysInCurrentWeek.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {holidaysInCurrentWeek.length} Holiday this week
            </span>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            {selectedDays.length} Working Days
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Working days schedule updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {weekDaysInfo.map((day) => {
            const isHoliday = Boolean(day.holiday);

            let cardClasses = 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60';
            if (isHoliday) {
              cardClasses = 'border-rose-300 bg-rose-50/50 shadow-xs';
            } else if (day.isWorking) {
              cardClasses = 'border-blue-500/80 bg-blue-50/50 shadow-xs';
            }

            return (
              <button
                type="button"
                key={day.dow}
                id={`working-day-toggle-${day.short.toLowerCase()}`}
                title={isHoliday ? `${day.label}: Holiday (${day.holiday?.name})` : day.label}
                onClick={() => toggleDay(day.dow)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[105px] ${cardClasses}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isHoliday ? 'text-rose-700' : 'text-slate-800'
                    }`}
                  >
                    {day.short}
                  </span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                      isHoliday
                        ? 'bg-rose-500 border-rose-500'
                        : day.isWorking
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {(day.isWorking || isHoliday) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                <div className="space-y-1 mt-2">
                  <span
                    className={`text-xs font-semibold block ${
                      isHoliday ? 'text-rose-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    {day.formatted}
                  </span>
                  {isHoliday ? (
                    <span
                      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 truncate max-w-full"
                      title={day.holiday?.name}
                    >
                      Holiday: {day.holiday?.name}
                    </span>
                  ) : (
                    <span
                      className={`inline-block text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                        day.isWorking
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {day.isWorking ? 'Working' : 'Work Off'}
                    </span>
                  )}
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
