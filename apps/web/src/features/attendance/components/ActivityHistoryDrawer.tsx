import React, { useEffect } from 'react';
import {
  X,
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Calendar,
} from 'lucide-react';
import type { TimelineEvent } from '../types/attendance.types';

export interface ActivityHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: TimelineEvent[];
  selectedDate?: string;
  isSelectedToday?: boolean;
}

export const ActivityHistoryDrawer: React.FC<ActivityHistoryDrawerProps> = ({
  isOpen,
  onClose,
  timeline,
  selectedDate,
  isSelectedToday = true,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dateObj = selectedDate ? new Date(`${selectedDate}T00:00:00Z`) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {isSelectedToday ? "Today's Activity Log" : 'Activity Log'}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close activity log"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timeline Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            {timeline.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No Activity Recorded</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                  {isSelectedToday
                    ? 'Activity entries will appear here as you punch in, start breaks, and punch out.'
                    : 'No timestamps or breaks recorded for this date.'}
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6">
                {/* Connecting Line */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200 -translate-x-1/2 rounded-full" />

                {timeline.map((event, idx) => {
                  let Icon = Clock;
                  let iconBg = 'bg-slate-100 text-slate-600';

                  if (event.type === 'punch_in') {
                    Icon = LogIn;
                    iconBg = 'bg-emerald-50 text-emerald-600';
                  } else if (event.type === 'break_start') {
                    Icon = Coffee;
                    iconBg = 'bg-rose-50 text-rose-600';
                  } else if (event.type === 'break_end') {
                    Icon = Play;
                    iconBg = 'bg-blue-50 text-blue-600';
                  } else if (event.type === 'punch_out') {
                    Icon = LogOut;
                    iconBg = 'bg-rose-50 text-rose-600';
                  }

                  return (
                    <div key={event.id || idx} className="relative flex items-start gap-4">
                      {/* Node circle */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${iconBg} shadow-2xs -ml-2.5 z-10`}
                      >
                        <Icon className="w-3 h-3 stroke-[2.5]" />
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 tracking-tight">
                            {event.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 font-mono">
                            {event.display_time}
                          </span>
                        </div>
                        {(event.break_type || event.reason) && (
                          <div className="mt-1 pt-1 border-t border-slate-200/60 text-xs text-slate-600 flex flex-wrap items-center gap-1.5">
                            {event.break_type && (
                              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-xs">
                                {event.break_type}
                              </span>
                            )}
                            {event.reason && (
                              <span className="text-slate-500 italic">
                                &ldquo;{event.reason}&rdquo;
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
