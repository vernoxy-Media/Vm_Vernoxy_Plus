import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getAccessToken } from '@vernoxy-pulse/api-client';
import {
  AttendanceAnalyticsFilters,
  EnrichedAttendanceRecord,
  RegularizationRequestRecord,
} from '../components/analytics/attendance-analytics.types';
import {
  getCurrentMonthRange,
  filterAttendanceRecords,
  calculateAttendanceStatusOverview,
  calculateMonthlyAttendanceSummary,
  calculateTopLateMarks,
  calculateDailyWorkingHoursTrend,
  calculateRegularizationRequestStatus,
  calculateWeeklyOffAndHolidaysWorking,
  calculateRegularizedRecordsProgress,
  calculateTopEarlyExits,
  calculateWeeklyWorkingHoursHeatmap,
  calculateDailyBreakDurationTrends,
} from '../components/analytics/attendance-analytics.utils';

interface AnalyticsEmployeeOption {
  id: number;
  name: string;
  empCode: string;
  department: string;
  designation: string;
}

/** What GET /api/v1/attendance/analytics returns: the records are built on the server from the database. */
interface AnalyticsResponse {
  records: EnrichedAttendanceRecord[];
  employees: AnalyticsEmployeeOption[];
  regularizations: RegularizationRequestRecord[];
}

const EMPTY: AnalyticsResponse = { records: [], employees: [], regularizations: [] };

export function useAttendanceAnalytics() {
  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);

  const [filters, setFilters] = useState<AttendanceAnalyticsFilters>({
    dateRangePreset: 'current_month',
    startDate: currentMonthRange.startDate,
    endDate: currentMonthRange.endDate,
    department: 'All',
    designation: 'All',
    employeeId: 'All',
    search: '',
  });

  const [data, setData] = useState<AnalyticsResponse>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  // Reads the chosen date range from the database. Only the latest request may update the screen.
  const load = useCallback(async (startDate: string, endDate: string) => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { 'X-Requested-With': 'pulse-web' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/v1/attendance/analytics?from=${encodeURIComponent(startDate)}&to=${encodeURIComponent(endDate)}`, {
        headers,
        credentials: 'include',
      });
      if (!res.ok) {
        let detail = '';
        try {
          const body = await res.json();
          detail = body?.detail || body?.message || '';
        } catch {
          /* no body */
        }
        throw new Error(res.status === 403 ? 'Only administrators can open the attendance analytics.' : detail || `The server answered ${res.status}.`);
      }
      const body = (await res.json()) as AnalyticsResponse;
      if (seq === requestSeq.current) setData({ records: body.records ?? [], employees: body.employees ?? [], regularizations: body.regularizations ?? [] });
    } catch (e) {
      if (seq === requestSeq.current) {
        setData(EMPTY);
        setError(e instanceof Error ? e.message : 'Could not load the attendance analytics.');
      }
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // A custom range typed by hand can be half finished or backwards: wait until it is a real range
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(filters.startDate) || !iso.test(filters.endDate)) return;
    if (filters.startDate > filters.endDate) {
      setError('The start date cannot be after the end date.');
      return;
    }
    void load(filters.startDate, filters.endDate);
  }, [load, filters.startDate, filters.endDate]);

  const rawRecords = data.records;
  const rawRegularizations = data.regularizations;
  const employeeOptions = data.employees;

  // Departments and designations come from the real employees, so the filters list what exists
  const departments = useMemo(
    () => [...new Set(employeeOptions.map((e) => e.department))].sort().map((name, i) => ({ id: i + 1, name })),
    [employeeOptions],
  );
  const designationsByDepartment = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of employeeOptions) {
      const list = (map[e.department] ??= []);
      if (!list.includes(e.designation)) list.push(e.designation);
    }
    for (const k of Object.keys(map)) map[k]!.sort();
    return map;
  }, [employeeOptions]);

  const availableDesignations = useMemo(() => {
    if (filters.department === 'All') return [...new Set(employeeOptions.map((e) => e.designation))].sort();
    return designationsByDepartment[filters.department] || [];
  }, [filters.department, designationsByDepartment, employeeOptions]);

  // If department changes and current designation is not mapped, reset designation to All
  const setFilterState = useCallback(
    (newFilters: AttendanceAnalyticsFilters) => {
      setFilters((prev) => {
        let designation = newFilters.designation;
        if (newFilters.department !== prev.department && newFilters.department !== 'All') {
          const allowed = designationsByDepartment[newFilters.department] || [];
          if (!allowed.includes(designation)) designation = 'All';
        }
        return { ...newFilters, designation };
      });
    },
    [designationsByDepartment],
  );

  const clearFilters = useCallback(() => {
    const range = getCurrentMonthRange();
    setFilters({
      dateRangePreset: 'current_month',
      startDate: range.startDate,
      endDate: range.endDate,
      department: 'All',
      designation: 'All',
      employeeId: 'All',
      search: '',
    });
  }, []);

  const refetch = useCallback(() => load(filters.startDate, filters.endDate), [load, filters.startDate, filters.endDate]);

  const filteredRecords = useMemo(() => filterAttendanceRecords(rawRecords, filters), [rawRecords, filters]);

  const filteredRegularizations = useMemo(() => {
    return rawRegularizations.filter((req) => {
      if (filters.department !== 'All' && req.department !== filters.department) return false;
      if (filters.designation !== 'All' && req.designation !== filters.designation) return false;
      if (filters.employeeId !== 'All' && String(req.empId) !== String(filters.employeeId)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          req.requestId.toLowerCase().includes(q) ||
          req.employeeName.toLowerCase().includes(q) ||
          req.department.toLowerCase().includes(q) ||
          req.designation.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawRegularizations, filters]);

  const statusOverview = useMemo(() => calculateAttendanceStatusOverview(filteredRecords), [filteredRecords]);
  const monthlySummary = useMemo(() => calculateMonthlyAttendanceSummary(filteredRecords), [filteredRecords]);
  const topLateMarks = useMemo(() => calculateTopLateMarks(filteredRecords), [filteredRecords]);
  const dailyWorkingHours = useMemo(() => calculateDailyWorkingHoursTrend(filteredRecords), [filteredRecords]);
  const regularizationStatus = useMemo(() => calculateRegularizationRequestStatus(filteredRegularizations), [filteredRegularizations]);
  const weeklyOffAndHolidays = useMemo(() => calculateWeeklyOffAndHolidaysWorking(filteredRecords), [filteredRecords]);
  const regularizedRecords = useMemo(() => calculateRegularizedRecordsProgress(filteredRecords), [filteredRecords]);
  const topEarlyExits = useMemo(() => calculateTopEarlyExits(filteredRecords), [filteredRecords]);
  const weeklyHeatmap = useMemo(() => calculateWeeklyWorkingHoursHeatmap(filteredRecords), [filteredRecords]);
  const dailyBreakTrends = useMemo(() => calculateDailyBreakDurationTrends(filteredRecords), [filteredRecords]);

  return {
    filters,
    setFilters: setFilterState,
    clearFilters,
    departments,
    availableDesignations,
    employeeOptions,
    totalRecordsCount: rawRecords.length,
    filteredRecordsCount: filteredRecords.length,
    isLoading,
    error,
    refetch,
    statusOverview,
    monthlySummary,
    topLateMarks,
    dailyWorkingHours,
    regularizationStatus,
    weeklyOffAndHolidays,
    regularizedRecords,
    topEarlyExits,
    weeklyHeatmap,
    dailyBreakTrends,
  };
}
