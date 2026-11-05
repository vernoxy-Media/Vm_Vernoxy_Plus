import React from 'react';
import { Info, AlertCircle } from 'lucide-react';
import type { TodayAttendanceData } from '../types/attendance.types';

const LEAVE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatLeaveDate(s: string): string {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${LEAVE_MONTHS[m - 1]} ${y}`;
}

export interface TimesheetStatusBannersProps {
  today: TodayAttendanceData;
  errorMessage?: string | null;
  infoToast?: string | null;
  onDismissToast?: () => void;
}

export const TimesheetStatusBanners: React.FC<TimesheetStatusBannersProps> = ({
  today,
  errorMessage,
  infoToast,
  onDismissToast,
}) => {
  const isFullDayLeave = today.special_status === 'on_leave';
  const isHoliday = today.special_status === 'holiday';
  const isWeeklyOff = today.special_status === 'weekly_off';

  return (
    <>
      {infoToast && (
        <div
          role="status"
          className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2 text-xs font-semibold text-blue-800 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{infoToast}</span>
          </div>
          {onDismissToast && (
            <button
              type="button"
              onClick={onDismissToast}
              className="text-blue-500 hover:text-blue-700 font-bold px-1.5 py-0.5 rounded"
            >
              ×
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-800 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {today.leave_info && (
        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {today.leave_info.part === 'full'
                ? 'On Leave'
                : today.leave_info.half === 'FIRST_HALF'
                ? 'On Leave: First Half'
                : 'On Leave: Second Half'}
            </p>
            <p className="mt-0.5">
              You are on approved leave today: <strong>{today.leave_info.type_name}</strong>
              {today.leave_info.from_date && today.leave_info.to_date
                ? `, ${formatLeaveDate(today.leave_info.from_date)}${
                    today.leave_info.to_date !== today.leave_info.from_date ? ` – ${formatLeaveDate(today.leave_info.to_date)}` : ''
                  }`
                : ''}
              {today.leave_info.request_no ? ` (${today.leave_info.request_no})` : ''}
              {today.leave_info.approved_by ? `, approved by ${today.leave_info.approved_by}` : ''}.
            </p>
            <p className="text-blue-700 mt-0.5">
              {today.leave_info.part === 'full'
                ? 'Check-in is not available on a full day of approved leave. If you need to work today, ask the Admin to cancel the leave first.'
                : today.leave_info.check_in_message}
            </p>
          </div>
        </div>
      )}

      {today.pending_leave_note && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{today.pending_leave_note}</span>
        </div>
      )}

      {today.special_status && !(isFullDayLeave && today.leave_info) && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {today.special_status_reason ||
                (isFullDayLeave
                  ? 'On Leave Today'
                  : isHoliday
                  ? 'Company Holiday'
                  : isWeeklyOff
                  ? 'Weekly Off'
                  : 'Special Schedule')}
            </p>
            <p className="text-amber-700 mt-0.5">
              {isFullDayLeave
                ? 'Punch in is disabled during approved leave.'
                : 'Punch in enabled if working overtime or on scheduled off.'}
            </p>
          </div>
        </div>
      )}

      {today.state === 'done' && (
        <div
          id="timesheet-completed-banner"
          role="status"
          className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in"
        >
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Workday complete for today. All sessions logged.</span>
        </div>
      )}
    </>
  );
};
