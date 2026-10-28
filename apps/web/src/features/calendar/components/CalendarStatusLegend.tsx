import React from 'react';

interface CalendarStatusLegendProps {
  mode?: 'attendance' | 'tasks' | 'all';
}

export const CalendarStatusLegend: React.FC<CalendarStatusLegendProps> = ({ mode = 'all' }) => {
  const showAttendance = mode === 'attendance' || mode === 'all';
  const showOperations = mode === 'tasks' || mode === 'all';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-600 shadow-2xs select-none">
      {showAttendance && (
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Attendance:</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-emerald-600 shadow-xs">P</span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-rose-600 shadow-xs">A</span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white bg-amber-500 shadow-xs">HD</span>
          <span>Half Day</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-blue-500 shadow-xs">L</span>
          <span>On Leave</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-slate-400 shadow-xs">WO</span>
          <span>Weekly Off</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-purple-600 shadow-xs">H</span>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white bg-orange-600 shadow-xs">MP</span>
          <span>Missing Punch</span>
        </div>
        <div className="flex items-center gap-1 text-orange-600 font-black text-[10px] pl-1">
          <span>LM = Late Mark</span>
        </div>
      </div>
      )}

      {showOperations && (
      <div className={`flex flex-wrap items-center gap-2.5 ${showAttendance ? 'border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3 pt-1.5 sm:pt-0' : ''}`}>
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Operations:</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Submitted</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Note</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Reminder</span>
        </div>
      </div>
      )}
    </div>
  );
};
