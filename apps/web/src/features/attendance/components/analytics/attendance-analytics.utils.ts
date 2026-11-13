import {
  AttendanceAnalyticsFilters,
  EnrichedAttendanceRecord,
  RegularizationRequestRecord,
  AttendanceStatusCountItem,
  MonthlyAttendanceSummaryItem,
  EmployeeLateMarkRankItem,
  DailyWorkingHoursItem,
  RegularizationStatusSummary,
  WeeklyOffHolidayWorkingSummary,
  RegularizedAttendanceSummary,
  EmployeeEarlyExitRankItem,
  WeeklyHeatmapSummary,
  HeatmapDayCell,
  EmployeeWeeklyHeatmapRow,
  DailyBreakTrendItem,
  ALL_ATTENDANCE_STATUSES,
} from './attendance-analytics.types';

// Helper: Format minutes into HH:MM format
export function formatMinutesToHHMM(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Helper: Format ISO date to DD-MM-YYYY
export function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// Helper: Get start & end of current month (YYYY-MM-DD)
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const end = new Date(year, month + 1, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(end.getDate())}`,
  };
}

// Helper: Get start & end of current week (Monday to Sunday)
export function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDay();
  // In JS: 0 = Sun, 1 = Mon ... 6 = Sat
  // We want Monday as start
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    startDate: fmt(monday),
    endDate: fmt(sunday),
  };
}

// US01: Centralized Filter & Search Logic
export function filterAttendanceRecords(
  records: EnrichedAttendanceRecord[],
  filters: AttendanceAnalyticsFilters
): EnrichedAttendanceRecord[] {
  return records.filter((r) => {
    // 1. Date Range Filter
    if (filters.startDate && r.workDate < filters.startDate) return false;
    if (filters.endDate && r.workDate > filters.endDate) return false;

    // 2. Department Filter
    if (filters.department !== 'All' && r.department !== filters.department) {
      return false;
    }

    // 3. Designation Filter
    if (filters.designation !== 'All' && r.designation !== filters.designation) {
      return false;
    }

    // 4. Employee Filter
    if (filters.employeeId !== 'All' && String(r.empId) !== String(filters.employeeId)) {
      return false;
    }

    // 5. Global Search
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const match =
        r.empCode.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}

// US02: Attendance Status Overview (Donut Chart)
export function calculateAttendanceStatusOverview(
  records: EnrichedAttendanceRecord[]
): {
  items: AttendanceStatusCountItem[];
  totalRecords: number;
} {
  // Deduplicate: 1 record per employee per date
  const uniqueMap = new Map<string, EnrichedAttendanceRecord>();
  for (const r of records) {
    const key = `${r.empId}_${r.workDate}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, r);
    }
  }

  const deduped = Array.from(uniqueMap.values());
  const counts: Record<string, number> = {
    present: 0,
    absent: 0,
    half_day: 0,
    on_leave: 0,
    missing_punch: 0,
  };

  for (const r of deduped) {
    if (counts[r.dayStatus] !== undefined) {
      counts[r.dayStatus]++;
    } else {
      counts.missing_punch++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const items: AttendanceStatusCountItem[] = ALL_ATTENDANCE_STATUSES.map((st) => {
    const cnt = counts[st.key] || 0;
    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
    return {
      key: st.key,
      label: st.label,
      count: cnt,
      percentage: pct,
      color: st.color,
    };
  });

  return { items, totalRecords: total };
}

// US03: Monthly Attendance Summary (Stacked Column Chart + Late Mark Line)
export function calculateMonthlyAttendanceSummary(
  records: EnrichedAttendanceRecord[]
): MonthlyAttendanceSummaryItem[] {
  const monthMap = new Map<
    string,
    {
      present: number;
      absent: number;
      halfDay: number;
      onLeave: number;
      lateMark: number;
      total: number;
    }
  >();

  // Consolidate per employee per date
  const uniqueMap = new Map<string, EnrichedAttendanceRecord>();
  for (const r of records) {
    const key = `${r.empId}_${r.workDate}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, r);
  }

  for (const r of uniqueMap.values()) {
    const monthKey = r.workDate.slice(0, 7); // "YYYY-MM"
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        lateMark: 0,
        total: 0,
      });
    }
    const bucket = monthMap.get(monthKey)!;
    bucket.total++;
    if (r.dayStatus === 'present') bucket.present++;
    else if (r.dayStatus === 'absent') bucket.absent++;
    else if (r.dayStatus === 'half_day') bucket.halfDay++;
    else if (r.dayStatus === 'on_leave') bucket.onLeave++;

    if (r.isLate) {
      bucket.lateMark++;
    }
  }

  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, b]) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      const monthLabel = `${MONTH_NAMES[monthIdx] || monthStr} ${yearStr}`;

      return {
        monthKey,
        monthLabel,
        presentCount: b.present,
        absentCount: b.absent,
        halfDayCount: b.halfDay,
        onLeaveCount: b.onLeave,
        lateMarkCount: b.lateMark,
        totalRecords: b.total,
      };
    });
}

// US04: Employees with Most Late Marks (Ranked Data Table)
export function calculateTopLateMarks(
  records: EnrichedAttendanceRecord[]
): EmployeeLateMarkRankItem[] {
  const map = new Map<
    number,
    {
      empId: number;
      empCode: string;
      employeeName: string;
      department: string;
      designation: string;
      lateCount: number;
      lastDate: string;
    }
  >();

  for (const r of records) {
    if (r.isLate) {
      if (!map.has(r.empId)) {
        map.set(r.empId, {
          empId: r.empId,
          empCode: r.empCode,
          employeeName: r.employeeName,
          department: r.department,
          designation: r.designation,
          lateCount: 0,
          lastDate: r.workDate,
        });
      }
      const entry = map.get(r.empId)!;
      entry.lateCount++;
      if (r.workDate > entry.lastDate) {
        entry.lastDate = r.workDate;
      }
    }
  }

  const list = Array.from(map.values()).sort((a, b) => {
    if (b.lateCount !== a.lateCount) return b.lateCount - a.lateCount;
    return a.employeeName.localeCompare(b.employeeName);
  });

  if (list.length === 0) return [];

  // Assign ranks with ties & include ties at 5th position
  const ranked: EmployeeLateMarkRankItem[] = [];
  let currentRank = 1;

  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i].lateCount < list[i - 1].lateCount) {
      currentRank = i + 1;
    }

    if (currentRank > 5) {
      break;
    }

    ranked.push({
      rank: currentRank,
      empId: list[i].empId,
      empCode: list[i].empCode,
      employeeName: list[i].employeeName,
      department: list[i].department,
      designation: list[i].designation,
      totalLateMarks: list[i].lateCount,
      lastLateMarkDate: formatDateDDMMYYYY(list[i].lastDate),
    });
  }

  return ranked;
}

// US05: Daily Working Hours Trend (Line Chart)
export function calculateDailyWorkingHoursTrend(
  records: EnrichedAttendanceRecord[]
): DailyWorkingHoursItem[] {
  const map = new Map<
    string,
    { totalMinutes: number; employees: Set<number> }
  >();

  // Consolidate per employee per date
  const uniqueMap = new Map<string, EnrichedAttendanceRecord>();
  for (const r of records) {
    const key = `${r.empId}_${r.workDate}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, r);
  }

  for (const r of uniqueMap.values()) {
    // Only valid records with check-in and production minutes
    if (r.productionMinutes > 0 && r.checkInTime) {
      if (!map.has(r.workDate)) {
        map.set(r.workDate, { totalMinutes: 0, employees: new Set() });
      }
      const b = map.get(r.workDate)!;
      b.totalMinutes += r.productionMinutes;
      b.employees.add(r.empId);
    }
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, b]) => {
      const d = new Date(dateStr);
      const dayOfWeek = isNaN(d.getTime()) ? '' : DOW[d.getDay()];
      const dayNum = dateStr.slice(8, 10);
      const monthIdx = parseInt(dateStr.slice(5, 7), 10) - 1;
      const dateLabel = `${dayNum} ${MONTHS[monthIdx] || ''}`;

      const totalHours = Math.round((b.totalMinutes / 60) * 10) / 10;
      const empCount = b.employees.size;
      const avgHours = empCount > 0 ? Math.round((totalHours / empCount) * 10) / 10 : 0;

      return {
        date: dateStr,
        dateLabel,
        dayOfWeek,
        totalWorkingHours: totalHours,
        employeeCount: empCount,
        averageWorkingHours: avgHours,
      };
    });
}

