import React from 'react';
import { Clock, Activity, LogIn, LogOut, Coffee, Play } from 'lucide-react';
import type { TimelineEvent, AttendanceState } from '../types/attendance.types';

export interface TodayActivityCardProps {
  timeline: TimelineEvent[];
  state: AttendanceState;
  activeBreakStart?: string | null;
  activeBreakType?: string | null;
  activeBreakReason?: string | null;
  selectedDate?: string;
  isSelectedToday?: boolean;
  statusLabel?: string;
}

export const TodayActivityCard: React.FC<TodayActivityCardProps> = ({
  timeline,
  state,
  activeBreakStart,
  activeBreakType,
  activeBreakReason,
  selectedDate,
  isSelectedToday = true,
  statusLabel,
}) => {
  const activeBreakTime = activeBreakStart
    ? new Date(activeBreakStart).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const dateObj = selectedDate ? new Date(`${selectedDate}T00:00:00Z`) : new Date();
  const formattedSelectedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div id="today-activity-card" className="bg-white rounded-2xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {isSelectedToday ? "Today's Activity" : `Activity • ${formattedSelectedDate}`}
              </h2>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50/70 text-indigo-700 border border-indigo-200/60">
            {isSelectedToday ? 'Live Stream' : (statusLabel || 'Daily Log')}
          </span>
        </div>

        {/* Content */}
        {timeline.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-300">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {isSelectedToday ? 'No activity yet today' : 'No activity recorded for this day'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
              {isSelectedToday
                ? 'Events will record as you clock in, take breaks, and resume.'
                : statusLabel
                ? `Status: ${statusLabel}`
                : 'No punch in or punch out timestamps logged.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 relative pl-7">
            {/* Smooth vertical connecting line */}
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 to-slate-200 -translate-x-1/2 rounded-full" />

            <div className="space-y-4">
              {timeline.map((event) => {
                const isPunchIn = event.type === 'punch_in';
                const isPunchOut = event.type === 'punch_out';
                const isBreak = event.type === 'break_start';
                const isResume = event.type === 'break_end';

                const effectiveBreakType =
                  event.break_type ||
                  (event.label?.toLowerCase().includes('tea break') ? 'Tea Break' :
                   event.label?.toLowerCase().includes('lunch break') ? 'Lunch Break' :
                   event.label?.toLowerCase().includes('personal break') ? 'Personal Break' :
                   event.label?.toLowerCase().includes('other break') ? 'Other Break' : null);

                const effectiveReason =
                  event.reason ||
                  (event.label?.includes('(') && event.label.includes(')')
                    ? event.label.substring(event.label.indexOf('(') + 1, event.label.lastIndexOf(')'))
                    : null);

                const displayBreakName =
                  effectiveBreakType === 'Other Break' && effectiveReason
                    ? (effectiveReason.toLowerCase().includes('break') ? effectiveReason : `${effectiveReason} Break`)
                    : effectiveBreakType;

                let NodeIcon = Clock;
                let nodeStyle = 'bg-slate-100 text-slate-600 border-slate-300';
                let title = 'Activity';

                if (isPunchIn) {
                  NodeIcon = LogIn;
                  nodeStyle = 'bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-500/20';
                  title = 'Punched In';
                } else if (isPunchOut) {
                  NodeIcon = LogOut;
                  nodeStyle = 'bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-500/20';
                  title = 'Punched Out';
                } else if (isBreak) {
                  NodeIcon = Coffee;
                  nodeStyle = 'bg-amber-50 text-amber-600 border-amber-300 ring-2 ring-amber-500/20';
                  title = displayBreakName ? `${displayBreakName} Started` : 'Break Started';
                } else if (isResume) {
                  NodeIcon = Play;
                  nodeStyle = 'bg-blue-50 text-blue-600 border-blue-300 ring-2 ring-blue-500/20';
                  title = displayBreakName ? `Resumed from ${displayBreakName}` : 'Resumed Work';
                }

                return (
                  <div key={event.id} className="relative flex items-center justify-between group">
                    {/* Modern icon node */}
                    <div
                      className={`absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border flex items-center justify-center bg-white shadow-xs ${nodeStyle} shrink-0 transition-transform group-hover:scale-110`}
                    >
                      <NodeIcon className="w-3 h-3" />
                    </div>

                    <div className="flex-1 min-w-0 pl-2">
                      <p className="text-xs font-bold text-slate-800 tracking-tight">
                        {title}
                      </p>
                      {effectiveReason ? (
                        <span className="text-[11px] font-medium text-amber-700 block truncate" title={effectiveReason}>
                          {effectiveBreakType === 'Other Break' ? `Other Break • Reason: ${effectiveReason}` : `Reason: ${effectiveReason}`}
                        </span>
                      ) : effectiveBreakType ? (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {effectiveBreakType}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          Recorded system event
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-bold font-mono text-slate-800 shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{event.display_time}</span>
                    </div>
                  </div>
                );
              })}

              {/* Active Open Break Indicator */}
              {state === 'on_break' && activeBreakTime && (
                <div className="relative flex items-start pt-1">
                  <div className="absolute -left-7 top-3 w-6 h-6 rounded-full border border-amber-400 bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs ring-4 ring-amber-500/10 shrink-0 animate-pulse">
                    <Coffee className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0 pl-2 bg-gradient-to-r from-amber-50/90 to-orange-50/50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-amber-900">
                        {activeBreakType ? `${activeBreakType} in progress` : 'Break in progress'}
                      </p>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        Since {activeBreakTime}
                      </span>
                    </div>
                    {activeBreakReason && (
                      <p className="text-[11px] text-amber-800 mt-0.5 font-medium italic">
                        Reason: {activeBreakReason}
                      </p>
                    )}
                    <p className="text-[11px] text-amber-800 mt-1">
                      Production clock paused. Click Resume when you return.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 mt-6 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span className="font-semibold text-slate-500">
          Total Events: <strong className="text-slate-800">{timeline.length}</strong>
        </span>
        <div>
          {state === 'working' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Currently Working
            </span>
          ) : state === 'on_break' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              On Break
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Off Shift
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
