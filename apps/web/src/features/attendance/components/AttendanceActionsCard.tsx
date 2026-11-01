import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  ChevronDown,
  Coffee,
  Utensils,
  User,
  MessageSquare,
  Play,
  Square,
  Loader2,
} from 'lucide-react';
import type { TodayAttendanceData, BreakOption } from '../types/attendance.types';

export interface AttendanceActionsCardProps {
  today: TodayAttendanceData;
  isPending: boolean;
  onPunchIn: () => Promise<any>;
  onPunchOut: () => Promise<any>;
  onStartBreak: (breakType?: string, reason?: string) => Promise<any>;
  onResumeBreak: () => Promise<any>;
  errorMessage?: string | null;
  infoToast?: string | null;
  onDismissToast?: () => void;
}

const BREAK_OPTIONS: Array<{
  id: BreakOption;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'Tea Break', label: 'Tea Break', icon: Coffee },
  { id: 'Lunch Break', label: 'Lunch Break', icon: Utensils },
  { id: 'Personal Break', label: 'Personal Break', icon: User },
  { id: 'Other Break', label: 'Other Break', icon: MessageSquare },
];

export const AttendanceActionsCard: React.FC<AttendanceActionsCardProps> = ({
  today,
  isPending,
  onPunchIn,
  onPunchOut,
  onStartBreak,
  onResumeBreak,
}) => {
  const [now, setNow] = useState(new Date());
  const [isWfh, setIsWfh] = useState(false);
  const [breakDropdownOpen, setBreakDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBreakDropdownOpen(false);
      }
    }
    if (breakDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [breakDropdownOpen]);

  // Format Clock: e.g. 13:51 :59 PM
  const h24 = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

  // Format Date: e.g. Sun, Nov 1, 2026
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isWorking = today.state === 'working';
  const isOnBreak = today.state === 'on_break';

  const handleSelectBreak = (type: BreakOption) => {
    setBreakDropdownOpen(false);
    onStartBreak(type);
  };

  return (
    <div
      id="attendance-actions-card"
      className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden"
    >
      {/* Small abstract wave in top-right corner with 5% opacity */}
      <svg
        className="absolute top-0 right-0 w-44 h-32 pointer-events-none opacity-5 z-0"
        viewBox="0 0 180 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M0,0 C50,30 110,15 180,75 L180,0 Z" fill="#5B4CF8" />
        <path d="M30,0 C80,45 130,20 180,95 L180,0 Z" fill="#6C63FF" />
      </svg>

      {/* Card Header: purple Zap + title + Live Status Badge */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#5B4CF8] fill-[#5B4CF8] stroke-[#5B4CF8]" />
          <h3 className="font-semibold text-[#1E293B] text-[15px] tracking-tight">Actions</h3>
        </div>

        {isOnBreak ? (
          <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-3 py-1 rounded-full shadow-2xs">
            On Break
          </span>
        ) : isWorking ? (
          <span className="text-[11px] font-bold text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            Working
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[#3730A3] bg-[#E0E7FF] border border-[#C7D2FE] px-3 py-1 rounded-full shadow-2xs">
            Ready to Clock In
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 flex-1 relative z-10 pt-1">
        {/* Left Side: Live Digital Clock, Date, Remote Clock-In Toggle */}
        <div className="space-y-3.5">
          <div>
            <div className="flex items-baseline whitespace-nowrap tracking-tight leading-none font-mono">
              <span className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#1E293B] tracking-tight">
                {h24}:{minutes}
              </span>
              <span className="text-sm sm:text-base lg:text-lg font-bold text-[#64748B] ml-2 font-mono whitespace-nowrap">
                :{seconds} {ampm}
              </span>
            </div>
            <div className="text-xs font-medium text-[#64748B] mt-2">
              {dateFormatted}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Remote Clock-In
            </div>
            <label
              htmlFor="wfh-toggle"
              className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  id="wfh-toggle"
                  checked={isWfh}
                  onChange={(e) => setIsWfh(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                    isWfh ? 'bg-[#5B4CF8]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      isWfh ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold text-[#1E293B] group-hover:text-indigo-600 transition-colors">
                Work From Home
              </span>
            </label>
          </div>
        </div>

        {/* Right Side: Break Dropdown + Clock Out/In Button */}
        <div className="flex items-center gap-2.5 shrink-0 pb-0.5">
          {/* Break Button / Dropdown */}
          {isOnBreak ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onResumeBreak()}
              className="px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-[14px] shadow-xs btn-hover-lift transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin stroke-[1.75]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span className="whitespace-nowrap">RESUME</span>
            </button>
          ) : (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                disabled={!isWorking || isPending}
                onClick={() => setBreakDropdownOpen((prev) => !prev)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-[14px] border transition flex items-center gap-1.5 cursor-pointer btn-hover-lift whitespace-nowrap ${
                  isWorking && !isPending
                    ? 'bg-white hover:bg-[#F4F4FF] border-[#D4DCE6] text-[#1E293B] shadow-2xs'
                    : 'bg-[#F8FAFC] border-[#D4DCE6] text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className="whitespace-nowrap">BREAK</span>
                <ChevronDown className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>

              {breakDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-1.5 w-44 rounded-[14px] bg-white border border-[#D4DCE6] shadow-xl py-1.5 z-30 animate-in fade-in">
                  <div className="text-[10px] font-extrabold uppercase text-[#94A3B8] px-3 py-1">
                    Select Break
                  </div>
                  {BREAK_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectBreak(opt.id)}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:bg-[#F4F4FF] flex items-center gap-2"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#64748B] stroke-[1.75]" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Primary Clock Out / Clock In Button */}
          {isOnBreak ? (
            <button
              type="button"
              disabled
              title="You cannot clock out while on break. Please resume work first."
              className="px-5 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-[14px] cursor-not-allowed select-none whitespace-nowrap shrink-0"
            >
              <span className="whitespace-nowrap">CLOCK-OUT</span>
            </button>
          ) : isWorking ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onPunchOut()}
              className="px-5 py-2.5 bg-[#EF4444] hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-[14px] shadow-sm shadow-rose-500/20 btn-hover-lift transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[1.75]" />
              ) : (
                <Square className="w-3.5 h-3.5 fill-current" />
              )}
              <span className="whitespace-nowrap">CLOCK-OUT</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onPunchIn()}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs uppercase tracking-wider rounded-[14px] shadow-sm shadow-emerald-500/20 btn-hover-lift transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[1.75]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span className="whitespace-nowrap">CLOCK-IN</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
