import React from 'react';
import { Clock, Coffee } from 'lucide-react';
import { DayStatusBadge } from './DayStatusBadge';
import { formatHoursMinutes } from './TickingWorkedTimer';
import type { DayDetailResponse } from '../types/attendance.types';

export interface DayDetailStatsProps {
  data: DayDetailResponse;
}

export const DayDetailStats: React.FC<DayDetailStatsProps> = ({ data }) => {
  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-slate-500 block">Attendance Status</span>
          <span className="text-base font-bold text-slate-900 block mt-0.5">
            {data.status_label}
          </span>
        </div>
        <DayStatusBadge status={data.status} label={data.status_label} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Production</span>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1">
            {formatHoursMinutes(data.production_seconds)} hrs
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span>Break</span>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1">
            {formatHoursMinutes(data.break_seconds)} hrs
          </p>
        </div>
      </div>
    </>
  );
};
