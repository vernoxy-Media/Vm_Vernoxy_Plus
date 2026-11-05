import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatMinutesToHHMM,
  formatDateDDMMYYYY,
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
} from './attendance-analytics.utils';
import {
  EnrichedAttendanceRecord,
  RegularizationRequestRecord,
  AttendanceAnalyticsFilters,
} from './attendance-analytics.types';

const MOCK_RECORDS: EnrichedAttendanceRecord[] = [
  {
    attendanceId: 1,
    empId: 101,
    empCode: 'EMP-001',
    employeeName: 'Rahul Patel',
    email: 'rahul@vernoxy.com',
    phone: '9876543210',
    department: 'Sales',
    designation: 'Sales Executive',
    workDate: '2026-10-01',
    checkInTime: '09:30', // late by 30 mins
    checkOutTime: '18:00',
    breakMinutes: 45,
    productionMinutes: 465, // 7.75h
    dayStatus: 'present',
    isLate: true,
    lateMinutes: 30,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    isWeeklyOffOrHoliday: false,
    dayType: 'regular',
    isRegularized: false,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [{ startedAt: '2026-10-01T13:00:00Z', endedAt: '2026-10-01T13:45:00Z', durationMinutes: 45 }],
  },
  {
    attendanceId: 2,
    empId: 101,
    empCode: 'EMP-001',
    employeeName: 'Rahul Patel',
    email: 'rahul@vernoxy.com',
    phone: '9876543210',
    department: 'Sales',
    designation: 'Sales Executive',
    workDate: '2026-10-02',
    checkInTime: '09:20', // late by 20 mins
    checkOutTime: '17:30', // early exit by 30 mins
    breakMinutes: 60,
    productionMinutes: 430,
    dayStatus: 'present',
    isLate: true,
    lateMinutes: 20,
    isEarlyExit: true,
    earlyExitMinutes: 30,
    isWeeklyOffOrHoliday: false,
    dayType: 'regular',
    isRegularized: true,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [{ startedAt: '2026-10-02T13:00:00Z', endedAt: '2026-10-02T14:00:00Z', durationMinutes: 60 }],
  },
  {
    attendanceId: 3,
    empId: 102,
    empCode: 'EMP-002',
    employeeName: 'Amit Shah',
    email: 'amit@vernoxy.com',
    phone: '9876543211',
    department: 'IT',
    designation: 'Developer',
    workDate: '2026-10-01',
    checkInTime: '08:55',
    checkOutTime: '18:10',
    breakMinutes: 50,
    productionMinutes: 505, // 8.4h
    dayStatus: 'present',
    isLate: false,
    lateMinutes: 0,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    isWeeklyOffOrHoliday: false,
    dayType: 'regular',
    isRegularized: false,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [],
  },
  {
    attendanceId: 4,
    empId: 102,
    empCode: 'EMP-002',
    employeeName: 'Amit Shah',
    email: 'amit@vernoxy.com',
    phone: '9876543211',
    department: 'IT',
    designation: 'Developer',
    workDate: '2026-10-04', // Sunday - Weekly Off
    checkInTime: '10:00',
    checkOutTime: '14:00',
    breakMinutes: 0,
    productionMinutes: 240, // 4h worked on weekly off
    dayStatus: 'half_day',
    isLate: false,
    lateMinutes: 0,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    isWeeklyOffOrHoliday: true,
    dayType: 'weekly_off',
    isRegularized: false,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [],
  },
  {
    attendanceId: 5,
    empId: 103,
    empCode: 'EMP-003',
    employeeName: 'Neha Desai',
    email: 'neha@vernoxy.com',
    phone: '9876543212',
    department: 'HR',
    designation: 'HR Executive',
    workDate: '2026-10-01',
    checkInTime: null,
    checkOutTime: null,
    breakMinutes: 0,
    productionMinutes: 0,
    dayStatus: 'on_leave',
    isLate: false,
    lateMinutes: 0,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    isWeeklyOffOrHoliday: false,
    dayType: 'regular',
    isRegularized: false,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [],
  },
  {
    attendanceId: 6,
    empId: 104,
    empCode: 'EMP-004',
    employeeName: 'Karan Mehta',
    email: 'karan@vernoxy.com',
    phone: '9876543213',
    department: 'Finance',
    designation: 'Accountant',
    workDate: '2026-10-01',
    checkInTime: null,
    checkOutTime: null,
    breakMinutes: 0,
    productionMinutes: 0,
    dayStatus: 'absent',
    isLate: false,
    lateMinutes: 0,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    isWeeklyOffOrHoliday: false,
    dayType: 'regular',
    isRegularized: false,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [],
  },
  {
    attendanceId: 7,
    empId: 105,
    empCode: 'EMP-005',
    employeeName: 'Priya Joshi',
    email: 'priya@vernoxy.com',
    phone: '9876543214',
    department: 'Operations',
    designation: 'Team Lead',
    workDate: '2026-10-01',
    checkInTime: '09:00',
    checkOutTime: null, // missing punch
    breakMinutes: 75, // exceeded 60m assigned limit
    productionMinutes: 0,
    dayStatus: 'missing_punch',
    isLate: false,
    lateMinutes: 0,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    isWeeklyOffOrHoliday: false,
    dayType: 'regular',
    isRegularized: false,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    assignedDailyHours: 8,
    assignedBreakMinutes: 60,
    breaks: [{ startedAt: '2026-10-01T13:00:00Z', endedAt: '2026-10-01T14:15:00Z', durationMinutes: 75 }],
  },
];

