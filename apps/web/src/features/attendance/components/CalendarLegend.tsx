import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarOff,
  Sun,
  Coffee,
  XCircle,
} from 'lucide-react';

export const CalendarLegend: React.FC = () => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-100 text-xs font-semibold"
      aria-label="Attendance status legend"
    >
      <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">
        Legend:
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Present
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3" /> Half Day
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200">
        <Clock className="w-3 h-3" /> Short
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3 h-3" /> Incomplete
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 border border-violet-200">
        <CalendarOff className="w-3 h-3" /> Leave
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-300">
        <Sun className="w-3 h-3" /> Holiday
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
        <Coffee className="w-3 h-3" /> Off
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200">
        <XCircle className="w-3 h-3" /> Absent
      </span>
    </div>
  );
};
