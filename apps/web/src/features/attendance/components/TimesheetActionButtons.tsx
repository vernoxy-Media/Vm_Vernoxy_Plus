import React, { useState, useRef, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Utensils,
  User,
  MessageSquare,
  X,
} from 'lucide-react';
import type { TodayAttendanceData, BreakOption } from '../types/attendance.types';

export interface TimesheetActionButtonsProps {
  today: TodayAttendanceData;
  isPending: boolean;
  onPunchIn: () => Promise<any>;
  onPunchOutClick: () => void;
  onStartBreak: (breakType?: string, reason?: string) => Promise<any>;
  onResumeBreak: () => Promise<any>;
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

export const TimesheetActionButtons: React.FC<TimesheetActionButtonsProps> = ({
  today,
  isPending,
  onPunchIn,
  onPunchOutClick,
  onStartBreak,
  onResumeBreak,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOtherReasonModalOpen, setIsOtherReasonModalOpen] = useState(false);
  const [otherReason, setOtherReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const isFullDayLeave = today.special_status === 'on_leave';

  let primaryBtnLabel = 'Punch In';
  let PrimaryBtnIcon = LogIn;
  let primaryBtnClass =
    'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/25 active:scale-[0.98] border border-emerald-400/30';
  let primaryDisabled = isPending || (isFullDayLeave && today.state === 'not_started');

  if (today.state === 'working' || today.state === 'on_break') {
    primaryBtnLabel = 'Punch Out';
    PrimaryBtnIcon = LogOut;
    primaryBtnClass =
      'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-sm shadow-rose-500/25 active:scale-[0.98] border border-rose-400/30';
  } else if (today.state === 'done') {
    primaryBtnLabel = 'Done for today';
    PrimaryBtnIcon = CheckCircle2;
    primaryBtnClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
    primaryDisabled = true;
  }

  let secondaryBtnLabel = 'BREAK';
  let secondaryDisabled = isPending;
  let secondaryTooltip = '';

  if (today.state === 'not_started') {
    secondaryBtnLabel = 'BREAK';
    secondaryDisabled = true;
    secondaryTooltip = 'Punch in first';
  } else if (today.state === 'on_break') {
    const activeType = today.active_break_type ? `Resume (${today.active_break_type})` : 'Resume Work';
    secondaryBtnLabel = activeType;
  } else if (today.state === 'done') {
    secondaryBtnLabel = 'BREAK';
    secondaryDisabled = true;
  }

  const handleBreakButtonClick = () => {
    if (today.state === 'working') {
      setIsDropdownOpen((prev) => !prev);
    } else if (today.state === 'on_break') {
      onResumeBreak();
    }
  };

  const handleSelectOption = (option: BreakOption) => {
    setIsDropdownOpen(false);
    if (option === 'Other Break') {
      setOtherReason('');
      setReasonError(null);
      setIsOtherReasonModalOpen(true);
    } else {
      onStartBreak(option);
    }
  };

  const handleConfirmOtherBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherReason.trim()) {
      setReasonError('Please enter a reason for your break.');
      return;
    }
    setIsOtherReasonModalOpen(false);
    await onStartBreak('Other Break', otherReason.trim());
    setOtherReason('');
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Left / Secondary Action: BREAK or RESUME WORK */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            id={today.state === 'on_break' ? 'end-break-button' : 'start-break-button'}
            onClick={handleBreakButtonClick}
            disabled={secondaryDisabled}
            title={secondaryTooltip || undefined}
            className={`w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed cursor-pointer ${
              today.state === 'on_break'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/25 active:scale-[0.98] border border-blue-400/30'
                : today.state === 'working'
                ? 'bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-300/80 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : today.state === 'on_break' ? (
              <Play className="w-4 h-4 shrink-0 fill-current" />
            ) : null}
            <span className="uppercase">{secondaryBtnLabel}</span>
            {today.state === 'working' && !isPending && (
              <ChevronDown
                className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {/* Break Options Popover Menu */}
          {isDropdownOpen && today.state === 'working' && (
            <div
              className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.08))' }}
            >
              <div className="space-y-1">
                {BREAK_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {secondaryTooltip && (
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-md whitespace-nowrap z-10">
              {secondaryTooltip}
            </div>
          )}
        </div>

        {/* Right / Primary Action: PUNCH IN / PUNCH OUT */}
        <button
          type="button"
          id={today.state === 'not_started' ? 'punch-in-button' : 'punch-out-button'}
          onClick={today.state === 'not_started' ? onPunchIn : onPunchOutClick}
          disabled={primaryDisabled}
          className={`min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed cursor-pointer ${primaryBtnClass}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PrimaryBtnIcon className="w-4 h-4 shrink-0" />
          )}
          <span className="uppercase">{primaryBtnLabel}</span>
        </button>
      </div>

      {/* Other Break Reason Modal */}
      {isOtherReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsOtherReasonModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Other Break</h3>
                <p className="text-xs text-slate-500">Please provide a reason for taking this break</p>
              </div>
            </div>

            <form onSubmit={handleConfirmOtherBreak} className="space-y-4">
              <div>
                <label htmlFor="other-break-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="other-break-reason"
                  rows={3}
                  autoFocus
                  value={otherReason}
                  onChange={(e) => {
                    setOtherReason(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                  placeholder="e.g., Doctor appointment, Emergency bank errand..."
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                    reasonError
                      ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                  }`}
                  maxLength={255}
                />
                {reasonError ? (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{reasonError}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1 text-right">
                    {otherReason.length}/255 characters
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOtherReasonModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!otherReason.trim() || isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Start Break</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