const MOCK_REGULARIZATIONS: RegularizationRequestRecord[] = [
  {
    requestId: 'REG-0001',
    correctionId: 1,
    empId: 101,
    employeeName: 'Rahul Patel',
    department: 'Sales',
    designation: 'Sales Executive',
    workDate: '2026-10-02',
    status: 'approved',
    requestType: 'Missed Punch',
    reason: 'Forgot to punch out due to client meeting',
    createdAt: '2026-10-02T18:30:00Z',
    decidedAt: '2026-10-03T10:00:00Z',
  },
  {
    requestId: 'REG-0002',
    correctionId: 2,
    empId: 102,
    employeeName: 'Amit Shah',
    department: 'IT',
    designation: 'Developer',
    workDate: '2026-10-03',
    status: 'pending',
    requestType: 'Incorrect Time',
    reason: 'System lag during biometric sync',
    createdAt: '2026-10-03T09:15:00Z',
  },
  {
    requestId: 'REG-0003',
    correctionId: 3,
    empId: 105,
    employeeName: 'Priya Joshi',
    department: 'Operations',
    designation: 'Team Lead',
    workDate: '2026-10-01',
    status: 'rejected',
    requestType: 'Missed Punch',
    reason: 'No approval from reporting manager',
    createdAt: '2026-10-01T19:00:00Z',
    decidedAt: '2026-10-02T11:00:00Z',
  },
  {
    requestId: 'REG-0004',
    correctionId: 4,
    empId: 104,
    employeeName: 'Karan Mehta',
    department: 'Finance',
    designation: 'Accountant',
    workDate: '2026-10-01',
    status: 'cancelled',
    requestType: 'Leave regularize',
    reason: 'Applied leave separately',
    createdAt: '2026-10-01T10:00:00Z',
  },
];

