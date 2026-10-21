import React from 'react';

export const CalendarStatusLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600 shadow-2xs select-none">
      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Attendance Status:</span>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
        <span>Present / Done (Green)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
        <span>Today (Blue)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
        <span>Holiday (Red)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs" />
        <span>Leave / Absent (Orange)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400" />
        <span>Upcoming (Grey)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-dashed border-slate-400" />
        <span>Week Off</span>
      </div>
    </div>
  );
};
