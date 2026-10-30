import React from 'react';

export const CalendarLegend: React.FC = () => {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 pb-2 border-t border-slate-100 text-xs text-slate-700 font-medium"
      aria-label="Attendance status legend"
    >
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
          P
        </span>
        <span className="text-slate-700 font-medium text-xs">Present</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
          A
        </span>
        <span className="text-slate-700 font-medium text-xs">Absent</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
          HD
        </span>
        <span className="text-slate-700 font-medium text-xs">Half Day</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
          L
        </span>
        <span className="text-slate-700 font-medium text-xs">On Leave</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded-full bg-slate-300 text-slate-700 font-bold text-[9px] shrink-0">
          WO
        </span>
        <span className="text-slate-700 font-medium text-xs">Weekly Off</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
          H
        </span>
        <span className="text-slate-700 font-medium text-xs">Holiday</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-orange-700 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
          MP
        </span>
        <span className="text-slate-700 font-medium text-xs">Missing Punch</span>
      </div>

      <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs ml-auto">
        <span className="text-amber-600 font-bold">LM</span>
        <span>= Late Mark</span>
      </div>
    </div>
  );
};