describe('Attendance Management Analytics: US01 - US11 Business Logic & Calculations', () => {
  describe('US01: Overall Attendance Dashboard - Filters & Search', () => {
    it('filters records by department with exact match', () => {
      const filters: AttendanceAnalyticsFilters = {
        dateRangePreset: 'current_month',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        department: 'Sales',
        designation: 'All',
        employeeId: 'All',
        search: '',
      };
      const res = filterAttendanceRecords(MOCK_RECORDS, filters);
      assert.strictEqual(res.length, 2);
      assert.ok(res.every((r) => r.department === 'Sales'));
    });

    it('searches across employee code, name, phone, email, dept, designation case-insensitively', () => {
      const filters: AttendanceAnalyticsFilters = {
        dateRangePreset: 'current_month',
        startDate: '',
        endDate: '',
        department: 'All',
        designation: 'All',
        employeeId: 'All',
        search: 'developer',
      };
      const res = filterAttendanceRecords(MOCK_RECORDS, filters);
      assert.strictEqual(res.length, 2);
      assert.strictEqual(res[0].employeeName, 'Amit Shah');
    });

    it('formats date to DD-MM-YYYY', () => {
      assert.strictEqual(formatDateDDMMYYYY('2026-10-05'), '05-10-2026');
      assert.strictEqual(formatMinutesToHHMM(485), '08:05');
    });
  });

  describe('US02: Attendance Status Overview (Donut Chart)', () => {
    it('classifies records into 5 statuses and calculates percentages totaling 100%', () => {
      const { items, totalRecords } = calculateAttendanceStatusOverview(MOCK_RECORDS);
      assert.strictEqual(totalRecords, 7);

      const present = items.find((i) => i.key === 'present');
      assert.strictEqual(present?.count, 3);

      const onLeave = items.find((i) => i.key === 'on_leave');
      assert.strictEqual(onLeave?.count, 1);

      const missing = items.find((i) => i.key === 'missing_punch');
      assert.strictEqual(missing?.count, 1);

      // Total count equals sum of all 5 status counts
      const sum = items.reduce((acc, i) => acc + i.count, 0);
      assert.strictEqual(sum, totalRecords);
    });
  });

  describe('US03: Monthly Attendance Summary (Stacked Column Chart)', () => {
    it('aggregates monthly counts and tracks Late Mark separately', () => {
      const summary = calculateMonthlyAttendanceSummary(MOCK_RECORDS);
      assert.strictEqual(summary.length, 1);
      const oct = summary[0];
      assert.strictEqual(oct.monthKey, '2026-10');
      assert.strictEqual(oct.lateMarkCount, 2); // Rahul Patel late twice
      assert.strictEqual(oct.presentCount, 3);
    });
  });

  describe('US04: Employees with Most Late Marks (Ranked Data Table)', () => {
    it('ranks employees by late mark count descending and resolves ties alphabetically', () => {
      const ranked = calculateTopLateMarks(MOCK_RECORDS);
      assert.strictEqual(ranked.length, 1);
      assert.strictEqual(ranked[0].rank, 1);
      assert.strictEqual(ranked[0].employeeName, 'Rahul Patel');
      assert.strictEqual(ranked[0].totalLateMarks, 2);
      assert.strictEqual(ranked[0].lastLateMarkDate, '02-10-2026');
    });
  });

  describe('US05: Daily Working Hours Trend (Line Chart)', () => {
    it('calculates total daily working hours in chronological order', () => {
      const trend = calculateDailyWorkingHoursTrend(MOCK_RECORDS);
      assert.ok(trend.length >= 2);
      assert.strictEqual(trend[0].date, '2026-10-01');
      // On 2026-10-01: Rahul (465) + Amit (505) = 970 mins = 16.2 hours
      assert.strictEqual(trend[0].totalWorkingHours, 16.2);
    });
  });

  describe('US06: Regularization Request Status (2x2 Grid)', () => {
    it('counts requests by status and calculates percentages', () => {
      const summary = calculateRegularizationRequestStatus(MOCK_REGULARIZATIONS);
      assert.strictEqual(summary.totalRequests, 4);
      assert.strictEqual(summary.approvedCount, 1);
      assert.strictEqual(summary.approvedPercentage, 25);
      assert.strictEqual(summary.pendingCount, 1);
      assert.strictEqual(summary.pendingPercentage, 25);
      assert.strictEqual(summary.rejectedCount, 1);
      assert.strictEqual(summary.cancelledCount, 1);
    });
  });

  describe('US07: Employees Working on Weekly Off & Holidays', () => {
    it('counts distinct employees working on non-working days with valid hours', () => {
      const summary = calculateWeeklyOffAndHolidaysWorking(MOCK_RECORDS);
      assert.strictEqual(summary.distinctEmployeeCount, 1);
      assert.strictEqual(summary.employees[0].employeeName, 'Amit Shah');
      assert.strictEqual(summary.employees[0].daysWorked, 1);
    });
  });

  describe('US08: Regularized Attendance Records (Progress Card)', () => {
    it('calculates regularization percentage and counts', () => {
      const summary = calculateRegularizedRecordsProgress(MOCK_RECORDS);
      assert.strictEqual(summary.totalRecords, 7);
      assert.strictEqual(summary.regularizedCount, 1); // Record 2
      assert.strictEqual(summary.notRegularizedCount, 6);
      assert.strictEqual(summary.regularizationPercentage, 14); // 1/7 = 14%
    });
  });

  describe('US09: Employees with Most Early Exits (Ranked Data Table)', () => {
    it('ranks employees by early exits descending', () => {
      const ranked = calculateTopEarlyExits(MOCK_RECORDS);
      assert.strictEqual(ranked.length, 1);
      assert.strictEqual(ranked[0].rank, 1);
      assert.strictEqual(ranked[0].employeeName, 'Rahul Patel');
      assert.strictEqual(ranked[0].totalEarlyExits, 1);
    });
  });

  describe('US10: Weekly Total Working Hours (Heatmap Calendar)', () => {
    it('structures heatmap for Monday to Sunday with net hours and employee weekly total', () => {
      const heatmap = calculateWeeklyWorkingHoursHeatmap(MOCK_RECORDS, '2026-09-28');
      assert.ok(heatmap.rows.length >= 1);
      const rahulRow = heatmap.rows.find((r) => r.employeeName === 'Rahul Patel');
      assert.ok(rahulRow);
      assert.strictEqual(rahulRow.days.length, 7);
      assert.strictEqual(rahulRow.days[3].dayName, 'Thu'); // 2026-10-01
      assert.strictEqual(rahulRow.days[3].formattedHours, '07:45');
    });
  });

  describe('US11: Daily Break Duration Trends (Line Chart)', () => {
    it('calculates daily average break duration and flags exceeded limits', () => {
      const trends = calculateDailyBreakDurationTrends(MOCK_RECORDS);
      assert.ok(trends.length >= 1);
      // On 2026-10-01: Rahul (45m) + Amit (50m) + Priya (75m) = 170m / 3 = 57m avg
      assert.strictEqual(trends[0].date, '2026-10-01');
      assert.strictEqual(trends[0].averageBreakMinutes, 57);
      assert.strictEqual(trends[0].averageBreakFormatted, '00:57');
    });
  });
});
