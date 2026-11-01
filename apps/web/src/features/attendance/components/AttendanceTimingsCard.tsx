import React from 'react';
import { Clock } from 'lucide-react';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface AttendanceTimingsCardProps {
  todayWorkedSeconds: number;
  todayTargetSeconds?: number;
  shiftStart?: string;
  shiftEnd?: string;
  isOnBreak?: boolean;
}

export const AttendanceTimingsCard: React.FC<AttendanceTimingsCardProps> = ({
  todayWorkedSeconds,
  todayTargetSeconds = 28800, // 8h standard
  shiftStart = '09:00 AM',
  shiftEnd = '05:30 PM',
  isOnBreak = false,
}) => {
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayDayIndex = new Date().getDay(); // 0 is Sun, 6 is Sat

  const durationFormatted = formatHoursMinutes(todayWorkedSeconds).replace(':', 'h ') + 'm';
  const goalFormatted = (todayTargetSeconds / 3600).toFixed(2) + ' hrs';
  const progressPct = todayTargetSeconds > 0 ? (todayWorkedSeconds / todayTargetSeconds) * 100 : 0;
  const barColor = isOnBreak
    ? 'bg-amber-500'
    : 'bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF]';

  return (
    <div
      id="attendance-timings-card"
      className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 flex flex-col justify-between"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#5B4CF8] stroke-[1.75]" />
        <h3 className="font-semibold text-[#1E293B] text-[15px] tracking-tight">Timings</h3>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-between">
        {/* Days of week circular bubbles: S M T W T F S */}
        <div className="flex items-center justify-between px-1 pt-1">
          {daysOfWeek.map((day, idx) => {
            const isToday = todayDayIndex === idx;
            return (
              <div
                key={idx}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                  isToday
                    ? 'bg-gradient-to-br from-[#5B4CF8] to-[#6C63FF] text-white shadow-sm shadow-indigo-500/25 scale-105'
                    : 'bg-[#F8FAFC] border border-[#D4DCE6] text-[#64748B]'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Shift Title and Progress bar */}
        <div className="space-y-3 pt-2">
          <div className="text-sm sm:text-base font-semibold text-[#1E293B] flex items-center justify-between">
            <span>Shift ({shiftStart} – {shiftEnd})</span>
            {isOnBreak && (
              <span className="text-xs font-bold text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
                On Break
              </span>
            )}
          </div>

          {/* Progress Track */}
          <div className="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden">
            <div
              className={`${barColor} h-full rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>

          {/* Progress labels with enlarged timing numbers */}
          <div className="flex items-baseline justify-between pt-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-[#64748B]">Duration:</span>
              <span className="text-base sm:text-lg font-bold font-mono text-[#1E293B]">{durationFormatted}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-[#64748B]">Goal:</span>
              <span className="text-base sm:text-lg font-bold font-mono text-[#1E293B]">{goalFormatted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
