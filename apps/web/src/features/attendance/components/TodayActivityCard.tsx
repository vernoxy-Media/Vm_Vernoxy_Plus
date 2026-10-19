import React from 'react';
import { Clock } from 'lucide-react';
import type { TimelineEvent, AttendanceState } from '../types/attendance.types';

export interface TodayActivityCardProps {
  timeline: TimelineEvent[];
  state: AttendanceState;
  activeBreakStart?: string | null;
}

export const TodayActivityCard: React.FC<TodayActivityCardProps> = ({
  timeline,
  state,
  activeBreakStart,
}) => {
  const activeBreakTime = activeBreakStart
    ? new Date(activeBreakStart).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      <div>
        {/* Card Header: Title in blue */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-blue-600 tracking-tight">Today Activity</h2>
          <span className="text-xs font-semibold text-slate-500">Live Timeline</span>
        </div>

        {/* Content */}
        {timeline.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No activity yet today</p>
            <p className="text-xs text-slate-400 mt-1">
              Events will appear as you punch in and take breaks.
            </p>
          </div>
        ) : (
          <div className="mt-5 relative pl-6">
            {/* Vertical Line connecting hollow markers */}
            <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200 -translate-x-1/2" />

            <div className="space-y-4">
              {timeline.map((event) => {
                const isPunchIn = event.type === 'punch_in';
                const isPunchOut = event.type === 'punch_out';
                const isBreak = event.type === 'break_start';
                const isResume = event.type === 'break_end';

                let markerColor = 'border-emerald-500';
                if (isPunchOut) markerColor = 'border-rose-500';
                else if (isBreak) markerColor = 'border-amber-500';
                else if (isResume) markerColor = 'border-blue-500';

                return (
                  <div key={event.id} className="relative flex items-start gap-4 group">
                    {/* Hollow circle marker as in mockup */}
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${markerColor} bg-white ring-4 ring-white shrink-0`}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {isPunchIn
                          ? 'Punch In at'
                          : isPunchOut
                          ? 'Punch Out at'
                          : isBreak
                          ? 'Break started at'
                          : 'Resumed at'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-sm font-bold text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.display_time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Active Open Break Indicator */}
              {state === 'on_break' && activeBreakTime && (
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-amber-500 bg-amber-100 animate-pulse ring-4 ring-white shrink-0" />
                  <div className="flex-1 min-w-0 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5">
                    <p className="text-xs font-bold text-amber-900">
                      On break since {activeBreakTime}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Production timer is paused while you are on break.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 mt-6 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Recorded events: {timeline.length}</span>
        <span className="font-semibold text-emerald-600">
          {state === 'working' ? '● Currently Working' : state === 'on_break' ? '● On Break' : ''}
        </span>
      </div>
    </div>
  );
};
