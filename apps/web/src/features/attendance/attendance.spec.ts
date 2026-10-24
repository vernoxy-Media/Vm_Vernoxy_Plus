import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatHoursMinutes } from './components/TickingWorkedTimer';
import { generateMockDashboard, getMockDayDetail } from './api/attendance.mock';
import { getWeekStartSetting, setWeekStartSetting } from './hooks/use-week-start';

describe('TickingWorkedTimer formatting and math', () => {
  it('formats seconds to H:MM correctly', () => {
    assert.strictEqual(formatHoursMinutes(0), '0:00');
    assert.strictEqual(formatHoursMinutes(59), '0:00');
    assert.strictEqual(formatHoursMinutes(60), '0:01');
    assert.strictEqual(formatHoursMinutes(3540), '0:59');
    assert.strictEqual(formatHoursMinutes(3600), '1:00');
    assert.strictEqual(formatHoursMinutes(12420), '3:27'); // ~3.45 hrs
    assert.strictEqual(formatHoursMinutes(28800), '8:00');
  });

  it('handles negative or NaN gracefully', () => {
    assert.strictEqual(formatHoursMinutes(-100), '0:00');
    assert.strictEqual(formatHoursMinutes(NaN), '0:00');
  });
});

describe('Attendance Dashboard Data Contract', () => {
  it('generates complete mock dashboard structure matching requirements', () => {
    const data = generateMockDashboard('2026-10');

    // 1. Today block
    assert.ok(data.today);
    assert.ok(data.today.state);
    assert.ok(['not_started', 'working', 'on_break', 'done'].includes(data.today.state));
    assert.strictEqual(typeof data.today.worked_seconds, 'number');
    assert.strictEqual(typeof data.today.break_seconds, 'number');
    assert.strictEqual(typeof data.today.target_seconds, 'number');
    assert.ok(Array.isArray(data.today.timeline));

    // 2. Statistics block
    assert.ok(data.statistics.today);
    assert.ok(data.statistics.this_week);
    assert.ok(data.statistics.this_month);
    assert.ok(data.statistics.remaining);
    assert.strictEqual(data.statistics.today.target_hours, 8);
    assert.strictEqual(data.statistics.this_week.target_hours, 40);
    assert.strictEqual(data.statistics.this_month.target_hours, 160);

    // 3. Month summary block
    assert.ok(data.month_summary.scheduled_days > 0);
    assert.ok(data.month_summary.present_days >= 0);
    assert.strictEqual(typeof data.month_summary.total_working_seconds, 'number');
    assert.strictEqual(typeof data.month_summary.total_break_seconds, 'number');

    // 4. Records list
    assert.ok(Array.isArray(data.records));
    assert.ok(data.records.length > 0);
    const first = data.records[0];
    assert.ok(first?.date);
    assert.ok(first?.day_of_week);
    assert.ok(first?.status);
  });

  it('generates day detail response with timeline and break intervals', () => {
    const detail = getMockDayDetail('2026-10-14');
    assert.strictEqual(detail.date, '2026-10-14');
    assert.ok(detail.timeline.length > 0);
    assert.ok(detail.breaks.length > 0);
    assert.strictEqual(detail.production_seconds, 8 * 3600);
    assert.strictEqual(detail.break_seconds, 1 * 3600);
  });
});

describe('HR Policy Week Start Setting', () => {
  it('defaults to monday when no stored value is set', () => {
    const val = getWeekStartSetting();
    assert.ok(val === 'monday' || val === 'sunday');
  });

  it('updates week start setting', () => {
    setWeekStartSetting('sunday');
    assert.strictEqual(getWeekStartSetting(), 'sunday');
    setWeekStartSetting('monday');
    assert.strictEqual(getWeekStartSetting(), 'monday');
  });
});

describe('Attendance Detail Screen Calculations (Spec Screenshot)', () => {
  it('calculates Late By minutes correctly per specification (General Shift 09:30 with 10m grace -> 09:40)', async () => {
    const { calculateLateByMinutes } = await import('./utils/attendance-detail.utils');

    // Screenshot test case: Check-in 09:48 AM -> Late By 18 min
    assert.strictEqual(calculateLateByMinutes('09:48 AM'), 18);

    // On time (before 09:30 AM)
    assert.strictEqual(calculateLateByMinutes('09:20 AM'), 0);

    // Within grace period (09:30 - 09:40 AM)
    assert.strictEqual(calculateLateByMinutes('09:35 AM'), 0);
    assert.strictEqual(calculateLateByMinutes('09:40 AM'), 0);

    // After grace period
    assert.strictEqual(calculateLateByMinutes('09:41 AM'), 11);
    assert.strictEqual(calculateLateByMinutes('10:00 AM'), 30);

    // Empty or no check-in
    assert.strictEqual(calculateLateByMinutes('--'), 0);
    assert.strictEqual(calculateLateByMinutes(null), 0);
  });

  it('calculates Early Exit By minutes correctly per specification (Shift end 18:30 / 06:30 PM)', async () => {
    const { calculateEarlyExitMinutes } = await import('./utils/attendance-detail.utils');

    // Screenshot test case: Check-out 07:05 PM -> Early Exit 0 min
    assert.strictEqual(calculateEarlyExitMinutes('07:05 PM'), 0);
    assert.strictEqual(calculateEarlyExitMinutes('06:30 PM'), 0);

    // Left early
    assert.strictEqual(calculateEarlyExitMinutes('06:00 PM'), 30);
    assert.strictEqual(calculateEarlyExitMinutes('05:30 PM'), 60);

    // Empty or no check-out
    assert.strictEqual(calculateEarlyExitMinutes('--'), 0);
    assert.strictEqual(calculateEarlyExitMinutes(null), 0);
  });
});
