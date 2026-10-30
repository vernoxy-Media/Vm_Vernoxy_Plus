import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useWeekStart } from '@/features/attendance/hooks/use-week-start';
import type { WeekStartDay } from '@/features/attendance/types/attendance.types';

export const SettingsHrPolicySection: React.FC = () => {
  const [weekStart, setWeekStart] = useWeekStart();
  const [selectedWeekStart, setSelectedWeekStart] = useState<WeekStartDay>(weekStart);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setWeekStart(selectedWeekStart);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">HR Policy Settings</h2>
      </div>

      {isSaved && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>HR Policy settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Calendar & Schedule Rules</h3>
          </div>

          <div>
            <label
              htmlFor="week-starts-on-select"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Week starts on *
            </label>
            <select
              id="week-starts-on-select"
              value={selectedWeekStart}
              onChange={(e) => setSelectedWeekStart(e.target.value as WeekStartDay)}
              className="w-full max-w-sm appearance-none px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="monday">Monday (ISO standard)</option>
              <option value="sunday">Sunday (US / Traditional)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              Determines the first day displayed in attendance calendars, timesheet views, and weekly summary calculations.
            </p>
          </div>
        </div>

        {/* Informative guidelines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Standard Daily Target</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">8.00 Hours / Day</p>
            <p className="text-xs text-slate-500">
              Target production time for full-time employees before overtime calculations.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Standard Break Allowance</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">60 Minutes / Day</p>
            <p className="text-xs text-slate-500">
              Standard lunch and personal pause duration allotted during daily shifts.
            </p>
          </div>
        </div>

        {/* Direct link to Attendance Settings */}
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-blue-900 block">Attendance & Working Hours Settings</span>
            <span className="text-xs text-blue-700">
              Customize company working/off days, declare holidays, and adjust employee working hour targets.
            </span>
          </div>
          <Link
            to="/admin/attendance-settings"
            id="hr-policy-go-to-attendance-settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shrink-0 transition-colors"
          >
            <span>Open Attendance Settings Tab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div>
          <button
            type="submit"
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