// US06: Regularization Request Status (2x2 Grid)
export function calculateRegularizationRequestStatus(
  requests: RegularizationRequestRecord[]
): RegularizationStatusSummary {
  // Unique by requestId, using latest status
  const map = new Map<string, RegularizationRequestRecord>();
  for (const req of requests) {
    map.set(req.requestId, req);
  }

  const unique = Array.from(map.values());
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let cancelled = 0;

  for (const r of unique) {
    if (r.status === 'pending') pending++;
    else if (r.status === 'approved') approved++;
    else if (r.status === 'rejected') rejected++;
    else if (r.status === 'cancelled') cancelled++;
  }

  const total = unique.length;
  const pct = (cnt: number) => (total > 0 ? Math.round((cnt / total) * 100) : 0);

  return {
    pendingCount: pending,
    pendingPercentage: pct(pending),
    approvedCount: approved,
    approvedPercentage: pct(approved),
    rejectedCount: rejected,
    rejectedPercentage: pct(rejected),
    cancelledCount: cancelled,
    cancelledPercentage: pct(cancelled),
    totalRequests: total,
  };
}

// US07: Employees Working on Weekly Off & Holidays (KPI Count Card)
export function calculateWeeklyOffAndHolidaysWorking(
  records: EnrichedAttendanceRecord[]
): WeeklyOffHolidayWorkingSummary {
  const map = new Map<
    number,
    {
      empId: number;
      employeeName: string;
      department: string;
      daysWorked: number;
    }
  >();

  for (const r of records) {
    if (r.isWeeklyOffOrHoliday && r.productionMinutes > 0) {
      if (!map.has(r.empId)) {
        map.set(r.empId, {
          empId: r.empId,
          employeeName: r.employeeName,
          department: r.department,
          daysWorked: 0,
        });
      }
      map.get(r.empId)!.daysWorked++;
    }
  }

  const list = Array.from(map.values());
  const totalDays = list.reduce((acc, curr) => acc + curr.daysWorked, 0);

  return {
    distinctEmployeeCount: list.length,
    totalDaysWorked: totalDays,
    employees: list,
  };
}

