import React from 'react';
import { formatHoursMinutes } from './TickingWorkedTimer';
import type { DayDetailResponse } from '../types/attendance.types';

export interface DayDetailTimelineProps {
  timeline: DayDetailResponse['timeline'];
  breaks: DayDetailResponse['breaks'];
}

export const DayDetailTimeline: React.FC<DayDetailTimelineProps> = ({
  timeline,
  breaks,
}) => {
  return (
    <>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Day Activity Timeline
        </h3>
        {timeline.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No punch events logged on this day.</p>
        ) : (
          <div className="relative pl-5 space-y-4">
            <div className="absolute left-2 top-2.5 bottom-2.5 w-0.5 bg-slate-200" />
            {timeline.map((evt) => (
              <div key={evt.id} className="relative flex items-start gap-3">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-white ring-2 ring-white shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{evt.label}</p>
                  <span className="text-[11px] text-slate-400">{evt.display_time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {breaks && breaks.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Break Intervals
          </h3>
          <div className="space-y-2">
            {breaks.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <span className="font-semibold text-slate-700">
                  {b.start} — {b.end || 'In progress'}
                </span>
                <span className="font-bold text-amber-700">
                  {formatHoursMinutes(b.duration_seconds)} hrs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
