import { Clock } from '../../domain/ports/clock.port';
import { PunchInUseCase } from './punch-in.use-case';
import { StartBreakUseCase } from './start-break.use-case';
import { EndBreakUseCase } from './end-break.use-case';
import { PunchOutUseCase } from './punch-out.use-case';
import { GetTodayAttendanceUseCase } from './get-today-attendance.use-case';
import {
  AlreadyPunchedInError,
  NotWorkingError,
  AlreadyOnBreakError,
  NotOnBreakError,
} from '../../domain/errors/attendance.errors';
import type { AttendanceRepository } from '../../domain/ports/attendance.repository.port';

class TestClock implements Clock {
  private currentTime: Date;
  constructor(initial: Date) {
    this.currentTime = new Date(initial);
  }
  now(): Date {
    return new Date(this.currentTime.getTime());
  }
  advanceMinutes(minutes: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + minutes * 60000);
  }
}

describe('AttendanceUseCases with TestClock', () => {
  let clock: TestClock;
  let inMemoryDay: any;
  let inMemoryBreaks: any[];
  let repo: AttendanceRepository;

  beforeEach(() => {
    clock = new TestClock(new Date('2026-10-16T09:00:00Z'));
    inMemoryDay = null;
    inMemoryBreaks = [];

    repo = {
      findDayByEmpAndDate: jest.fn().mockImplementation(async (empId, workDate) => {
        return inMemoryDay;
      }),
      findDaysByEmpAndMonth: jest.fn().mockResolvedValue([]),
      createAttendanceDay: jest.fn().mockImplementation(async (data) => {
        inMemoryDay = {
          attendanceId: 1,
          empId: data.empId,
          workDate: data.workDate,
          checkInAt: data.checkInAt,
          checkOutAt: null,
          productionMinutes: 0,
          breakMinutes: 0,
          dayStatus: 'present',
        };
        return inMemoryDay;
      }),
      closeAttendanceDayWithBreak: jest.fn().mockImplementation(async (attId, checkOutAt, breakMins, prodMins, dayStatus) => {
        inMemoryDay.checkOutAt = checkOutAt;
        inMemoryDay.breakMinutes = breakMins;
        inMemoryDay.productionMinutes = prodMins;
        inMemoryDay.dayStatus = dayStatus;
        // Auto-close open break
        const open = inMemoryBreaks.find((b) => !b.endedAt);
        if (open) {
          open.endedAt = checkOutAt;
          open.durationMinutes = Math.floor((checkOutAt.getTime() - open.startedAt.getTime()) / 60000);
        }
        return inMemoryDay;
      }),
      findOpenBreak: jest.fn().mockImplementation(async (attId) => {
        return inMemoryBreaks.find((b) => !b.endedAt) || null;
      }),
      findBreaksByAttendanceId: jest.fn().mockImplementation(async (attId) => {
        return inMemoryBreaks;
      }),
      findBreaksByAttendanceIds: jest.fn().mockResolvedValue([]),
      createBreak: jest.fn().mockImplementation(async (attId, startedAt) => {
        const brk = {
          breakId: inMemoryBreaks.length + 1,
          attendanceId: attId,
          startedAt,
          endedAt: null,
          durationMinutes: 0,
        };
        inMemoryBreaks.push(brk);
        return brk;
      }),
      closeBreak: jest.fn().mockImplementation(async (breakId, endedAt) => {
        const brk = inMemoryBreaks.find((b) => b.breakId === breakId);
        if (brk) {
          brk.endedAt = endedAt;
          brk.durationMinutes = Math.floor((endedAt.getTime() - brk.startedAt.getTime()) / 60000);
        }
        return brk;
      }),
      createCorrection: jest.fn(),
      findCorrectionById: jest.fn(),
      findCorrectionByEmpAndDate: jest.fn(),
      approveCorrection: jest.fn(),
      rejectCorrection: jest.fn(),
      adminUpsertDay: jest.fn(),
      getEmployeeProfile: jest.fn().mockResolvedValue({ empId: 1, status: 'active', joiningDate: '2026-01-01', exitDate: null }),
      getDashboardMonthData: jest.fn(),
      findDayDetail: jest.fn(),
      getTeamAttendance: jest.fn(),
      getAttendanceCsvReport: jest.fn(),
    };
  });

  it('runs complete workday lifecycle: Punch In -> Start Break -> End Break -> Punch Out', async () => {
    const punchInUseCase = new PunchInUseCase(repo, clock);
    const startBreakUseCase = new StartBreakUseCase(repo, clock);
    const endBreakUseCase = new EndBreakUseCase(repo, clock);
    const punchOutUseCase = new PunchOutUseCase(repo, clock);
    const getTodayUseCase = new GetTodayAttendanceUseCase(repo, clock);

    // 1. Initial status: not_started
    const initToday = await getTodayUseCase.execute(1);
    expect(initToday.state).toBe('not_started');

    // 2. Punch In at 09:00:00
    const punchedIn = await punchInUseCase.execute(1);
    expect(punchedIn.state).toBe('working');
    expect(punchedIn.check_in_at).toBe('2026-10-16T09:00:00.000Z');

    // Trying to punch in again throws AlreadyPunchedInError
    await expect(punchInUseCase.execute(1)).rejects.toThrow(AlreadyPunchedInError);

    // 3. Advance clock by 3 hours to 12:00:00 and Start Break
    clock.advanceMinutes(180);
    const onBreak = await startBreakUseCase.execute(1);
    expect(onBreak.state).toBe('on_break');

    // Trying to start break again throws AlreadyOnBreakError
    await expect(startBreakUseCase.execute(1)).rejects.toThrow(AlreadyOnBreakError);

    // 4. Advance clock by 45 minutes to 12:45:00 and End Break
    clock.advanceMinutes(45);
    const resumeWork = await endBreakUseCase.execute(1);
    expect(resumeWork.state).toBe('working');
    expect(resumeWork.break_minutes_so_far).toBe(45);

    // Trying to end break again throws NotOnBreakError
    await expect(endBreakUseCase.execute(1)).rejects.toThrow(NotOnBreakError);

    // 5. Advance clock by 5 hours to 17:45:00 and Punch Out
    clock.advanceMinutes(300);
    const doneDay = await punchOutUseCase.execute(1);
    expect(doneDay.state).toBe('done');
    expect(doneDay.check_out_at).toBe('2026-10-16T17:45:00.000Z');
    expect(doneDay.break_minutes_so_far).toBe(45);
    // Total span: 09:00 to 17:45 = 8h 45m = 525m. Break: 45m. Production: 480m = 8h
    expect(doneDay.production_minutes).toBe(480);
  });

  it('auto-ends active break when Punch Out is called during a break', async () => {
    const punchInUseCase = new PunchInUseCase(repo, clock);
    const startBreakUseCase = new StartBreakUseCase(repo, clock);
    const punchOutUseCase = new PunchOutUseCase(repo, clock);

    // Punch in at 09:00:00
    await punchInUseCase.execute(1);

    // Start break at 13:00:00 (after 4 hours)
    clock.advanceMinutes(240);
    await startBreakUseCase.execute(1);

    // Punch out directly at 13:30:00 while on break
    clock.advanceMinutes(30);
    const doneDay = await punchOutUseCase.execute(1);

    expect(doneDay.state).toBe('done');
    expect(doneDay.break_minutes_so_far).toBe(30);
    expect(doneDay.production_minutes).toBe(240);
    expect(repo.closeAttendanceDayWithBreak).toHaveBeenCalledWith(
      1,
      new Date('2026-10-16T13:30:00.000Z'),
      30,
      240,
      'half_day',
    );
  });

  it('rejects repeated Punch Out with AlreadyPunchedOutError when day is already closed', async () => {
    const punchInUseCase = new PunchInUseCase(repo, clock);
    const punchOutUseCase = new PunchOutUseCase(repo, clock);

    await punchInUseCase.execute(1);
    clock.advanceMinutes(480);
    await punchOutUseCase.execute(1);

    await expect(punchOutUseCase.execute(1)).rejects.toThrow('Already punched out today');
  });
});
