import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Search,
  Eye,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CalendarOff,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAttendanceRegister } from '../hooks/use-attendance';
import { AttendanceDetailModal } from '../components/AttendanceDetailModal';
import { AttendanceReportsSection } from '../components/AttendanceReportsSection';

interface AttendanceRegisterPageProps {
  defaultView?: 'daily' | 'reports';
}

const STATUS_OPTIONS = [
  'All',
  'Present',
  'Absent',
  'Half Day',
  'On Leave',
  'Weekly Off',
  'Holiday',
  'Missing Punch',
  'Late',
] as const;

const STATUS_COLORS: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700',
  Absent: 'bg-red-100 text-red-700',
  'Half Day': 'bg-amber-100 text-amber-700',
  'On Leave': 'bg-blue-100 text-blue-700',
  'Weekly Off': 'bg-slate-100 text-slate-600',
  Holiday: 'bg-purple-100 text-purple-700',
  'Missing Punch': 'bg-orange-100 text-orange-700',
  Late: 'bg-yellow-100 text-yellow-700',
};

export const AttendanceRegisterPage: React.FC<AttendanceRegisterPageProps> = ({ defaultView }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // View switcher: 'daily' or 'reports'
  const urlView = searchParams.get('view');
  const activeView = (urlView === 'reports' || defaultView === 'reports') ? 'reports' : 'daily';
  const setActiveView = (view: 'daily' | 'reports') => {
    if (view === 'reports') {
      setSearchParams({ view: 'reports' });
    } else {
      setSearchParams({});
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(undefined);
  const [shiftFilter, setShiftFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    empId: number;
    empCode: string;
    name: string;
    department: string;
    date: string;
    record: any;
  } | null>(null);

  // Debounce search
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const { data, isLoading, error } = useAttendanceRegister({
    date: selectedDate,
    departmentId: departmentFilter,
    shiftId: shiftFilter,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  });

  // Access check
  const isAdmin = Boolean(
    user?.access?.can_manage_organization ||
      user?.role?.role_name?.toLowerCase().includes('admin')
  );

  if (!isAdmin) {
    return (
      <div className="py-24 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
          <p className="text-xs text-slate-500 mt-1">
            Only HR Admin can access the Attendance Register.
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    total_employees: 0,
    present_count: 0,
    absent_count: 0,
    on_leave_count: 0,
    half_day_count: 0,
    missing_punch_count: 0,
  };
  const records = data?.records || [];
  const departments = data?.departments || [];
  const shifts = data?.shifts || [];
  const statusOptions = data?.statuses && data.statuses.length > 0 ? data.statuses : STATUS_OPTIONS;

  const formattedDate = data?.formatted_date || (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  })();

  const kpiCards = [
    { label: 'Employees', count: summary.total_employees, icon: Users, color: 'bg-slate-50 border-slate-200 text-slate-700', badgeColor: 'bg-slate-600' },
    { label: 'Present', count: summary.present_count, icon: CheckCircle2, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', badgeColor: 'bg-emerald-600' },
    { label: 'Absent', count: summary.absent_count, icon: XCircle, color: 'bg-red-50 border-red-200 text-red-700', badgeColor: 'bg-red-600' },
    { label: 'On Leave', count: summary.on_leave_count, icon: CalendarOff, color: 'bg-blue-50 border-blue-200 text-blue-700', badgeColor: 'bg-blue-600' },
    { label: 'Half Day', count: summary.half_day_count, icon: Clock, color: 'bg-amber-50 border-amber-200 text-amber-700', badgeColor: 'bg-amber-600' },
    { label: 'Missing Punch', count: summary.missing_punch_count, icon: AlertTriangle, color: 'bg-orange-50 border-orange-200 text-orange-700', badgeColor: 'bg-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="text-slate-400">HRMS</span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="hover:text-indigo-600 transition-colors cursor-pointer"
        >
          Attendance
        </button>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-800">Attendance Register</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-[#5B4CF8] flex items-center justify-center shrink-0 shadow-2xs">
            <ClipboardCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-[#1E293B] leading-tight">
              Attendance Register
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">
              {activeView === 'reports' ? 'Generate and export attendance reports' : 'Daily attendance overview of all employees'}
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center border-b border-slate-200/80 pb-2">
        <div
          className="inline-flex items-center gap-1.5 p-1 bg-slate-100/80 border border-slate-200/80 rounded-2xl shadow-2xs"
          role="tablist"
          aria-label="Register Views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'daily'}
            onClick={() => setActiveView('daily')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'daily'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Daily Register</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'reports'}
            onClick={() => setActiveView('reports')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'reports'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Attendance Reports</span>
          </button>
        </div>
      </div>

      {/* Reports View */}
      {activeView === 'reports' && <AttendanceReportsSection />}

      {/* Daily Register View */}
      {activeView === 'daily' && (
      <>
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={departmentFilter ?? ''}
              onChange={(e) =>
                setDepartmentFilter(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="">All</option>
              {departments.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Shift
            </label>
            <select
              value={shiftFilter ?? ''}
              onChange={(e) =>
                setShiftFilter(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="">All</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Name or ID"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-2xl border p-4 shadow-xs ${card.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${card.badgeColor} bg-opacity-10 flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight">
                {isLoading ? '—' : card.count}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-75">
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Daily Register • {formattedDate}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Loading attendance register…
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-xs font-semibold">
            Failed to load register. Please try again.
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No records found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Emp ID
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Shift
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    In
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Out
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Hours
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {records.map((row) => (
                  <tr
                    key={row.emp_id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      {row.employee_code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {row.department}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {row.shift_name}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {row.in_time}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {row.out_time}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.working_hours}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          row.status === 'Present' && row.is_late
                            ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                            : STATUS_COLORS[row.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.status}
                        {row.is_late && row.status === 'Present' && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200/80 text-amber-900 font-extrabold uppercase">
                            Late
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          setDetailModal({
                            isOpen: true,
                            empId: row.emp_id,
                            empCode: row.employee_code,
                            name: row.name,
                            department: row.department,
                            date: row.date,
                            record: row,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Detail Modal */}
      {detailModal && (
        <AttendanceDetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal(null)}
          date={detailModal.date}
          record={detailModal.record}
          employeeInfo={{
            empId: detailModal.empCode,
            name: detailModal.name,
            department: detailModal.department,
          }}
        />
      )}
      </>
      )}
    </div>
  );
};

