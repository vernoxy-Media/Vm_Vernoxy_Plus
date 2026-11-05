import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Download, Clock, FileText, CheckCircle2, BarChart3, X } from 'lucide-react';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAttendanceDashboard, usePunchActions } from '../hooks/use-attendance';
import { AttendanceSkeleton } from '../components/AttendanceSkeleton';
import { AttendanceDashboardCards } from '../components/AttendanceDashboardCards';
import { AddRegularizationModal } from '../components/AddRegularizationModal';
import { MyRegularizationsPanel } from '../components/MyRegularizationsPanel';
import { ApprovalsPanel } from '../components/ApprovalsPanel';
import { AttendanceAnalyticsDashboardTab } from '../components/analytics/AttendanceAnalyticsDashboardTab';

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [attendanceTab, setAttendanceTab] = useState<'timesheet' | 'analytics' | 'regularization' | 'approvals'>(
    initialTab === 'analytics' || initialTab === 'dashboard' ? 'analytics' : 'timesheet'
  );

  const handleTabChange = (newTab: 'timesheet' | 'analytics' | 'regularization' | 'approvals') => {
    setAttendanceTab(newTab);
    if (newTab === 'analytics') {
      setSearchParams({ tab: 'analytics' });
    } else {
      setSearchParams({});
    }
  };
  const [correctionModalDate, setCorrectionModalDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState<string>(todayDateStr.slice(5, 7));
  const [exportYear, setExportYear] = useState<string>(todayDateStr.slice(0, 4));

  const yearOptions = useMemo(() => {
    const curYear = new Date().getFullYear();
    return [curYear + 1, curYear, curYear - 1, curYear - 2].map(String);
  }, []);

  const { data, isLoading, error } = useAttendanceDashboard(selectedMonth);

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

  const handleExportCsv = async (targetMonthStr?: string) => {
    const targetPeriod = targetMonthStr || `${exportYear}-${exportMonth}`;
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
        `/api/v1/attendance/report/csv?month=${targetPeriod}`,
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
      link.setAttribute('download', `attendance-report-${targetPeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
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
            id="attendance-tab-timesheet"
            role="tab"
            aria-selected={attendanceTab === 'timesheet'}
            onClick={() => handleTabChange('timesheet')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              attendanceTab === 'timesheet'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timesheet &amp; Clock-in</span>
          </button>

          <button
            type="button"
            id="attendance-tab-analytics"
            role="tab"
            aria-selected={attendanceTab === 'analytics'}
            onClick={() => handleTabChange('analytics')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              attendanceTab === 'analytics'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics Dashboard</span>
          </button>

          <button
            type="button"
            id="attendance-tab-regularizations"
            role="tab"
            aria-selected={attendanceTab === 'regularization'}
            onClick={() => handleTabChange('regularization')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              attendanceTab === 'regularization'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Regularizations</span>
          </button>

          {canManageAttendance && (
            <button
              type="button"
              id="attendance-tab-approvals"
              role="tab"
              aria-selected={attendanceTab === 'approvals'}
              onClick={() => handleTabChange('approvals')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                attendanceTab === 'approvals'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approvals</span>
            </button>
          )}
        </div>
      </div>

      {attendanceTab === 'analytics' && (
        <AttendanceAnalyticsDashboardTab />
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
          onOpenMyRequests={() => setAttendanceTab('regularization')}
        />
      )}

      {attendanceTab === 'regularization' && (
        <MyRegularizationsPanel />
      )}

      {attendanceTab === 'approvals' && canManageAttendance && (
        <ApprovalsPanel />
      )}

      {/* Export Monthly Attendance Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5B4CF8] flex items-center justify-center">
                  <Download className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Export Attendance Report</h3>
                  <p className="text-xs text-slate-500">Download monthly register in CSV format</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Month
                </label>
                <select
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Year
                </label>
                <select
                  value={exportYear}
                  onChange={(e) => setExportYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                Will export all employee punch records, shift status, and effective hours for{' '}
                <strong className="text-slate-700">
                  {MONTH_OPTIONS.find((m) => m.value === exportMonth)?.label} {exportYear}
                </strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-slate-50/80 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExportCsv()}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl bg-[#5B4CF8] hover:bg-indigo-600 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Download CSV'}</span>
              </button>
            </div>
          </div>
        </div>
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
