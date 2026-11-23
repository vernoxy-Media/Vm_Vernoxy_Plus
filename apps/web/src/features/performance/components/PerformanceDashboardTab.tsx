import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart2,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Info,
  RotateCcw,
  TrendingUp,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import {
  CycleType,
  PerformanceDashboardFilters,
  usePerformanceDashboardQuery,
} from '../hooks/use-performance';
import { KpiStat } from '@/shared/ui/dashboard/DashboardShell';

interface PerformanceDashboardTabProps {
  initialCycleId?: number;
}

export const PerformanceDashboardTab: React.FC<PerformanceDashboardTabProps> = ({ initialCycleId }) => {
  // Global filter state
  const [cycleType, setCycleType] = useState<CycleType>('MONTHLY');
  const [cycleId, setCycleId] = useState<number | undefined>(initialCycleId);
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [managerId, setManagerId] = useState<number | undefined>();
  const [cycleStatus, setCycleStatus] = useState<string>('ALL');
  const [empId, setEmpId] = useState<number | undefined>();
  const [empSearch, setEmpSearch] = useState('');
  const [scorecardTab, setScorecardTab] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'PROJECT'>('MANAGER');

  // Tooltip popovers for chart info
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // Floating chart hover tooltip states
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [hoveredTrendId, setHoveredTrendId] = useState<number | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const [hoveredAttendanceMonth, setHoveredAttendanceMonth] = useState<string | null>(null);

  // Pagination for Ranking table
  const [rankingPage, setRankingPage] = useState(1);
  const [scorecardPage, setScorecardPage] = useState(1);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const PAGE_SIZE = 5;

  const filters: PerformanceDashboardFilters = useMemo(
    () => ({
      cycle_type: cycleType,
      cycle_id: cycleId,
      department_ids: selectedDepts.length > 0 ? selectedDepts.join(',') : undefined,
      manager_id: managerId,
      status: cycleStatus,
      emp_id: empId,
    }),
    [cycleType, cycleId, selectedDepts, managerId, cycleStatus, empId]
  );

  const { data, isLoading, isError, isFetching, refetch } = usePerformanceDashboardQuery(filters);

  // Available review periods matching selected cycle type
  const availablePeriods = useMemo(() => {
    if (!data?.filter_options?.cycles) return [];
    return data.filter_options.cycles.filter(
      (c) => c.cycle_type === cycleType && (cycleStatus === 'ALL' || c.status === cycleStatus),
    );
  }, [data?.filter_options?.cycles, cycleType, cycleStatus]);

  // Any filter change returns the paged tables to page 1.
  useEffect(() => {
    setRankingPage(1);
    setScorecardPage(1);
  }, [cycleType, cycleId, selectedDepts, managerId, cycleStatus, empId]);

  // Filtered employees for dropdown based on dept and manager
  const filteredEmployeesForDropdown = useMemo(() => {
    if (!data?.filter_options?.employees) return [];
    return data.filter_options.employees.filter((e) => {
      if (selectedDepts.length > 0 && e.dep_id && !selectedDepts.includes(e.dep_id)) return false;
      if (managerId && e.reporting_manager !== managerId) return false;
      if (empSearch) {
        const q = empSearch.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.emp_code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data?.filter_options?.employees, selectedDepts, managerId, empSearch]);

  const handleClearFilters = () => {
    setCycleType('MONTHLY');
    setCycleId(undefined);
    setSelectedDepts([]);
    setManagerId(undefined);
    setCycleStatus('ALL');
    setEmpId(undefined);
    setEmpSearch('');
  };

  const isIndividual = Boolean(empId || data?.is_individual);
  const selectedEmp = data?.selected_employee;

  const hasAnyFilter =
    cycleType !== 'MONTHLY' ||
    Boolean(cycleId) ||
    selectedDepts.length > 0 ||
    Boolean(managerId) ||
    cycleStatus !== 'ALL' ||
    Boolean(empId);

  if (isLoading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Performance Dashboard…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-800">Failed to load Performance Dashboard data.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 shadow-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    cycle,
    kpis,
    pending_employees,
    rating_distribution,
    final_rating_trend,
    average_project_rating,
    monthly_attendance_summary,
    employee_performance_ranking,
    reporting_manager_team_performance,
    criteria_scorecard,
    filter_options,
  } = data;

  // Pagination slice for ranking
  const totalRankingRows = employee_performance_ranking.length;
  const totalRankingPages = Math.ceil(totalRankingRows / PAGE_SIZE) || 1;
  const currentRankingSlice = employee_performance_ranking.slice(
    (rankingPage - 1) * PAGE_SIZE,
    rankingPage * PAGE_SIZE
  );

  // Trend plots completed cycles only; cycles without a completed rating leave a gap (never plotted as 0).
  const trendPlot = final_rating_trend
    .map((pt, idx) => ({
      pt,
      x: final_rating_trend.length === 1 ? 160 : (idx / (final_rating_trend.length - 1)) * 300 + 10,
    }))
    .filter((p) => p.pt.avg_rating !== null)
    .map((p) => ({ ...p, y: 90 - ((p.pt.avg_rating as number) / 5) * 80 }));
  const trendLine = trendPlot.map((p) => `${p.x},${p.y}`).join(' ');
  const emptyTrendCycles = final_rating_trend.filter((pt) => pt.avg_rating === null);

  // Criteria scorecard paging (screenshot: "Page 1 of N")
  const SCORECARD_PAGE_SIZE = 5;
  const totalScorecardPages = Math.ceil(criteria_scorecard.length / SCORECARD_PAGE_SIZE) || 1;
  const scorecardSlice = isIndividual
    ? criteria_scorecard.slice(0, 1)
    : criteria_scorecard.slice((scorecardPage - 1) * SCORECARD_PAGE_SIZE, scorecardPage * SCORECARD_PAGE_SIZE);

  return (
    <div className={`space-y-5 transition-opacity duration-200 ${isFetching ? 'opacity-75' : ''}`}>
      {/* 1. KPI Cards Row (matching Project Dashboard KpiStat styling) */}
      <div className={`grid grid-cols-2 gap-3 sm:gap-3.5 ${isIndividual ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {!isIndividual && (
          <KpiStat
            label="Total Employees"
            value={kpis.total_employees}
            hint={kpis.total_employees === 1 ? '1 employee eligible' : `${kpis.total_employees} eligible in cycle`}
            icon={Users}
            tone="blue"
          />
        )}

        <KpiStat
          label={isIndividual ? 'Review Status' : 'Reviews Completed'}
          value={
            isIndividual ? (
              kpis.reviews_completed > 0 ? (
                'Completed'
              ) : (
                'Pending'
              )
            ) : (
              kpis.reviews_completed
            )
          }
          suffix={!isIndividual && kpis.total_employees > 0 ? `of ${kpis.total_employees}` : undefined}
          percent={kpis.total_employees > 0 ? (kpis.reviews_completed / kpis.total_employees) * 100 : 0}
          hint={
            isIndividual
              ? kpis.reviews_completed > 0
                ? 'All ratings submitted'
                : 'Awaiting submissions'
              : `${kpis.total_employees > 0 ? Math.round((kpis.reviews_completed / kpis.total_employees) * 100) : 0}% submission rate`
          }
          icon={CheckCircle2}
          tone={kpis.reviews_completed > 0 ? 'emerald' : 'amber'}
        />

        <KpiStat
          label="Pending Reviews"
          value={kpis.pending_reviews}
          hint={kpis.pending_reviews === 0 ? 'All reviews complete' : 'Submissions required'}
          icon={Clock}
          tone={kpis.pending_reviews > 0 ? 'rose' : 'emerald'}
        />

        <KpiStat
          label={isIndividual ? 'Final Rating' : 'Overall Average Rating'}
          value={kpis.overall_avg_rating !== null ? `${kpis.overall_avg_rating.toFixed(1)} ★` : 'Pending'}
          suffix={kpis.overall_avg_rating !== null ? '/ 5.0' : undefined}
          percent={kpis.overall_avg_rating !== null ? (kpis.overall_avg_rating / 5) * 100 : 0}
          hint={kpis.overall_avg_rating !== null ? 'Out of 5.0 stars' : 'Requires completed review'}
          icon={Award}
          tone="purple"
        />
      </div>

      {/* 2. Global Filters Bar (matching Project Dashboard FilterBar container) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-2xs">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Global Filters</h3>
              <p className="text-[11px] text-slate-500">Apply criteria across all performance dashboard charts and tables</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{kpis.total_employees} Employees in View</span>
            </div>

            {cycle && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  cycle.status === 'REVIEW_OPEN'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : cycle.status === 'UPCOMING'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {cycle.status === 'REVIEW_OPEN'
                  ? `Window open until ${cycle.review_end_date ? new Date(cycle.review_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}`
                  : cycle.status === 'UPCOMING'
                  ? `Opens on ${cycle.review_start_date ? new Date(cycle.review_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}`
                  : `Closed on ${cycle.review_end_date ? new Date(cycle.review_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}`}
              </span>
            )}

            {hasAnyFilter && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs transition hover:border-slate-300 hover:text-slate-900"
              >
                <RotateCcw className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Filters Select Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Cycle Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Cycle Type</label>
            <div className="relative">
              <select
                value={cycleType}
                onChange={(e) => {
                  const ct = e.target.value as CycleType;
                  setCycleType(ct);
                  setCycleId(undefined);
                }}
                className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Review Period */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Review Period</label>
            <div className="relative">
              <select
                value={cycleId ?? cycle?.cycle_id ?? ''}
                onChange={(e) => setCycleId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
              >
                {availablePeriods.map((p) => (
                  <option key={p.cycle_id} value={p.cycle_id}>
                    {p.cycle_name} {p.status ? `(${p.status === 'REVIEW_OPEN' ? 'Open' : p.status === 'UPCOMING' ? 'Upcoming' : 'Closed'})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Department</label>
            <div className="relative">
              <select
                value={selectedDepts.length === 0 ? 'ALL' : String(selectedDepts[0])}
                onChange={(e) => {
                  if (e.target.value === 'ALL') {
                    setSelectedDepts([]);
                  } else {
                    setSelectedDepts([Number(e.target.value)]);
                  }
                }}
                className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Departments</option>
                {filter_options.departments.map((d) => (
                  <option key={d.dep_id} value={d.dep_id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Reporting Manager */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Reporting Manager</label>
            <div className="relative">
              <select
                value={managerId ?? ''}
                onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
              >
                <option value="">All Managers</option>
                {filter_options.managers.map((m) => (
                  <option key={m.emp_id} value={m.emp_id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Review Cycle Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Cycle Status</label>
            <div className="relative">
              <select
                value={cycleStatus}
                onChange={(e) => setCycleStatus(e.target.value)}
                className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="REVIEW_OPEN">Review Open</option>
                <option value="CLOSED">Closed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Employee */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Employee</label>
            <div className="relative">
              {/* Searchable single-select: type a name or Emp ID */}
              <input
                type="text"
                value={empDropdownOpen ? empSearch : selectedEmp ? `${selectedEmp.name} (${selectedEmp.emp_code})` : empSearch}
                placeholder="All Employees — search name or Emp ID"
                onFocus={() => {
                  setEmpSearch('');
                  setEmpDropdownOpen(true);
                }}
                onChange={(e) => {
                  setEmpSearch(e.target.value);
                  setEmpDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setEmpDropdownOpen(false), 150)}
                className="w-full h-[38px] rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs"
              />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              {empDropdownOpen && (
                <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-xl">
                  <li
                    onMouseDown={() => {
                      setEmpId(undefined);
                      setEmpSearch('');
                      setEmpDropdownOpen(false);
                    }}
                    className="cursor-pointer px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    All Employees
                  </li>
                  {filteredEmployeesForDropdown.length === 0 && (
                    <li className="px-3 py-1.5 text-slate-400">No matching employees</li>
                  )}
                  {filteredEmployeesForDropdown.map((e) => (
                    <li
                      key={e.emp_id}
                      onMouseDown={() => {
                        setEmpId(e.emp_id);
                        setEmpSearch('');
                        setEmpDropdownOpen(false);
                      }}
                      className={`cursor-pointer px-3 py-1.5 hover:bg-purple-50 ${empId === e.emp_id ? 'bg-purple-50 font-bold text-purple-800' : 'text-slate-700'}`}
                    >
                      {e.name} <span className="text-slate-400">({e.emp_code})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Individual Context Banner (if active) */}
        {isIndividual && selectedEmp && (
          <div className="flex items-center justify-between gap-3 bg-purple-50/70 border border-purple-200/80 px-4 py-2.5 rounded-xl text-xs text-purple-900">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Individual View: <strong>{selectedEmp.name}</strong> ({selectedEmp.emp_code}) • {selectedEmp.department_name} • Reports to:{' '}
                <strong>{selectedEmp.manager_name}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEmpId(undefined)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 underline shrink-0 cursor-pointer"
            >
              Clear Employee (Restore Overall Dashboard)
            </button>
          </div>
        )}
      </div>

      {/* 3. Row 1: Charts (Rating Distribution, Final Rating Trend, Average Project Rating) */}
      <div className={`grid grid-cols-1 ${isIndividual ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4 sm:gap-5`}>
        {/* 1. Rating Distribution (Hidden in Individual View) */}
        {!isIndividual && (
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
            <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-2xs">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">1. Rating Distribution</h3>
                  <p className="text-[11px] text-slate-500">Share of individual final ratings, 1 to 5 Stars</p>
                </div>
              </div>

              <div className="relative flex items-center">
                <button
                  type="button"
                  onMouseEnter={() => setActiveTooltip(1)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={() => setActiveTooltip(activeTooltip === 1 ? null : 1)}
                  aria-label="Info"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                </button>
                {activeTooltip === 1 && (
                  <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                    <p className="font-semibold text-slate-100 mb-1">Rating Distribution</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Displays the percentage share of completed employee final ratings grouped from 1 Star to 5 Stars.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 h-48 pt-6 pb-2 border-b border-slate-100">
              {rating_distribution.map((item) => {
                const maxPct = Math.max(...rating_distribution.map((d) => d.percentage), 10);
                const hasScore = item.percentage > 0;
                const barHeight = hasScore ? Math.max((item.percentage / maxPct) * 100, 15) : 8;
                const isHovered = hoveredStar === item.star;
                return (
                  <div
                    key={item.star}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredStar(item.star)}
                    onMouseLeave={() => setHoveredStar(null)}
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-14 z-40 whitespace-nowrap pointer-events-none">
                        <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-1.5 text-white shadow-xl border border-slate-700/60 text-center">
                          <p className="text-[11px] font-bold text-slate-100">{item.star} Star Rating</p>
                          <p className="text-[10px] text-purple-300 font-semibold">
                            {item.count} {item.count === 1 ? 'employee' : 'employees'} ({item.percentage}%)
                          </p>
                        </div>
                      </div>
                    )}

                    <span className={`text-[11px] font-extrabold transition-colors ${hasScore ? 'text-purple-700' : 'text-slate-400'}`}>
                      {item.percentage}%
                    </span>
                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-105 origin-bottom ${
                        hasScore
                          ? 'bg-gradient-to-t from-purple-700 via-purple-600 to-indigo-500 shadow-xs'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-purple-700 transition-colors">{item.star} Star</span>
                      <span className="text-[9px] text-slate-400">({item.count})</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-400">
                {kpis.reviews_completed === 0 ? 'No reviews completed for this cycle yet.' : `${kpis.reviews_completed} ratings plotted.`}
              </span>
            </div>
          </div>
        )}

        {/* 2. Final Rating Trend */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
          <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shadow-2xs">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">2. Final Rating Trend</h3>
                <p className="text-[11px] text-slate-500">
                  {isIndividual
                    ? `${selectedEmp?.name || 'Employee'}'s rating across review cycles`
                    : 'Group average across completed review cycles'}
                </p>
              </div>
            </div>

            <div className="relative flex items-center">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip(2)}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === 2 ? null : 2)}
                aria-label="Info"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <Info className="h-4 w-4" />
              </button>
              {activeTooltip === 2 && (
                <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                  <p className="font-semibold text-slate-100 mb-1">Final Rating Trend</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Tracks performance trends over time using completed review cycles. Unfinished reviews do not contribute.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-48 w-full flex flex-col justify-between pt-4">
            {final_rating_trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No completed cycles available for trend analysis.
              </div>
            ) : (
              <div className="relative h-full flex flex-col justify-end">
                <svg className="w-full h-36 overflow-visible" viewBox="0 0 320 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  <line x1="0" y1="20" x2="320" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="320" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="320" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />

                  {/* Gradient Area under line */}
                  {trendPlot.length > 1 && (
                    <polygon
                      fill="url(#trendGrad)"
                      points={`${trendPlot[0].x},95 ${trendLine} ${trendPlot[trendPlot.length - 1].x},95`}
                    />
                  )}

                  {/* Polyline (completed cycles only) */}
                  {trendPlot.length > 1 && <polyline fill="none" stroke="#0d9488" strokeWidth="2.5" points={trendLine} />}

                  {/* Data Points */}
                  {trendPlot.map(({ pt, x, y }) => {
                    const isHovered = hoveredTrendId === pt.cycle_id;
                    return (
                      <g
                        key={pt.cycle_id}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTrendId(pt.cycle_id)}
                        onMouseLeave={() => setHoveredTrendId(null)}
                      >
                        <circle cx={x} cy={y} r="16" fill="transparent" />
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 7 : 5}
                          fill={isHovered ? '#0d9488' : '#0f766e'}
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 3 : 2.5}
                          className="transition-all duration-150"
                        />
                        <text x={x} y={y - 10} fontSize={isHovered ? '11' : '10'} fontWeight="bold" textAnchor="middle" fill="#0f766e">
                          {(pt.avg_rating as number).toFixed(1)} ★
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip for Hovered Trend Cycle */}
                {(() => {
                  const hoveredIdx = final_rating_trend.findIndex((pt) => pt.cycle_id === hoveredTrendId);
                  if (hoveredIdx < 0) return null;
                  const pt = final_rating_trend[hoveredIdx];
                  const leftPct =
                    final_rating_trend.length === 1
                      ? 50
                      : (hoveredIdx / (final_rating_trend.length - 1)) * 90 + 5;
                  return (
                    <div
                      className="absolute top-0 z-40 pointer-events-none -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${leftPct}%` }}
                    >
                      <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-1.5 text-white shadow-xl border border-slate-700/60 text-center min-w-[130px]">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1">
                          <p className="text-xs font-bold text-slate-100">{pt.period_label || pt.cycle_name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                            {pt.avg_rating !== null ? `${pt.avg_rating.toFixed(2)} ★` : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {pt.completed_count > 0 ? `${pt.completed_count} completed ratings` : 'Review cycle ongoing'}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                  {final_rating_trend.map((pt) => (
                    <span key={pt.cycle_id} className="truncate max-w-[65px] text-center" title={pt.cycle_name}>
                      {pt.period_label || pt.cycle_name}
                    </span>
                  ))}
                </div>
                {emptyTrendCycles.length > 0 && (
                  <p className="pt-1 text-center text-[10px] font-semibold text-rose-500">
                    No completed cycle: {emptyTrendCycles.map((c) => c.period_label || c.cycle_name).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400">Scale: 1.0 to 5.0 Stars</span>
          </div>
        </div>

        {/* 3. Average Project Rating */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
          <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">3. Average Project Rating</h3>
                <p className="text-[11px] text-slate-500">Project ratings, separate from Final Rating [1–5]</p>
              </div>
            </div>

            <div className="relative flex items-center">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip(3)}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === 3 ? null : 3)}
                aria-label="Info"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <Info className="h-4 w-4" />
              </button>
              {activeTooltip === 3 && (
                <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                  <p className="font-semibold text-slate-100 mb-1">Project Ratings</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Ratings given by Project Managers for project delivery. These are tracked independently and do not alter the final core performance score.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 border-b border-slate-100 pb-2 pt-4">
            {average_project_rating.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <Briefcase className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No project ratings submitted</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">
                  Project ratings submitted by Project Managers will appear here.
                </p>
              </div>
            ) : (
              average_project_rating.map((pr) => {
                const barHeight = Math.max((pr.avg_rating / 5) * 100, 15);
                const isHovered = hoveredProjectId === pr.project_id;
                return (
                  <div
                    key={pr.project_id}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredProjectId(pr.project_id)}
                    onMouseLeave={() => setHoveredProjectId(null)}
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-14 z-40 whitespace-nowrap pointer-events-none">
                        <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-1.5 text-white shadow-xl border border-slate-700/60 text-center">
                          <p className="text-[11px] font-bold text-slate-100">{pr.project_name}</p>
                          <p className="text-[10px] text-cyan-300 font-semibold">
                            {pr.avg_rating.toFixed(1)} ★ Average Rating
                          </p>
                        </div>
                      </div>
                    )}

                    <span className="text-[11px] font-extrabold text-blue-700">{pr.avg_rating.toFixed(1)} ★</span>
                    <div
                      style={{ height: `${barHeight}%` }}
                      className="w-full max-w-[38px] rounded-t-xl bg-gradient-to-t from-blue-700 via-blue-600 to-cyan-500 shadow-xs transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-105 origin-bottom"
                    />
                    <span
                      className="text-[10px] font-bold text-slate-700 truncate max-w-[65px] text-center group-hover:text-blue-700 transition-colors"
                      title={pr.project_name}
                    >
                      {pr.project_name}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400">Isolated project performance metric</span>
          </div>
        </div>
      </div>

      {/* 4. Row 2: Attendance & Ranking */}
      <div className={`grid grid-cols-1 ${isIndividual ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-4 sm:gap-5`}>
        {/* 4. Monthly Attendance Summary */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
          <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">4. Monthly Attendance Summary</h3>
                <p className="text-[11px] text-slate-500">
                  {isIndividual
                    ? `${selectedEmp?.name || 'Employee'}'s monthly attendance log percentage`
                    : 'Monthly attendance module integration across organization'}
                </p>
              </div>
            </div>

            <div className="relative flex items-center">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip(4)}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === 4 ? null : 4)}
                aria-label="Info"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <Info className="h-4 w-4" />
              </button>
              {activeTooltip === 4 && (
                <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                  <p className="font-semibold text-slate-100 mb-1">Monthly Attendance Summary</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pulls real attendance check-ins from the Attendance module and computes the monthly present rate percentage.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-52 flex flex-col justify-between pt-4">
            {monthly_attendance_summary.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No attendance data recorded</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">
                  Logs from Attendance module will populate monthly rates automatically.
                </p>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-44 border-b border-slate-100 pb-2">
                {monthly_attendance_summary.map((att) => {
                  const key = `${att.year}-${att.month}`;
                  const isHovered = hoveredAttendanceMonth === key;
                  const barHeight = Math.max(att.rate, 12);
                  return (
                    <div
                      key={key}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group cursor-pointer"
                      onMouseEnter={() => setHoveredAttendanceMonth(key)}
                      onMouseLeave={() => setHoveredAttendanceMonth(null)}
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-16 z-40 whitespace-nowrap pointer-events-none">
                          <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-1.5 text-white shadow-xl border border-slate-700/60 text-center min-w-[125px]">
                            <p className="text-[11px] font-bold text-slate-100">{att.month} {att.year}</p>
                            <p className="text-[10px] text-emerald-300 font-bold">{att.rate}% Present Rate</p>
                            <p className="text-[9px] text-slate-300">
                              {att.present} of {att.total} working days
                            </p>
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] font-extrabold text-emerald-800">{att.rate}%</span>
                      <div
                        style={{ height: `${barHeight}%` }}
                        className="w-full max-w-[46px] rounded-t-xl bg-gradient-to-t from-emerald-700 via-emerald-600 to-teal-400 shadow-xs transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-105 origin-bottom"
                      />
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{att.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400">Attendance data from Attendance Days register</span>
          </div>
        </div>

        {/* 5. Employee Performance Ranking (Hidden in Individual View) */}
        {!isIndividual && (
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
            <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-2xs">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">5. Employee Performance Ranking</h3>
                  <p className="text-[11px] text-slate-500">All employees with a Final Rating, highest first</p>
                </div>
              </div>

              <div className="relative flex items-center">
                <button
                  type="button"
                  onMouseEnter={() => setActiveTooltip(5)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={() => setActiveTooltip(activeTooltip === 5 ? null : 5)}
                  aria-label="Info"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                </button>
                {activeTooltip === 5 && (
                  <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                    <p className="font-semibold text-slate-100 mb-1">Employee Performance Ranking</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Lists employees ranked by their overall combined Final Rating. Click View Profile to inspect an individual employee scorecard.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto min-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 font-bold">Rank</th>
                    <th className="py-2.5 font-bold">Emp ID</th>
                    <th className="py-2.5 font-bold">Name</th>
                    <th className="py-2.5 font-bold">Department</th>
                    <th className="py-2.5 font-bold">Reporting Manager</th>
                    <th className="py-2.5 font-bold text-right">Final Rating</th>
                    <th className="py-2.5 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRankingSlice.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        <Trophy className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">No completed reviews in this cycle</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Rankings will populate as Self, Manager, and Admin reviews are submitted.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentRankingSlice.map((emp) => (
                      <tr key={emp.emp_id} className="hover:bg-purple-50/50 transition-colors group cursor-pointer">
                        <td className="py-2.5 font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black transition-transform group-hover:scale-105 ${
                              emp.rank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : emp.rank === 2
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : emp.rank === 3
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {emp.rank}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">{emp.emp_code}</td>
                        <td className="py-2.5 font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{emp.name}</td>
                        <td className="py-2.5 text-slate-600 font-medium">{emp.department_name}</td>
                        <td className="py-2.5 text-slate-600">{emp.manager_name}</td>
                        <td className="py-2.5 text-right font-black text-slate-900 text-sm">
                          {emp.final_rating !== null ? `${emp.final_rating.toFixed(1)} ★` : '—'}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setEmpId(emp.emp_id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 group-hover:bg-purple-200/80 rounded-lg transition shadow-2xs cursor-pointer"
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pending_employees.length > 0 && (
              <p className="pt-2 text-[11px] text-slate-400">
                Pending (no Final Rating yet): {pending_employees.slice(0, 5).join(', ')}
                {pending_employees.length > 5 ? ` +${pending_employees.length - 5} more` : ''}
              </p>
            )}

            {/* Pagination controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <span className="text-[11px]">
                {totalRankingRows} {totalRankingRows === 1 ? 'row' : 'rows'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={rankingPage <= 1}
                  onClick={() => setRankingPage((p) => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 flex items-center gap-0.5 text-xs font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="px-2 font-bold text-slate-700 text-xs">
                  Page {rankingPage} of {totalRankingPages}
                </span>
                <button
                  type="button"
                  disabled={rankingPage >= totalRankingPages}
                  onClick={() => setRankingPage((p) => Math.min(p + 1, totalRankingPages))}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 flex items-center gap-0.5 text-xs font-semibold cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Row 3: Manager Team Performance & Criteria Scorecard */}
      <div className={`grid grid-cols-1 ${isIndividual ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-4 sm:gap-5`}>
        {/* 6. Reporting Manager-wise Team Performance (Hidden in Individual View) */}
        {!isIndividual && (
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
            <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">6. Team Performance by Manager</h3>
                  <p className="text-[11px] text-slate-500">Average Final Rating of direct reports by Reporting Manager</p>
                </div>
              </div>

              <div className="relative flex items-center">
                <button
                  type="button"
                  onMouseEnter={() => setActiveTooltip(6)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={() => setActiveTooltip(activeTooltip === 6 ? null : 6)}
                  aria-label="Info"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                </button>
                {activeTooltip === 6 && (
                  <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                    <p className="font-semibold text-slate-100 mb-1">Manager Team Performance</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Aggregates team performance under each Reporting Manager based on direct report final ratings.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto min-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 font-bold">Rank</th>
                    <th className="py-2.5 font-bold">Reporting Manager</th>
                    <th className="py-2.5 font-bold text-center">With Final Rating</th>
                    <th className="py-2.5 font-bold text-center">Pending</th>
                    <th className="py-2.5 font-bold text-right">Overall Final Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reporting_manager_team_performance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">No manager team data for this cycle</p>
                      </td>
                    </tr>
                  ) : (
                    reporting_manager_team_performance.map((mgr) => (
                      <tr key={mgr.manager_id} className="hover:bg-indigo-50/40 transition-colors group">
                        <td className="py-2.5 font-bold text-slate-700">{mgr.rank}</td>
                        <td className="py-2.5 font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{mgr.manager_name}</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            {mgr.with_final_rating}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                            {mgr.pending}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-900 text-sm">
                          {mgr.avg_final_rating !== null ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-extrabold">
                              {mgr.avg_final_rating.toFixed(1)} ★
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-400">Direct reports team aggregation</span>
            </div>
          </div>
        )}

        {/* 7. Employee-wise Performance Criteria Scorecard */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-2xs">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  7. {isIndividual ? 'Competency Criteria Scorecard' : 'Performance Criteria Scorecard'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Submitted ratings given by {scorecardTab === 'MANAGER' ? 'Reporting Manager' : scorecardTab === 'EMPLOYEE' ? 'Employee (Self)' : scorecardTab === 'ADMIN' ? 'Admin' : 'Project Manager'}
                </p>
              </div>
            </div>

            {/* Scorecard Reviewer Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs shadow-2xs self-start">
              <button
                type="button"
                onClick={() => setScorecardTab('EMPLOYEE')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  scorecardTab === 'EMPLOYEE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => setScorecardTab('MANAGER')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  scorecardTab === 'MANAGER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => setScorecardTab('ADMIN')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  scorecardTab === 'ADMIN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setScorecardTab('PROJECT')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  scorecardTab === 'PROJECT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Project
              </button>
            </div>
          </div>

          {(() => {
            const scoreBadge = (val: number | null | undefined) => {
              if (val === null || val === undefined) {
                return <span className="text-slate-300 font-medium">—</span>;
              }
              return (
                <span
                  title={`${val} out of 5 stars`}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs shadow-2xs hover:scale-110 transition-transform cursor-default ${
                    val >= 4.5
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                      : val >= 3.5
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      : val >= 2.5
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {val}
                </span>
              );
            };

            return (
              <div className="overflow-x-auto min-h-[220px]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 font-bold">Employee</th>
                      {scorecardTab === 'PROJECT' ? (
                        <>
                          <th className="py-2.5 font-bold text-center">Projects Rated</th>
                          <th className="py-2.5 font-bold text-center">Average</th>
                          <th className="py-2.5 font-bold">Project Ratings</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 font-bold text-center">Communication</th>
                          <th className="py-2.5 font-bold text-center">Behaviour</th>
                          <th className="py-2.5 font-bold text-center">Regularity</th>
                          <th className="py-2.5 font-bold text-center">Teamwork</th>
                          <th className="py-2.5 font-bold text-center">Quality of Work</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scorecardSlice.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          <Award className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-600">No competency scores available</p>
                        </td>
                      </tr>
                    ) : (
                      scorecardSlice.map((item) => {
                        const nameCell = (
                          <td className="py-2.5 font-bold text-slate-900">
                            <span className="group-hover:text-purple-700 transition-colors">{item.name}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">{item.department_name}</span>
                          </td>
                        );

                        if (scorecardTab === 'PROJECT') {
                          return (
                            <tr key={item.emp_id} className="hover:bg-purple-50/40 transition-colors group">
                              {nameCell}
                              <td className="py-2.5 text-center font-bold text-slate-700">{item.project_ratings.length}</td>
                              <td className="py-2.5 text-center">{scoreBadge(item.project_avg)}</td>
                              <td className="py-2.5 text-slate-600">
                                {item.project_ratings.length === 0
                                  ? '—'
                                  : item.project_ratings.map((pr) => `${pr.project_name}: ${pr.rating}`).join(', ')}
                              </td>
                            </tr>
                          );
                        }

                        const ratings =
                          scorecardTab === 'EMPLOYEE'
                            ? item.self_ratings
                            : scorecardTab === 'ADMIN'
                            ? item.admin_ratings
                            : item.manager_ratings;

                        // Fixed question ids come from the BFD form: fixed_comm / behav / regul / teamw / qual.
                        return (
                          <tr key={item.emp_id} className="hover:bg-purple-50/40 transition-colors group">
                            {nameCell}
                            <td className="py-2.5 text-center">{scoreBadge(ratings.fixed_comm)}</td>
                            <td className="py-2.5 text-center">{scoreBadge(ratings.fixed_behav)}</td>
                            <td className="py-2.5 text-center">{scoreBadge(ratings.fixed_regul)}</td>
                            <td className="py-2.5 text-center">{scoreBadge(ratings.fixed_teamw)}</td>
                            <td className="py-2.5 text-center">{scoreBadge(ratings.fixed_qual)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {!isIndividual && criteria_scorecard.length > SCORECARD_PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <span className="text-[11px]">{criteria_scorecard.length} rows</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={scorecardPage <= 1}
                  onClick={() => setScorecardPage((pg) => Math.max(pg - 1, 1))}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 flex items-center gap-0.5 text-xs font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="px-2 font-bold text-slate-700 text-xs">
                  Page {scorecardPage} of {totalScorecardPages}
                </span>
                <button
                  type="button"
                  disabled={scorecardPage >= totalScorecardPages}
                  onClick={() => setScorecardPage((pg) => Math.min(pg + 1, totalScorecardPages))}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 flex items-center gap-0.5 text-xs font-semibold cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400">Scorecard across 5 standard criteria (1 to 5 stars)</span>
          </div>
        </div>
      </div>
    </div>
  );
};