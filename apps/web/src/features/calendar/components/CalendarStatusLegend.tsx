import React from 'react';

export const CalendarStatusLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600 shadow-2xs select-none">
      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Calendar Legend:</span>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
        <span>Approved Tasks (Green)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
        <span>Submitted Tasks (Orange)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" />
        <span>Company Holiday (Purple)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>Notes (Yellow Dot)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span>Reminders (Blue Dot)</span>
      </div>
    </div>
  );
};
