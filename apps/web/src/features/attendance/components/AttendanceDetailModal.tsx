import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useDayDetail } from '../hooks/use-attendance';
import type { DayRecord } from '../types/attendance.types';
import {
  calculateLateByMinutes,
  calculateEarlyExitMinutes,
} from '../utils/attendance-detail.utils';

export interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null; // "YYYY-MM-DD"
  record?: DayRecord | null;
  employeeInfo?: {
    empId?: string | number;
    name?: string;
    department?: string;
    role?: string;
    location?: string;
  };
  onRegularize?: (date: string) => void;
}

export { calculateLateByMinutes, calculateEarlyExitMinutes };

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  date,
  record,
  employeeInfo,
  onRegularize,
}) => {
  const { user } = useAuth();
  const { data: dayDetail } = useDayDetail(isOpen && date ? date : null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (!isOpen || !date) return null;

  // 1. Employee ID
  const employeeId =
    (dayDetail as any)?.employee_id ||
    (record as any)?.employee_code ||
    (employeeInfo?.empId ? `EMP-${String(employeeInfo.empId).padStart(4, '0')}` : null) ||
    `EMP-${String(user?.emp_id || 15).padStart(4, '0')}`;

  // 2. Employee Name
  const employeeName =
    (dayDetail as any)?.employee_name ||
    employeeInfo?.name ||
    user?.name ||
    'Priya Shah';

  // 3. Department
  const departmentName =
    (dayDetail as any)?.department ||
    employeeInfo?.department ||
    (user as any)?.department?.department_name ||
    (user as any)?.dep_name ||
    'Finance';

  // 4. Attendance Date formatted (e.g. 15 Oct 2026)
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const attendanceDateFormatted = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // 5. Shift: Shift name and timing that applied on that date
  const shiftDisplay =
    (dayDetail as any)?.shift ||
    (record as any)?.shift_name ||
    'General - 09:30 - 18:30';

  // 6. Check-in Time
  const punchInRaw = dayDetail?.punched_in_at || record?.punch_in;
  let checkInTime = '--';
  if (punchInRaw) {
    if (punchInRaw.includes('T')) {
      checkInTime = new Date(punchInRaw).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      checkInTime = punchInRaw;
    }
  }

  // 7. Check-out Time
  const punchOutRaw = dayDetail?.punched_out_at || record?.punch_out;
  let checkOutTime = '--';
  if (punchOutRaw) {
    if (punchOutRaw.includes('T')) {
      checkOutTime = new Date(punchOutRaw).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      checkOutTime = punchOutRaw;
    }
  }

  // 8. Working Hours (hh:mm)
  const prodSecs = dayDetail?.production_seconds ?? record?.production_seconds ?? 0;
  const prodHours = Math.floor(prodSecs / 3600);
  const prodMins = Math.floor((prodSecs % 3600) / 60);
  const workingHoursDisplay =
    prodSecs > 0 ? `${String(prodHours).padStart(2, '0')}:${String(prodMins).padStart(2, '0')}` : '--';

  // 9. Late By (Number, minutes - shown only when check-in is after grace period, else 0 min)
  const lateByMinutes = calculateLateByMinutes(checkInTime);
  const lateByDisplay = `${lateByMinutes} min`;

  // 10. Early Exit By (Number, minutes - 0 when not early)
  const earlyExitMinutes = calculateEarlyExitMinutes(checkOutTime);
  const earlyExitDisplay = `${earlyExitMinutes} min`;

  // 11. Status: with Late or Early Exit shown beside it
  const isHoliday = Boolean(record?.status === 'holiday' || (dayDetail as any)?.holiday || record?.holiday_name);
  const isWeeklyOff = Boolean(record?.status === 'weekly_off' || (!punchInRaw && (dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6)));
  const isLeave = Boolean(record?.status === 'leave' || (dayDetail as any)?.leave || record?.leave_type);
  const isMissingPunch = !record?.is_today && date < todayStr && Boolean(checkInTime !== '--' && checkOutTime === '--');

  let statusDisplay = 'Present';
  if (isHoliday) {
    statusDisplay = `Holiday (${record?.holiday_name || 'Company Holiday'})`;
  } else if (isWeeklyOff) {
    statusDisplay = 'Weekly Off';
  } else if (isLeave) {
    statusDisplay = `On Leave · ${record?.leave_type || 'Approved'}`;
  } else if (isMissingPunch) {
    statusDisplay = 'Missing Punch';
  } else if (record?.status === 'half_day' || dayDetail?.status === 'half_day') {
    statusDisplay = 'Half Day';
  } else if (record?.status === 'absent' || (!punchInRaw && date < todayStr)) {
    statusDisplay = 'Absent';
  } else if (checkInTime !== '--') {
    if (lateByMinutes > 0 && earlyExitMinutes > 0) {
      statusDisplay = 'Present · Late · Early Exit';
    } else if (lateByMinutes > 0) {
      statusDisplay = 'Present · Late';
    } else if (earlyExitMinutes > 0) {
      statusDisplay = 'Present · Early Exit';
    } else {
      statusDisplay = 'Present';
    }
  }

  // 12. Check-in Mode (Web, Mobile App, Biometric Device or Regularized)
  const isRegularizedApproved = Boolean(
    (dayDetail as any)?.correction?.status === 'approved' ||
    (record as any)?.regularized === true
  );
  let checkInMode = '--';
  if (isRegularizedApproved) {
    checkInMode = 'Regularized';
  } else if (checkInTime !== '--') {
    if ((dayDetail as any)?.check_in_mode) {
      checkInMode = (dayDetail as any).check_in_mode;
    } else if ((record as any)?.source === 'biometric' || (dayDetail as any)?.source === 'biometric') {
      checkInMode = 'Biometric Device';
    } else if ((record as any)?.source === 'web' || (dayDetail as any)?.source === 'web') {
      checkInMode = 'Web';
    } else {
      checkInMode = 'Mobile App';
    }
  }

  // 13 & 14. Location (Defaults to Valsad)
  const checkInLocation =
    (dayDetail as any)?.check_in_location ||
    (record as any)?.check_in_location ||
    employeeInfo?.location ||
    'Valsad';

  const checkOutLocation =
    (dayDetail as any)?.check_out_location ||
    (record as any)?.check_out_location ||
    employeeInfo?.location ||
    'Valsad';

  // 15. Regularized: Yes (with Request ID) if corrected, otherwise No
  const correctionId = (dayDetail as any)?.correction?.id || (record as any)?.correction_id;
  const regularizedDisplay = isRegularizedApproved
    ? `Yes (REG-${String(correctionId || 1).padStart(4, '0')})`
    : 'No';

  // 16. Remarks
  const remarksDisplay =
    (dayDetail as any)?.remarks ||
    (record as any)?.remarks ||
    (dayDetail as any)?.note ||
    (dayDetail?.timeline?.find((t) => t.reason)?.reason) ||
    '--';

  // 17. Regularize button: shown when status is Absent, Half Day, Missing Punch or Late
  const canRegularize = Boolean(
    lateByMinutes > 0 ||
    isMissingPunch ||
    statusDisplay.includes('Absent') ||
    statusDisplay.includes('Half Day') ||
    statusDisplay.includes('Late') ||
    statusDisplay.includes('Missing Punch') ||
    dayDetail?.can_request_correction
  );

  const userInitials = employeeName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'PS';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-detail-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top HRMS Banner Header */}
        <div className="bg-[#0b3c43] text-white px-5 sm:px-6 py-3 flex items-center justify-between border-b border-[#082e34]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-6 rounded bg-teal-400/20 text-teal-300 flex items-center justify-center font-black text-xs shrink-0">
              H
            </div>
            <div className="flex items-center gap-1.5 text-xs truncate">
              <span className="font-bold text-white tracking-wide">HRMS</span>
              <span className="text-teal-400/40">|</span>
              <span className="text-slate-200 text-[11px] truncate">
                HRMS &gt; Attendance &gt; Attendance Register &gt; Detail
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                {userInitials}
              </div>
              <span className="text-xs font-semibold text-slate-100 hidden sm:inline">
                {employeeName} · {employeeInfo?.role || 'Employee'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[82vh]">
          {/* Section Header */}
          <div className="pb-1">
            <h1 id="attendance-detail-title" className="text-xl font-black text-slate-900 tracking-tight">
              Attendance Detail
            </h1>
            <p className="text-xs font-bold text-slate-700 mt-1">
              {employeeName} · {attendanceDateFormatted}
            </p>
          </div>

          {/* 3-Column Field Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4">
            {/* 1. Employee ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                readOnly
                value={employeeId}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none select-all cursor-default"
              />
            </div>

            {/* 2. Employee Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Employee Name
              </label>
              <input
                type="text"
                readOnly
                value={employeeName}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none select-all cursor-default"
              />
            </div>

            {/* 3. Department */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Department
              </label>
              <input
                type="text"
                readOnly
                value={departmentName}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none select-all cursor-default"
              />
            </div>

            {/* 4. Attendance Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Attendance Date
              </label>
              <input
                type="text"
                readOnly
                value={attendanceDateFormatted}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 5. Shift */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Shift
              </label>
              <input
                type="text"
                readOnly
                value={shiftDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 11. Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Status
              </label>
              <input
                type="text"
                readOnly
                value={statusDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 6. Check-in Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Check-in Time
              </label>
              <input
                type="text"
                readOnly
                value={checkInTime}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold font-mono border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 7. Check-out Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Check-out Time
              </label>
              <input
                type="text"
                readOnly
                value={checkOutTime}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold font-mono border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 8. Working Hours */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Working Hours
              </label>
              <input
                type="text"
                readOnly
                value={workingHoursDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold font-mono border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 9. Late By */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Late By
              </label>
              <input
                type="text"
                readOnly
                value={lateByDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 10. Early Exit By */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Early Exit By
              </label>
              <input
                type="text"
                readOnly
                value={earlyExitDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 12. Check-in Mode */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Check-in Mode
              </label>
              <input
                type="text"
                readOnly
                value={checkInMode}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 13. Check-in Location */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Check-in Location
              </label>
              <input
                type="text"
                readOnly
                value={checkInLocation}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 14. Check-out Location */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Check-out Location
              </label>
              <input
                type="text"
                readOnly
                value={checkOutLocation}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 15. Regularized */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Regularized
              </label>
              <input
                type="text"
                readOnly
                value={regularizedDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-default"
              />
            </div>

            {/* 16. Remarks (Span all 3 columns) */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Remarks
              </label>
              <textarea
                readOnly
                rows={2}
                value={remarksDisplay}
                className="w-full bg-[#f4f6f9] text-slate-800 text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 outline-none resize-none cursor-default"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            {canRegularize && onRegularize && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegularize(date);
                }}
                className="px-5 py-2 text-xs font-bold text-teal-800 bg-white border border-teal-600 hover:bg-teal-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Regularize
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold text-white bg-[#1a3844] hover:bg-[#122832] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;