// US08: Regularized Attendance Records (KPI Progress Bar Card)
export function calculateRegularizedRecordsProgress(
  records: EnrichedAttendanceRecord[]
): RegularizedAttendanceSummary {
  // Deduplicate per employee per date
  const uniqueMap = new Map<string, EnrichedAttendanceRecord>();
  for (const r of records) {
    const key = `${r.empId}_${r.workDate}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, r);
  }

  let regularized = 0;
  for (const r of uniqueMap.values()) {
    if (r.isRegularized || r.regularizationStatus === 'approved') {
      regularized++;
    }
  }

  const total = uniqueMap.size;
  const notRegularized = Math.max(0, total - regularized);
  const percentage = total > 0 ? Math.round((regularized / total) * 100) : 0;

  return {
    regularizedCount: regularized,
    notRegularizedCount: notRegularized,
    totalRecords: total,
    regularizationPercentage: percentage,
  };
}

// US09: Employees with Most Early Exits (Ranked Data Table)
export function calculateTopEarlyExits(
  records: EnrichedAttendanceRecord[]
): EmployeeEarlyExitRankItem[] {
  const map = new Map<
    number,
    {
      empId: number;
      empCode: string;
      employeeName: string;
      department: string;
      designation: string;
      earlyCount: number;
      lastDate: string;
    }
  >();

  for (const r of records) {
    if (r.isEarlyExit) {
      if (!map.has(r.empId)) {
        map.set(r.empId, {
          empId: r.empId,
          empCode: r.empCode,
          employeeName: r.employeeName,
          department: r.department,
          designation: r.designation,
          earlyCount: 0,
          lastDate: r.workDate,
        });
      }
      const entry = map.get(r.empId)!;
      entry.earlyCount++;
      if (r.workDate > entry.lastDate) {
        entry.lastDate = r.workDate;
      }
    }
  }

  const list = Array.from(map.values()).sort((a, b) => {
    if (b.earlyCount !== a.earlyCount) return b.earlyCount - a.earlyCount;
    return a.employeeName.localeCompare(b.employeeName);
  });

  if (list.length === 0) return [];

  // Assign ranks with ties & include ties at 5th position
  const ranked: EmployeeEarlyExitRankItem[] = [];
  let currentRank = 1;

  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i].earlyCount < list[i - 1].earlyCount) {
      currentRank = i + 1;
    }

    if (currentRank > 5) {
      break;
    }

    ranked.push({
      rank: currentRank,
      empId: list[i].empId,
      empCode: list[i].empCode,
      employeeName: list[i].employeeName,
      department: list[i].department,
      designation: list[i].designation,
      totalEarlyExits: list[i].earlyCount,
      lastEarlyExitDate: formatDateDDMMYYYY(list[i].lastDate),
    });
  }

  return ranked;
}

// US10: Weekly Total Working Hours (Heatmap Calendar)
export function calculateWeeklyWorkingHoursHeatmap(
  records: EnrichedAttendanceRecord[],
  weekStartDate?: string
): WeeklyHeatmapSummary {
  const range = weekStartDate
    ? {
        startDate: weekStartDate,
        endDate: new Date(new Date(weekStartDate).getTime() + 6 * 86400000)
          .toISOString()
          .slice(0, 10),
      }
    : getCurrentWeekRange();

  // Generate 7 days of the week: Mon to Sun
  const weekDays: Array<{ date: string; dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' }> = [];
  const start = new Date(range.startDate);
  const DOW_NAMES: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    weekDays.push({ date: dateStr, dayName: DOW_NAMES[i] });
  }

  // Filter records within this week
  const weekRecords = records.filter(
    (r) => r.workDate >= range.startDate && r.workDate <= range.endDate
  );

  // Group by Employee ID
  const employeeMap = new Map<
    number,
    {
      empId: number;
      empCode: string;
      employeeName: string;
      department: string;
      designation: string;
      recordsByDate: Map<string, EnrichedAttendanceRecord>;
    }
  >();

  // Ensure employees in records are known
  for (const r of weekRecords) {
    if (!employeeMap.has(r.empId)) {
      employeeMap.set(r.empId, {
        empId: r.empId,
        empCode: r.empCode,
        employeeName: r.employeeName,
        department: r.department,
        designation: r.designation,
        recordsByDate: new Map(),
      });
    }
    employeeMap.get(r.empId)!.recordsByDate.set(r.workDate, r);
  }

  const rows: EmployeeWeeklyHeatmapRow[] = [];
  let totalWorkingMinutesAll = 0;

  for (const emp of employeeMap.values()) {
    let empTotalMins = 0;
    const days: HeatmapDayCell[] = [];

    for (const w of weekDays) {
      const rec = emp.recordsByDate.get(w.date);
      if (rec && rec.checkInTime && rec.checkOutTime) {
        const netMins = Math.max(0, rec.productionMinutes);
        empTotalMins += netMins;

        const hours = netMins / 60;
        let intensity: HeatmapDayCell['intensityRange'] = '<4h';
        if (hours >= 10) intensity = '>10h';
        else if (hours >= 8) intensity = '8-10h';
        else if (hours >= 6) intensity = '6-8h';
        else if (hours >= 4) intensity = '4-6h';

        days.push({
          date: w.date,
          dayName: w.dayName,
          formattedHours: formatMinutesToHHMM(netMins),
          netMinutes: netMins,
          intensityRange: intensity,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          breakDurationMinutes: rec.breakMinutes,
          isNonWorkingDay: rec.isWeeklyOffOrHoliday,
          hasRecord: true,
        });
      } else if (rec && rec.isWeeklyOffOrHoliday) {
        days.push({
          date: w.date,
          dayName: w.dayName,
          formattedHours: 'Off',
          netMinutes: 0,
          intensityRange: 'off',
          checkInTime: null,
          checkOutTime: null,
          breakDurationMinutes: 0,
          isNonWorkingDay: true,
          hasRecord: true,
        });
      } else {
        days.push({
          date: w.date,
          dayName: w.dayName,
          formattedHours: '--',
          netMinutes: 0,
          intensityRange: 'empty',
          checkInTime: null,
          checkOutTime: null,
          breakDurationMinutes: 0,
          isNonWorkingDay: false,
          hasRecord: false,
        });
      }
    }

    totalWorkingMinutesAll += empTotalMins;

    rows.push({
      empId: emp.empId,
      empCode: emp.empCode,
      employeeName: emp.employeeName,
      department: emp.department,
      designation: emp.designation,
      days,
      weeklyTotalMinutes: empTotalMins,
      weeklyTotalFormatted: formatMinutesToHHMM(empTotalMins),
    });
  }

  // Sort employees alphabetically by name
  rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  const totalEmployees = rows.length;
  const avgMins = totalEmployees > 0 ? Math.round(totalWorkingMinutesAll / totalEmployees) : 0;

  return {
    weekLabel: `Week: ${formatDateDDMMYYYY(range.startDate)} - ${formatDateDDMMYYYY(range.endDate)}`,
    totalEmployees,
    overallWorkingMinutes: totalWorkingMinutesAll,
    overallWorkingFormatted: formatMinutesToHHMM(totalWorkingMinutesAll),
    averageWorkingMinutesPerEmployee: avgMins,
    averageWorkingFormatted: formatMinutesToHHMM(avgMins),
    rows,
  };
}

// US11: Daily Break Duration Trends (Line Chart)
export function calculateDailyBreakDurationTrends(
  records: EnrichedAttendanceRecord[]
): DailyBreakTrendItem[] {
  const map = new Map<
    string,
    { totalBreakMins: number; employeeCount: number; assignedLimit: number }
  >();

  // Consolidate per employee per date
  const uniqueMap = new Map<string, EnrichedAttendanceRecord>();
  for (const r of records) {
    const key = `${r.empId}_${r.workDate}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, r);
  }

  for (const r of uniqueMap.values()) {
    if (r.breakMinutes > 0) {
      if (!map.has(r.workDate)) {
        map.set(r.workDate, {
          totalBreakMins: 0,
          employeeCount: 0,
          assignedLimit: r.assignedBreakMinutes || 60,
        });
      }
      const b = map.get(r.workDate)!;
      b.totalBreakMins += r.breakMinutes;
      b.employeeCount++;
    }
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, b]) => {
      const dayNum = dateStr.slice(8, 10);
      const monthIdx = parseInt(dateStr.slice(5, 7), 10) - 1;
      const dateLabel = `${dayNum} ${MONTHS[monthIdx] || ''}`;

      const avgMins = b.employeeCount > 0 ? Math.round(b.totalBreakMins / b.employeeCount) : 0;
      const isExceeded = avgMins > b.assignedLimit;

      return {
        date: dateStr,
        dateLabel,
        totalEmployeesWithBreaks: b.employeeCount,
        totalBreakMinutes: b.totalBreakMins,
        averageBreakMinutes: avgMins,
        averageBreakFormatted: formatMinutesToHHMM(avgMins),
        assignedLimitMinutes: b.assignedLimit,
        isExceeded,
      };
    });
}
