import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Settings, ClipboardCheck, RefreshCw, Download } from 'lucide-react';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAttendanceDashboard, usePunchActions } from '../hooks/use-attendance';
import { AttendanceSkeleton } from '../components/AttendanceSkeleton';
import { AttendanceDashboardCards } from '../components/AttendanceDashboardCards';
import { AddRegularizationModal } from '../components/AddRegularizationModal';
import { MyRegularizationsPanel } from '../components/MyRegularizationsPanel';
import { ApprovalsPanel } from '../components/ApprovalsPanel';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const canManageAttendance = Boolean(
    user?.access?.can_manage_organization ||
      user?.role?.role_name?.toLowerCase().includes('admin') ||
      user?.role?.role_name?.toLowerCase().includes('manager')
  );

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => todayDateStr.slice(0, 7), [todayDateStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [announcement, setAnnouncement] = useState<string>('');
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attendanceTab, setAttendanceTab] = useState<'timesheet' | 'regularization' | 'approvals'>('timesheet');
  const [correctionModalDate, setCorrectionModalDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error, refetch } = useAttendanceDashboard(selectedMonth);


  const {
    punchInMutation,
    punchOutMutation,
    startBreakMutation,
    resumeBreakMutation,
    isPending,
  } = usePunchActions({
    month: selectedMonth,
    onConflict: (msg) => {
      setInfoToast(msg);
      setAnnouncement(msg);
    },
    onAnnounce: (msg) => {
      setAnnouncement(msg);
    },
  });

  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate);
    const newMonth = newDate.slice(0, 7);
    if (newMonth !== selectedMonth) {
      setSelectedMonth(newMonth);
    }
  };

  const runAction = async (action: () => Promise<any>, fallbackError: string) => {
    setActionError(null);
    setInfoToast(null);
    try {
      await action();
    } catch (err: any) {
      if (err?.status !== 409) setActionError(err?.detail || err?.message || fallbackError);
    }
  };

  const handlePunchIn = () => runAction(() => punchInMutation.mutateAsync(), 'Failed to punch in');
  const handlePunchOut = () => runAction(() => punchOutMutation.mutateAsync(), 'Failed to punch out');
  const handleStartBreak = (breakType?: string, reason?: string) =>
    runAction(() => startBreakMutation.mutateAsync({ breakType, reason }), 'Failed to start break');
  const handleResumeBreak = () => runAction(() => resumeBreakMutation.mutateAsync(), 'Failed to resume break');

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const token = getAccessToken();
      const headers: Record<string, string> = {
        'X-Requested-With': 'pulse-web',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(
        `/api/v1/attendance/report/csv?month=${selectedMonth}`,
        {
          method: 'GET',
          headers,
          credentials: 'include',
        }
      );
      if (!response.ok) {
        let errText = 'Failed to export attendance report';
        try {
          const errJson = await response.json();
          errText = errJson.message || errJson.detail || errText;
        } catch {
          // ignore
        }
        throw new Error(errText);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to export attendance report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !data) return <AttendanceSkeleton />;

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900">Unable to load attendance dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Network error'}</p>
        </div>
      </div>
    );
  }

  const { today, statistics, month_summary, records } = data!;




  const correctionRow = correctionModalDate
    ? records.find((r) => r.date === correctionModalDate)
    : null;

  return (
    <div id="attendance-page" className="space-y-6">
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      {/* Top Header matching reference image */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-[#5B4CF8] flex items-center justify-center shrink-0 shadow-2xs">
            <ClipboardCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-[#1E293B] leading-tight">
              Attendance
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
              Manage your presence logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50 text-[#1E293B] rounded-[14px] text-xs font-semibold shadow-2xs btn-hover-lift transition cursor-pointer disabled:opacity-50"
            title="Export Monthly Attendance Report (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 stroke-[1.75]" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50 text-[#1E293B] rounded-[14px] text-xs font-semibold shadow-2xs btn-hover-lift transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 stroke-[1.75]" />
            <span>Refresh</span>
          </button>

          {canManageAttendance && (
            <Link
              to="/admin/attendance-settings"
              className="inline-flex items-center justify-center w-10 h-10 bg-white border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-[14px] text-xs font-semibold shadow-2xs btn-hover-lift transition cursor-pointer"
              title="Attendance Settings"
            >
              <Settings className="w-4 h-4 text-slate-600 stroke-[1.75]" />
            </Link>
          )}
        </div>
      </div>

      {/* Sub-panel navigation when inside Regularization or Approvals */}
      {attendanceTab !== 'timesheet' && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setAttendanceTab('timesheet')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            &larr; Back to Attendance Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAttendanceTab('regularization')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                attendanceTab === 'regularization' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Regularizations
            </button>
            {canManageAttendance && (
              <button
                type="button"
                onClick={() => setAttendanceTab('approvals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  attendanceTab === 'approvals' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Approvals
              </button>
            )}
          </div>
        </div>
      )}

      {attendanceTab === 'timesheet' && (
        <AttendanceDashboardCards
          today={today}
          statistics={statistics}
          monthSummary={month_summary}
          records={records}
          isPending={isPending}
          onPunchIn={handlePunchIn}
          onPunchOut={handlePunchOut}
          onStartBreak={handleStartBreak}
          onResumeBreak={handleResumeBreak}
          actionError={actionError}
          infoToast={infoToast}
          onDismissToast={() => setInfoToast(null)}
          onSuccessCorrection={(msg) => setInfoToast(msg)}
          selectedDate={selectedDate}
          isSelectedToday={true}
          onRequestCorrection={(date) => setCorrectionModalDate(date)}
          onReturnToToday={() => handleSelectDate(todayDateStr)}
          onSelectDate={handleSelectDate}
          selectedMonth={selectedMonth}
          onSelectMonth={(m) => setSelectedMonth(m)}
          dayLabel="Today"
          weekLabel="This Week"
          monthLabel="This Month"
          statusLabel="Live Shift"
        />
      )}

      {attendanceTab === 'regularization' && (
        <MyRegularizationsPanel />
      )}

      {attendanceTab === 'approvals' && canManageAttendance && (
        <ApprovalsPanel />
      )}

      {/* Regularization Modal when triggered from Timesheet card or records table */}
      {correctionModalDate && (
        <AddRegularizationModal
          isOpen={true}
          initialDate={correctionModalDate}
          initialCheckIn={correctionRow?.punch_in}
          initialCheckOut={correctionRow?.punch_out}
          onClose={() => setCorrectionModalDate(null)}
          onSuccess={() => {
            setInfoToast('Regularization request submitted successfully.');
            setCorrectionModalDate(null);
          }}
        />
      )}
    </div>
  );
};

export default AttendancePage;
