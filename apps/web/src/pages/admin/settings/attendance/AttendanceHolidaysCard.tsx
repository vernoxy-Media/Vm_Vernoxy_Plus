import React, { useState } from 'react';
import { Palmtree, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import {
  useAddHolidayMutation,
  useDeleteHolidayMutation,
} from '../../../../features/attendance/hooks/use-attendance-settings';
import type { AttendanceHoliday } from '../../../../features/attendance/types/attendance.types';

export interface AttendanceHolidaysCardProps {
  holidays: AttendanceHoliday[];
}

export const AttendanceHolidaysCard: React.FC<AttendanceHolidaysCardProps> = ({ holidays = [] }) => {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMutation = useAddHolidayMutation();
  const deleteMutation = useDeleteHolidayMutation();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name.trim()) {
      setError('Date and holiday name are required.');
      return;
    }
    setError(null);
    try {
      await addMutation.mutateAsync({ date, name: name.trim() });
      setDate('');
      setName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add holiday.');
    }
  };

  const handleDelete = async (id: string, hName: string) => {
    if (window.confirm(`Are you sure you want to remove the holiday "${hName}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Palmtree className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Official Company Holidays</h3>
            <p className="text-xs text-slate-500">
              Declare public and regional holidays. Attendance target for these dates is 0 hours.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
          {holidays.length} {holidays.length === 1 ? 'Holiday' : 'Holidays'}
        </span>
      </div>

      {/* Add Holiday Form */}
      <form onSubmit={handleAdd} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <span className="text-xs font-bold text-slate-700 block">Add New Holiday</span>
        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative sm:w-44">
            <input
              type="date"
              id="holiday-date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              id="holiday-name-input"
              placeholder="e.g. Diwali, Independence Day, Christmas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            id="add-holiday-submit-button"
            disabled={addMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors shrink-0"
          >
            {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Holiday
          </button>
        </div>
      </form>

      {/* Holidays List Table */}
      {holidays.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
          No holidays declared yet. Use the form above to add holidays.
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-56 rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs" id="holidays-table">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Holiday Name</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holidays.map((h) => {
                const dObj = new Date(h.date + 'T00:00:00Z');
                const display = dObj.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  weekday: 'short',
                  timeZone: 'UTC',
                });

                return (
                  <tr key={h.id || h.date} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {display}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">{h.name}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(h.id, h.name)}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
