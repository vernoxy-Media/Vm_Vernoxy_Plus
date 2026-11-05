import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  Db,
  DayCountResult,
  Duration,
  LeaveCoreService,
  LeaveEmployee,
  LeaveSettings,
  LeaveTypeRow,
  PolicyRule,
} from './leave-core.service';
import { BalanceRow, LeaveBalanceService } from './leave-balance.service';
import { LeaveNotifierService } from './leave-notifier.service';
import {
  AddLeaveForEmployeeDto,
  AdjustBalanceDto,
  AdminCancelLeaveDto,
  ApplyLeaveDto,
  BulkAdjustBalanceDto,
  CalculateLeaveDaysDto,
  DecideCancellationDto,
  LeaveRequestsQueryDto,
  RequestCancellationDto,
  ReviewLeaveRequestDto,
  SetOpeningBalanceDto,
  WithdrawLeaveDto,
} from '../../presentation/dto/leave.dto';
import {
  addDays,
  diffDays,
  fmtDate,
  fmtDayMonth,
  isHalfStep,
  isValidDateStr,
  leaveYearLabel,
  leaveYearOf,
  leaveYearRange,
  num,
  round2,
  toDateStr,
  todayStr,
} from '../../domain/leave-dates';

export type ValidationMode = 'EMPLOYEE' | 'ADMIN_ADD' | 'APPROVE';

export interface Issue {
  field: string;
  code: string;
  message: string;
}

export interface Viewer {
  empId: number;
  isAdmin: boolean;
}

interface ValidationInput {
  empId: number;
  typeId: number;
  from: string;
  to: string;
  duration: Duration;
  reason?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  mode: ValidationMode;
  request?: any;
}

interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  settings: LeaveSettings;
  emp: LeaveEmployee;
  type: LeaveTypeRow | null;
  rule: PolicyRule | null;
  calc: DayCountResult | null;
  leaveYear: number | null;
  balance: BalanceRow | null;
  available: number | null;
  pending: number;
  balanceAfter: number | null;
  attachmentRequired: boolean;
  isShortNotice: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  CANCELLATION_REQUESTED: 'Cancellation Requested',
  CANCELLED: 'Cancelled',
};

const ATTENDANCE_CODE: Record<string, string> = {
  present: 'P',
  completed: 'P',
  half_day: 'HD',
  short: 'HD',
  incomplete: 'MP',
  missing_punch: 'MP',
};

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
    private readonly balances: LeaveBalanceService,
    private readonly notifier: LeaveNotifierService,
  ) {}

  // ===========================================================================
  // Validation (BFD Section 5, Part 3 and Section 6, Parts 3-4)
  // ===========================================================================

  async validate(input: ValidationInput): Promise<ValidationResult> {
    const settings = await this.core.getSettings();
    const emp = await this.core.getEmployee(input.empId);
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const self = input.mode === 'EMPLOYEE';
    const today = todayStr();
    const err = (field: string, code: string, message: string) => errors.push({ field, code, message });

    const result: ValidationResult = {
      errors, warnings, settings, emp,
      type: null, rule: null, calc: null, leaveYear: null, balance: null,
      available: null, pending: 0, balanceAfter: null, attachmentRequired: false, isShortNotice: false,
    };

    if (emp.status !== 'Active') {
      err('emp_id', 'NOT_ACTIVE', self
        ? 'Leave can be applied only by active employees.'
        : `Leave can be added only for active employees. ${emp.name} is ${emp.status}.`);
      return result;
    }
    if (!emp.leave_policy_id) {
      err('leave_type_id', 'NO_POLICY', self
        ? 'No leave policy is assigned to you. Please contact the Admin.'
        : `No leave policy is assigned to ${emp.name}. Pick a policy in the Employee Profile first.`);
      return result;
    }

    let type: LeaveTypeRow | null = null;
    try {
      type = await this.core.getLeaveType(input.typeId);
    } catch {
      err('leave_type_id', 'REQUIRED', 'Please fill this field.');
      return result;
    }
    result.type = type;
    const rule = await this.core.getRule(emp.leave_policy_id, type.leave_type_id);
    result.rule = rule;
    if (!rule) {
      err('leave_type_id', 'NOT_IN_POLICY', `${type.name} is not part of ${self ? 'your' : `${emp.name}'s`} Leave Policy.`);
      return result;
    }
    if (type.status !== 'ACTIVE' && input.mode !== 'APPROVE') {
      err('leave_type_id', 'TYPE_INACTIVE', 'This leave type is no longer in use. Please choose another.');
      return result;
    }
    if (!this.core.appliesToEmployee(type, emp)) {
      err('leave_type_id', 'NOT_FOR_GENDER', `${type.name} is not available for ${self ? 'you' : emp.name}.`);
      return result;
    }

    const { from, to, duration } = input;
    if (!isValidDateStr(from)) err('from_date', 'REQUIRED', 'Please fill this field.');
    if (!isValidDateStr(to)) err('to_date', 'REQUIRED', 'Please fill this field.');
    if (errors.length) return result;

    if (to < from) err('to_date', 'DATE_ORDER', 'The To Date cannot be before the From Date.');
    if (duration !== 'FULL_DAY') {
      if (from !== to) err('to_date', 'HALF_DAY_SINGLE', 'A half day must be a single date.');
      if (!type.half_day_allowed) err('duration', 'NO_HALF_DAY', `${type.name} cannot be taken as a half day.`);
    }
    if (from < emp.joining_date) {
      err('from_date', 'BEFORE_JOINING', self
        ? `You cannot apply for leave before your joining date (${fmtDate(emp.joining_date)}).`
        : `Leave cannot be added before ${emp.name}'s joining date (${fmtDate(emp.joining_date)}).`);
    }
    if (emp.termination_date && to > emp.termination_date) {
      err('to_date', 'AFTER_TERMINATION', `Leave cannot go beyond the Termination Date (${fmtDate(emp.termination_date)}).`);
    }
    const yFrom = leaveYearOf(from, settings.start_month);
    const yTo = leaveYearOf(to, settings.start_month);
    result.leaveYear = yFrom;
    if (yFrom !== yTo) err('to_date', 'ACROSS_YEARS', 'Please apply separately for dates in each leave year.');
    const currentYear = leaveYearOf(today, settings.start_month);
    if (yFrom > currentYear) {
      const { start } = leaveYearRange(yFrom, settings.start_month);
      err('from_date', 'NEXT_YEAR', `Leave for the ${leaveYearLabel(yFrom, settings.start_month)} leave year can be applied from its first day (${fmtDate(start)}).`);
    }
    if (input.mode === 'EMPLOYEE' && from < today) {
      const back = diffDays(from, today);
      if (!rule.backdated_days) {
        err('from_date', 'BACKDATED', `${type.name} cannot be applied for past dates.`);
      } else if (back > rule.backdated_days) {
        err('from_date', 'BACKDATED', `${type.name} can be applied up to ${rule.backdated_days} days after.`);
      }
    }
    if (input.mode === 'APPROVE' && from < today && !settings.approve_after_leave_started) {
      err('from_date', 'ALREADY_STARTED',
        'This leave has already started. Approving leave after it has started is turned off in Leave Settings.');
    }
    if (errors.length) return result;

    // Leave Days
    let calc: DayCountResult;
    try {
      calc = await this.core.countLeaveDays(input.empId, from, to, duration, settings);
    } catch (e: any) {
      const resp = e?.getResponse?.();
      err('from_date', resp?.code || 'SHIFT_NOT_SET', resp?.message || e?.message || 'Leave days cannot be counted.');
      return result;
    }
    result.calc = calc;
    if (calc.leave_days <= 0) {
      err('to_date', 'NO_LEAVE_DAYS', 'The dates you chose are Weekly Offs or Holidays. There is no leave to apply for.');
      return result;
    }
    if (rule.max_at_once && calc.leave_days > rule.max_at_once) {
      err('to_date', 'MAX_AT_ONCE', `${type.name} can be taken for up to ${this.core.fmtDays(rule.max_at_once).replace('.0', '')} days at a time.`);
    }
    if (!rule.allowed_during_probation && emp.probation_end_date && from < emp.probation_end_date) {
      err('leave_type_id', 'PROBATION', self
        ? `${type.name} can be taken after your probation ends on ${fmtDate(emp.probation_end_date)}.`
        : `${type.name} can be taken after ${emp.name}'s probation ends on ${fmtDate(emp.probation_end_date)}.`);
    }

    const counted = calc.counted.map((d) => ({ date: d.date, part: d.part }));
    const overlap = await this.core.findOverlap(input.empId, counted, input.request?.request_id ?? null);
    if (overlap) {
      err('from_date', 'OVERLAP', self
        ? `You already have leave on ${fmtDayMonth(overlap.date)} (${overlap.request_no}).`
        : `${emp.name} already has leave on ${fmtDayMonth(overlap.date)} (${overlap.request_no}).`);
    }
    if (duration === 'FULL_DAY') {
      const checkedIn = await this.core.findCheckIn(input.empId, counted.map((d) => d.date));
      if (checkedIn) {
        const first = emp.name.split(' ')[0];
        err('from_date', 'CHECKED_IN', input.mode === 'APPROVE'
          ? `${emp.name} checked in on ${fmtDayMonth(checkedIn)}. A full-day leave cannot be approved for this day. Reject the request or ask ${first} to apply for a half day.`
          : self
            ? `You checked in on ${fmtDayMonth(checkedIn)}. Apply for a half day instead.`
            : `${emp.name} checked in on ${fmtDayMonth(checkedIn)}. Add a half day instead.`);
      }
    }
    const locked = await this.core.findLockedMonth(calc.days.map((d) => d.date));
    if (locked) {
      err('from_date', 'LOCKED', self
        ? `Attendance for ${locked} is locked. Please contact the Admin.`
        : `Attendance for ${locked} is locked.`);
    }

    // Balance
    if (type.balance_tracked) {
      const row = await this.balances.ensureRow(this.prisma, input.empId, type.leave_type_id, yFrom);
      result.balance = row;
      const ownBooked = input.mode === 'APPROVE' && input.request?.status === 'PENDING' ? num(input.request.leave_days) : 0;
      const available = round2(row.available + ownBooked);
      result.available = available;
      result.pending = round2(row.days_booked - ownBooked);
      result.balanceAfter = round2(available - calc.leave_days);
      if (available + 0.001 < calc.leave_days) {
        const lwp = await this.findUnpaidNoLimitType(emp.leave_policy_id);
        err('leave_type_id', 'NOT_ENOUGH_BALANCE', input.mode === 'APPROVE'
          ? `${emp.name} has ${this.core.fmtDays(available)} days of ${type.name} available. This request needs ${this.core.fmtDays(calc.leave_days)}.`
          : `${self ? 'You have' : `${emp.name} has`} ${this.core.fmtDays(available)} days of ${type.name} available. This request needs ${this.core.fmtDays(calc.leave_days)}.${lwp && lwp.leave_type_id !== type.leave_type_id ? ` You can apply for the rest as ${lwp.name}.` : ''}`);
      }
    }

    // Attachment
    if (rule.attachment_after_days !== null && calc.leave_days > rule.attachment_after_days) {
      result.attachmentRequired = true;
      if (input.mode !== 'APPROVE' && !input.attachmentUrl) {
        err('attachment', 'ATTACHMENT_REQUIRED',
          `Please attach a medical certificate or supporting document for ${type.name} of more than ${this.core.fmtDays(rule.attachment_after_days).replace('.0', '')} days.`);
      }
    }
    if (input.mode !== 'APPROVE' && input.attachmentUrl) {
      const fileError = await this.checkAttachment(input.attachmentUrl, input.attachmentName);
      if (fileError) err('attachment', 'FILE_TYPE', fileError);
    }

    // Reason
    if (input.mode !== 'APPROVE' && input.reason !== undefined) {
      const len = (input.reason || '').trim().length;
      if (len === 0) err('reason', 'REQUIRED', 'Please fill this field.');
      else if (len < 10 || len > 500) err('reason', 'REASON_LENGTH', 'Please write a reason of 10 to 500 characters.');
    }

    // Short notice (warning)
    if (input.mode === 'EMPLOYEE' && rule.min_notice_days > 0 && diffDays(today, from) < rule.min_notice_days) {
      result.isShortNotice = true;
      warnings.push({
        field: 'from_date',
        code: 'SHORT_NOTICE',
        message: `${type.name} needs ${rule.min_notice_days} day${rule.min_notice_days === 1 ? '' : 's'}' notice. Your request will be marked "Short notice" for the Admin.`,
      });
    }
    return result;
  }

  private async findUnpaidNoLimitType(policyId: number | null): Promise<LeaveTypeRow | null> {
    if (!policyId) return null;
    const rules = await this.core.getPolicyRules(policyId);
    const r = rules.find((x) => !x.is_paid && !x.balance_tracked && x.status === 'ACTIVE');
    return r ? (r as any) : null;
  }

  private async checkAttachment(url: string, name?: string | null): Promise<string | null> {
    const msg = 'Only PDF, JPG or PNG up to 5 MB.';
    const fileName = (name || url).toLowerCase();
    if (!/\.(pdf|jpe?g|png)(\?.*)?$/.test(fileName)) return msg;
    const [att] = await this.prisma.$queryRaw<any[]>`
      SELECT mime_type, file_size_bytes FROM attachments WHERE file_url = ${url} AND deleted_at IS NULL LIMIT 1;
    `;
    if (att) {
      const mime = String(att.mime_type || '').toLowerCase();
      if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(mime)) return msg;
      if (Number(att.file_size_bytes) > 5 * 1024 * 1024) return msg;
    }
    return null;
  }

  private throwIfErrors(v: ValidationResult) {
    if (v.errors.length) {
      throw new BadRequestException({
        message: v.errors[0].message,
        field: v.errors[0].field,
        code: v.errors[0].code,
        errors: v.errors,
      });
    }
  }

  // ===========================================================================
  // Preview (Leave days box on the Apply Leave form)
  // ===========================================================================

  async preview(viewer: Viewer, dto: CalculateLeaveDaysDto) {
    const forOther = dto.emp_id && dto.emp_id !== viewer.empId;
    if (forOther && !viewer.isAdmin) throw new ForbiddenException('You can preview only your own leave.');
    const empId = forOther ? dto.emp_id! : viewer.empId;
    const v = await this.validate({
      empId,
      typeId: dto.leave_type_id,
      from: dto.from_date,
      to: dto.to_date,
      duration: dto.duration,
      mode: forOther ? 'ADMIN_ADD' : 'EMPLOYEE',
    });
    return {
      leave_days: v.calc?.leave_days ?? 0,
      days: v.calc?.days ?? [],
      counted_dates: v.calc?.counted.map((d) => d.note) ?? [],
      excluded_notes: v.calc?.excluded_notes ?? [],
      balance_tracked: v.type?.balance_tracked ?? true,
      available: v.available,
      pending: v.pending,
      balance_after: v.balanceAfter,
      attachment_required: v.attachmentRequired,
      attachment_after_days: v.rule?.attachment_after_days ?? null,
      is_short_notice: v.isShortNotice,
      // Attachment and reason are checked on submit; the preview only hints.
      errors: v.errors.filter((e) => e.code !== 'ATTACHMENT_REQUIRED'),
      warnings: v.warnings,
    };
  }

  // ===========================================================================
  // My Leave
  // ===========================================================================

  async getMyLeaveOverview(empId: number, yearParam?: number) {
    const settings = await this.core.getSettings();
    try {
      await this.balances.runCreditsForEmployee(empId, todayStr(), settings);
    } catch {
      /* credits are best effort here; the scheduler retries */
    }
    const emp = await this.core.getEmployee(empId);
    const today = todayStr();
    const currentYear = leaveYearOf(today, settings.start_month);
    const year = yearParam || currentYear;
    const range = leaveYearRange(year, settings.start_month);

    const balances = emp.leave_policy_id ? await this.buildBalanceCards(emp, year, settings) : [];
    const requests = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.emp_id, r.leave_type_id, r.is_paid, r.duration, r.from_date, r.to_date,
             r.leave_days, r.reason, r.attachment_url, r.is_short_notice, r.status, r.applied_at, r.decided_at,
             r.decision_remarks, r.cancellation_reason, r.cancellation_remarks, r.added_by_admin, r.leave_year,
             t.name AS leave_type_name, t.code AS leave_type_code, t.calendar_color,
             d.name AS decided_by_name
      FROM leave_requests r
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      LEFT JOIN employees d ON d.emp_id = r.decided_by
      WHERE r.emp_id = ${empId}
        AND COALESCE(r.leave_year, EXTRACT(YEAR FROM r.from_date)::int) = ${year}
      ORDER BY (r.status = 'PENDING') DESC, r.applied_at DESC;
    `;

    const years = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT leave_year FROM (
        SELECT leave_year FROM leave_balances WHERE emp_id = ${empId}
        UNION SELECT COALESCE(leave_year, EXTRACT(YEAR FROM from_date)::int) FROM leave_requests WHERE emp_id = ${empId}
      ) x WHERE leave_year IS NOT NULL ORDER BY leave_year DESC;
    `;
    const yearOptions = Array.from(new Set([currentYear, ...years.map((y) => Number(y.leave_year))]))
      .filter((y) => y <= currentYear)
      .sort((a, b) => b - a)
      .map((y) => ({ value: y, label: leaveYearLabel(y, settings.start_month) }));

    return {
      employee: {
        emp_id: emp.emp_id,
        name: emp.name,
        emp_code: emp.emp_code,
        department_name: emp.department_name,
        status: emp.status,
        joining_date: emp.joining_date,
        probation_end_date: emp.probation_end_date,
        reporting_manager_name: emp.reporting_manager_name,
      },
      has_policy: Boolean(emp.leave_policy_id),
      can_apply: Boolean(emp.leave_policy_id) && emp.status === 'Active',
      policy_name: emp.policy_name,
      current_year: currentYear,
      leave_year: year,
      leave_year_label: leaveYearLabel(year, settings.start_month),
      leave_year_range: range,
      year_options: yearOptions,
      balances,
      apply_types: emp.leave_policy_id ? await this.getApplyTypes(emp, settings) : [],
      requests: requests.map((r) => this.mapRequestRow(r, today)),
    };
  }

  /** Leave types offered on the Apply Leave form (BFD 5.1 marker 1). */
  async getApplyTypes(emp: LeaveEmployee, settings: LeaveSettings) {
    const today = todayStr();
    const rules = await this.core.getPolicyRules(emp.leave_policy_id!);
    const year = leaveYearOf(today, settings.start_month);
    const out: any[] = [];
    for (const r of rules) {
      if (r.status !== 'ACTIVE') continue;
      if (!this.core.appliesToEmployee(r, emp)) continue;
      if (!r.allowed_during_probation && emp.probation_end_date && today < emp.probation_end_date) continue;
      let available: number | null = null;
      let pending = 0;
      if (r.balance_tracked) {
        const row = await this.balances.ensureRow(this.prisma, emp.emp_id, r.leave_type_id, year);
        available = row.available;
        pending = row.days_booked;
      }
      out.push({
        leave_type_id: r.leave_type_id,
        name: r.name,
        code: r.code,
        is_paid: r.is_paid,
        balance_tracked: r.balance_tracked,
        half_day_allowed: r.half_day_allowed,
        description: r.description,
        calendar_color: r.calendar_color,
        available,
        pending,
        max_at_once: r.max_at_once,
        min_notice_days: r.min_notice_days,
        backdated_days: r.backdated_days,
        attachment_after_days: r.attachment_after_days,
      });
    }
    return out;
  }

  private async buildBalanceCards(emp: LeaveEmployee, year: number, settings: LeaveSettings) {
    const today = todayStr();
    const rules = await this.core.getPolicyRules(emp.leave_policy_id!);
    const usage = await this.prisma.$queryRaw<any[]>`
      SELECT r.leave_type_id,
        COALESCE(SUM(d.day_fraction) FILTER (WHERE r.status IN ('APPROVED','CANCELLATION_REQUESTED') AND d.leave_date <= ${today}::date), 0) AS taken_past,
        COALESCE(SUM(d.day_fraction) FILTER (WHERE r.status IN ('APPROVED','CANCELLATION_REQUESTED') AND d.leave_date > ${today}::date), 0) AS approved_ahead,
        COALESCE(SUM(d.day_fraction) FILTER (WHERE r.status = 'PENDING'), 0) AS pending
      FROM leave_requests r
      JOIN leave_request_days d ON d.request_id = r.request_id
      WHERE r.emp_id = ${emp.emp_id} AND COALESCE(r.leave_year, EXTRACT(YEAR FROM r.from_date)::int) = ${year}
      GROUP BY r.leave_type_id;
    `;
    const nearestExpiry = await this.balances.nearestCompOffExpiry(emp.emp_id);
    const cards: any[] = [];
    for (const r of rules) {
      const u = usage.find((x) => x.leave_type_id === r.leave_type_id);
      const takenPast = num(u?.taken_past);
      const ahead = num(u?.approved_ahead);
      const pendingDays = num(u?.pending);
      if (!r.balance_tracked) {
        if (r.status !== 'ACTIVE' && takenPast + ahead + pendingDays === 0) continue;
        cards.push({
          leave_type_id: r.leave_type_id, leave_type_name: r.name, leave_type_code: r.code,
          is_paid: r.is_paid, balance_tracked: false, calendar_color: r.calendar_color,
          credited: null, taken: takenPast, approved_ahead: ahead, pending: pendingDays, available: null,
          nearest_expiry: null,
        });
        continue;
      }
      const row = await this.balances.ensureRow(this.prisma, emp.emp_id, r.leave_type_id, year);
      cards.push({
        leave_type_id: r.leave_type_id,
        leave_type_name: r.name,
        leave_type_code: r.code,
        is_paid: r.is_paid,
        balance_tracked: true,
        calendar_color: r.calendar_color,
        opening_balance: row.opening_balance,
        credited: round2(row.opening_balance + row.credited_days + row.carried_forward_days + Math.max(0, row.adjusted_days)),
        carried_forward: row.carried_forward_days,
        adjusted: row.adjusted_days,
        lapsed: row.lapsed_days,
        taken: takenPast,
        approved_ahead: ahead,
        pending: row.days_booked,
        available: row.available,
        is_comp_off: r.credit_frequency === 'FROM_APPROVED_OT',
        nearest_expiry: r.credit_frequency === 'FROM_APPROVED_OT' ? nearestExpiry : null,
      });
    }
    return cards;
  }

  private mapRequestRow(r: any, today = todayStr()) {
    const from = toDateStr(r.from_date);
    const to = toDateStr(r.to_date);
    return {
      ...r,
      from_date: from,
      to_date: to,
      leave_days: num(r.leave_days),
      status_label: STATUS_LABEL[r.status] || r.status,
      can_withdraw: r.status === 'PENDING',
      can_request_cancellation: r.status === 'APPROVED' && from >= today,
    };
  }

  // ===========================================================================
  // Apply
  // ===========================================================================

  async applyLeave(empId: number, dto: ApplyLeaveDto) {
    const v = await this.validate({
      empId,
      typeId: dto.leave_type_id,
      from: dto.from_date,
      to: dto.to_date,
      duration: dto.duration,
      reason: dto.reason,
      attachmentUrl: dto.attachment_url || null,
      attachmentName: dto.attachment_name || null,
      mode: 'EMPLOYEE',
    });
    this.throwIfErrors(v);
    const created = await this.createRequest(v, {
      empId,
      appliedBy: empId,
      dto,
      status: 'PENDING',
    });

    const days = this.core.fmtDays(v.calc!.leave_days);
    const dates = this.describeDates(created);
    await this.notifier.notify({
      recipients: await this.core.getAdminIds(),
      title: `${v.emp.name} applied for ${v.type!.name}`,
      body: `${v.emp.name} applied for ${v.type!.name} (${days} days), ${dates}. Request ${created.request_no}${v.isShortNotice ? ' · Short notice' : ''}.`,
      email: true,
      requestId: created.request_id,
      kind: 'leave_submitted',
      actorId: empId,
      employeeId: empId,
    });
    await this.notifier.notify({
      recipients: [v.emp.reporting_manager],
      title: `Copy: ${v.emp.name} applied for ${v.type!.name}`,
      body: `${v.emp.name} applied for ${v.type!.name} (${days} days), ${dates}. The Admin will decide. Request ${created.request_no}.`,
      email: true,
      requestId: created.request_id,
      kind: 'leave_submitted',
      actorId: empId,
      employeeId: empId,
    });
    await this.notifier.notify({
      recipients: [empId],
      title: `Leave request ${created.request_no} submitted`,
      body: `Your ${v.type!.name} request for ${days} days, ${dates}, is waiting for the Admin.`,
      email: true,
      requestId: created.request_id,
      kind: 'leave_submitted',
      actorId: empId,
      employeeId: empId,
    });
    return this.mapRequestRow(created);
  }

  private describeDates(r: any): string {
    const from = toDateStr(r.from_date);
    const to = toDateStr(r.to_date);
    const part = r.duration === 'FIRST_HALF' ? ' (First Half)' : r.duration === 'SECOND_HALF' ? ' (Second Half)' : '';
    return from === to ? `${fmtDate(from)}${part}` : `${fmtDate(from)} to ${fmtDate(to)}`;
  }

  private async createRequest(
    v: ValidationResult,
    p: { empId: number; appliedBy: number; dto: ApplyLeaveDto; status: 'PENDING' | 'APPROVED'; remarks?: string | null },
  ) {
    const type = v.type!;
    const calc = v.calc!;
    const year = v.leaveYear!;
    const isCompOff = v.rule?.credit_frequency === 'FROM_APPROVED_OT';

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'leave:' + p.empId}))`;
      // Re-check the parts that may have changed since validation.
      const overlap = await this.core.findOverlap(
        p.empId, calc.counted.map((d) => ({ date: d.date, part: d.part })), null, tx,
      );
      if (overlap) {
        throw new BadRequestException({
          message: `Leave already exists on ${fmtDayMonth(overlap.date)} (${overlap.request_no}).`,
          field: 'from_date',
          code: 'OVERLAP',
        });
      }
      if (type.balance_tracked) {
        const row = await this.balances.ensureRow(tx, p.empId, type.leave_type_id, year, true);
        if (row.available + 0.001 < calc.leave_days) {
          throw new BadRequestException({
            message: `Only ${this.core.fmtDays(row.available)} days of ${type.name} are available. This request needs ${this.core.fmtDays(calc.leave_days)}.`,
            field: 'leave_type_id',
            code: 'NOT_ENOUGH_BALANCE',
          });
        }
      }

      const requestNo = await this.core.nextRequestNo(tx);
      const isApproved = p.status === 'APPROVED';
      const [req] = await tx.$queryRaw<any[]>`
        INSERT INTO leave_requests (
          request_no, emp_id, leave_type_id, is_paid, duration, from_date, to_date, leave_days,
          reason, attachment_url, is_short_notice, status, applied_by, leave_year, added_by_admin,
          decided_at, decided_by, decision_remarks
        ) VALUES (
          ${requestNo}, ${p.empId}, ${type.leave_type_id}, ${type.is_paid}, ${p.dto.duration},
          ${p.dto.from_date}::date, ${p.dto.to_date}::date, ${calc.leave_days}, ${p.dto.reason.trim()},
          ${p.dto.attachment_url || null}, ${v.isShortNotice}, ${p.status}, ${p.appliedBy}, ${year}, ${isApproved},
          ${isApproved ? new Date() : null}, ${isApproved ? p.appliedBy : null}, ${p.remarks || null}
        )
        RETURNING *;
      `;
      for (const d of calc.counted) {
        await tx.$executeRaw`
          INSERT INTO leave_request_days (request_id, emp_id, leave_date, day_part, day_fraction)
          VALUES (${req.request_id}, ${p.empId}, ${d.date}::date, ${d.part}, ${d.day_count});
        `;
      }
      if (p.dto.attachment_url) {
        await tx.$executeRaw`
          UPDATE attachments SET entity_id = ${req.request_id}
          WHERE file_url = ${p.dto.attachment_url} AND entity_type = 'LEAVE_REQUEST';
        `;
      }

      const details = {
        request_no: requestNo,
        leave_type: type.name,
        is_paid: type.is_paid,
        from_date: p.dto.from_date,
        to_date: p.dto.to_date,
        duration: p.dto.duration,
        leave_days: calc.leave_days,
        short_notice: v.isShortNotice,
        attachment_name: p.dto.attachment_name || null,
      };

      if (!isApproved) {
        if (type.balance_tracked) {
          await this.balances.change(tx, p.empId, type.leave_type_id, year, { days_booked: calc.leave_days });
        }
        await this.core.logHistory(
          tx, req.request_id, 'Submitted',
          `Submitted by ${v.emp.name}: ${type.name} (${type.is_paid ? 'Paid' : 'Unpaid'}), ${calc.leave_days} days${v.isShortNotice ? ', Short notice' : ''}`,
          p.empId, details,
        );
      } else {
        const [admin] = await tx.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${p.appliedBy}`;
        await this.takeDays(tx, req, type, isCompOff, p.appliedBy, `${requestNo} added by ${admin?.name || 'Admin'}`);
        await this.core.logHistory(
          tx, req.request_id, 'Added by Admin',
          `Added by ${admin?.name || 'Admin'} for ${v.emp.name}: ${type.name}, ${calc.leave_days} days${p.remarks ? `. Remarks: ${p.remarks}` : ''}`,
          p.appliedBy, { ...details, remarks: p.remarks || null },
        );
        await this.core.logHistory(
          tx, req.request_id, 'Attendance updated',
          `Set to L: ${calc.counted.map((d) => fmtDayMonth(d.date)).join(', ')}`,
          null, { dates: calc.counted.map((d) => d.date), action: 'SET_L' },
        );
      }
      return req;
    });
    return created;
  }

  /** Moves days to "taken" (and uses Comp-off oldest first). */
  private async takeDays(db: Db, req: any, type: LeaveTypeRow, isCompOff: boolean, performedBy: number, note: string, fromBooked = false) {
    const days = num(req.leave_days);
    const year = Number(req.leave_year);
    if (!type.balance_tracked) {
      await this.balances.ledger(db, {
        empId: req.emp_id, typeId: type.leave_type_id, year, entryType: 'TAKEN', days: -days, balanceAfter: 0,
        note: `${note}: ${type.code} -${days}`, requestId: req.request_id, performedBy,
      });
      return;
    }
    const row = await this.balances.ensureRow(db, req.emp_id, type.leave_type_id, year, true);
    const after = fromBooked ? row.available : row.available - days;
    await this.balances.ledger(db, {
      empId: req.emp_id, typeId: type.leave_type_id, year, entryType: 'TAKEN', days: -days, balanceAfter: after,
      note: `${note}: ${type.code} -${days}`, requestId: req.request_id, performedBy,
    });
    await this.balances.change(db, req.emp_id, type.leave_type_id, year, fromBooked
      ? { days_booked: -days, days_taken: days }
      : { days_taken: days });
    if (isCompOff) {
      const alloc = await this.balances.consumeCompOff(db, req.emp_id, days);
      await db.$executeRaw`
        UPDATE leave_requests SET comp_off_allocation = ${JSON.stringify(alloc)}::jsonb WHERE request_id = ${req.request_id};
      `;
    }
  }

  /** Gives taken days back (cancellation). */
  private async returnDays(db: Db, req: any, performedBy: number, note: string) {
    const type = await this.core.getLeaveType(req.leave_type_id, db);
    const days = num(req.leave_days);
    const year = Number(req.leave_year);
    if (!type.balance_tracked) {
      await this.balances.ledger(db, {
        empId: req.emp_id, typeId: type.leave_type_id, year, entryType: 'RETURNED', days, balanceAfter: 0,
        note: `${note}: ${type.code} +${days}`, requestId: req.request_id, performedBy,
      });
      return;
    }
    const row = await this.balances.ensureRow(db, req.emp_id, type.leave_type_id, year, true);
    await this.balances.ledger(db, {
      empId: req.emp_id, typeId: type.leave_type_id, year, entryType: 'RETURNED', days, balanceAfter: row.available + days,
      note: `${note}: ${type.code} +${days}`, requestId: req.request_id, performedBy,
    });
    await this.balances.change(db, req.emp_id, type.leave_type_id, year, { days_taken: -days });
    if (req.comp_off_allocation) {
      const alloc = typeof req.comp_off_allocation === 'string' ? JSON.parse(req.comp_off_allocation) : req.comp_off_allocation;
      await this.balances.returnCompOff(db, req.emp_id, type.leave_type_id, year, alloc, performedBy, req.request_no);
    }
  }

  private async releaseBooked(db: Db, req: any) {
    const type = await this.core.getLeaveType(req.leave_type_id, db);
    if (!type.balance_tracked) return;
    await this.balances.change(db, req.emp_id, req.leave_type_id, Number(req.leave_year), { days_booked: -num(req.leave_days) });
  }

  private async requestDates(db: Db, requestId: number): Promise<string[]> {
    const rows = await db.$queryRaw<any[]>`
      SELECT leave_date FROM leave_request_days WHERE request_id = ${requestId} ORDER BY leave_date ASC;
    `;
    return rows.map((r) => toDateStr(r.leave_date));
  }

  private async lockRequest(db: Db, requestId: number): Promise<any> {
    const [req] = await db.$queryRaw<any[]>`SELECT * FROM leave_requests WHERE request_id = ${requestId} FOR UPDATE`;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (!req.leave_year) req.leave_year = Number(toDateStr(req.from_date).slice(0, 4));
    return req;
  }

  private async alreadyDecidedMessage(req: any): Promise<string> {
    if (req.status === 'WITHDRAWN') return 'This request was withdrawn by the employee.';
    const byId = req.status === 'CANCELLED' ? req.cancellation_decided_by : req.decided_by;
    const at = req.status === 'CANCELLED' ? req.cancellation_decided_at : req.decided_at;
    const [who] = byId ? await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${byId}` : [];
    const verb = (STATUS_LABEL[req.status] || req.status).toLowerCase();
    return `This request was already ${verb}${who ? ` by ${who.name}` : ''}${at ? ` on ${fmtDate(toDateStr(new Date(at)))}` : ''}.`;
  }

  private async assertMonthsOpen(db: Db, req: any) {
    const dates = await this.requestDates(db, req.request_id);
    const all = dates.length ? dates : [toDateStr(req.from_date), toDateStr(req.to_date)];
    const locked = await this.core.findLockedMonth(all, db);
    if (locked) {
      throw new BadRequestException({ message: `Attendance for ${locked} is locked. Please contact the Admin.`, code: 'LOCKED' });
    }
  }

  // ===========================================================================
  // Withdraw / request cancellation (employee)
  // ===========================================================================

  async withdrawLeave(requestId: number, empId: number, dto: WithdrawLeaveDto = {}, system = false) {
    const req = await this.prisma.$transaction(async (tx) => {
      const r = await this.lockRequest(tx, requestId);
      if (!system && r.emp_id !== empId) throw new ForbiddenException('You can withdraw only your own leave request.');
      if (r.status !== 'PENDING') throw new ConflictException(await this.alreadyDecidedMessage(r));
      if (!system) await this.assertMonthsOpen(tx, r);
      await tx.$executeRaw`
        UPDATE leave_requests
        SET status = 'WITHDRAWN', withdrawn_at = clock_timestamp(), withdraw_reason = ${dto.reason || null},
            is_system_action = ${system}, updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;
      await this.releaseBooked(tx, r);
      await this.core.logHistory(
        tx, requestId, 'Withdrawn',
        system ? `Withdrawn by the System: ${dto.reason || ''}`.trim() : `Withdrawn by the employee${dto.reason ? `: ${dto.reason}` : ''}`,
        system ? null : empId, { reason: dto.reason || null, system },
      );
      return r;
    });
    if (!system) {
      const emp = await this.core.getEmployee(req.emp_id);
      await this.notifier.notify({
        recipients: [...(await this.core.getAdminIds()), emp.reporting_manager],
        title: `${emp.name} withdrew ${req.request_no}`,
        body: `${emp.name} withdrew the leave request ${req.request_no} (${this.describeDates(req)}).${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
        requestId, kind: 'leave_withdrawn', actorId: empId, employeeId: req.emp_id,
      });
    }
    return { success: true, message: 'Leave request withdrawn.' };
  }

  async requestCancellation(requestId: number, empId: number, dto: RequestCancellationDto) {
    const req = await this.prisma.$transaction(async (tx) => {
      const r = await this.lockRequest(tx, requestId);
      if (r.emp_id !== empId) throw new ForbiddenException('You can ask to cancel only your own leave.');
      if (r.status !== 'APPROVED') {
        throw new BadRequestException('Cancellation can be requested only for Approved leave.');
      }
      if (toDateStr(r.from_date) < todayStr()) {
        throw new BadRequestException(
          'This leave has already started. Only the Admin can cancel it now. Please contact the Admin.',
        );
      }
      await this.assertMonthsOpen(tx, r);
      await tx.$executeRaw`
        UPDATE leave_requests
        SET status = 'CANCELLATION_REQUESTED', cancellation_reason = ${dto.cancellation_reason},
            cancellation_requested_at = clock_timestamp(), updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;
      await this.core.logHistory(tx, requestId, 'Cancellation requested', `Cancellation requested: ${dto.cancellation_reason}`, empId, {
        reason: dto.cancellation_reason,
      });
      return r;
    });
    const emp = await this.core.getEmployee(req.emp_id);
    await this.notifier.notify({
      recipients: await this.core.getAdminIds(),
      title: `${emp.name} asked to cancel ${req.request_no}`,
      body: `${emp.name} asked to cancel the approved leave ${req.request_no} (${this.describeDates(req)}). Reason: ${dto.cancellation_reason}`,
      email: true, requestId, kind: 'leave_cancellation_requested', actorId: empId, employeeId: req.emp_id,
    });
    return { success: true, message: 'Cancellation requested. The leave stays Approved until the Admin decides.' };
  }

  // ===========================================================================
  // Admin decisions
  // ===========================================================================

  private async assertNotOwnLeave(req: any, adminId: number, action: string) {
    if (req.emp_id !== adminId) return false;
    const admins = await this.core.getAdminIds();
    if (admins.some((id) => id !== adminId)) {
      throw new ForbiddenException(`Your own leave is ${action} by another Admin.`);
    }
    return true; // only Admin → self-approved
  }

  async approveLeaveRequest(requestId: number, adminId: number, dto: ReviewLeaveRequestDto) {
    const [current] = await this.prisma.$queryRaw<any[]>`SELECT * FROM leave_requests WHERE request_id = ${requestId}`;
    if (!current) throw new NotFoundException('Leave request not found.');
    if (current.status !== 'PENDING') throw new ConflictException(await this.alreadyDecidedMessage(current));
    const selfApproved = await this.assertNotOwnLeave(current, adminId, 'decided');

    const from = toDateStr(current.from_date);
    const v = await this.validate({
      empId: current.emp_id,
      typeId: current.leave_type_id,
      from,
      to: toDateStr(current.to_date),
      duration: current.duration,
      mode: 'APPROVE',
      request: { ...current, leave_year: current.leave_year ?? Number(from.slice(0, 4)) },
    });
    this.throwIfErrors(v);
    const [admin] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    const type = v.type!;

    const req = await this.prisma.$transaction(async (tx) => {
      const r = await this.lockRequest(tx, requestId);
      if (r.status !== 'PENDING') throw new ConflictException(await this.alreadyDecidedMessage(r));
      // Leave days may have changed since submission (Holiday added / shift changed): sync them first.
      const newDays = v.calc!.leave_days;
      const oldDays = num(r.leave_days);
      if (Math.abs(oldDays - newDays) > 0.001) {
        await tx.$executeRaw`DELETE FROM leave_request_days WHERE request_id = ${requestId}`;
        for (const d of v.calc!.counted) {
          await tx.$executeRaw`
            INSERT INTO leave_request_days (request_id, emp_id, leave_date, day_part, day_fraction)
            VALUES (${requestId}, ${r.emp_id}, ${d.date}::date, ${d.part}, ${d.day_count});
          `;
        }
        await tx.$executeRaw`UPDATE leave_requests SET leave_days = ${newDays} WHERE request_id = ${requestId}`;
        if (type.balance_tracked) {
          await this.balances.change(tx, r.emp_id, r.leave_type_id, Number(r.leave_year), { days_booked: round2(newDays - oldDays) });
        }
        await this.core.logHistory(tx, requestId, 'Leave days recalculated',
          `Leave Days changed from ${oldDays} to ${newDays} after a Holiday or shift change`, null,
          { old_days: oldDays, new_days: newDays });
        r.leave_days = newDays;
      }
      await tx.$executeRaw`
        UPDATE leave_requests
        SET status = 'APPROVED', decided_at = clock_timestamp(), decided_by = ${adminId},
            decision_remarks = ${dto.remarks || null}, is_self_approved = ${selfApproved}, updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;
      await this.takeDays(tx, r, type, v.rule?.credit_frequency === 'FROM_APPROVED_OT', adminId, `${r.request_no} approved`, true);
      await this.core.logHistory(
        tx, requestId, 'Approved',
        `Approved by ${admin?.name || 'Admin'}${selfApproved ? ' (Self-approved)' : ''}${dto.remarks ? `: ${dto.remarks}` : ''}`,
        adminId, { remarks: dto.remarks || null, self_approved: selfApproved },
      );
      const dates = await this.requestDates(tx, requestId);
      await this.core.logHistory(tx, requestId, 'Attendance updated', `Set to L: ${dates.map(fmtDayMonth).join(', ')}`, null, {
        dates, action: 'SET_L',
      });
      return r;
    });

    const emp = v.emp;
    await this.notifier.notify({
      recipients: [emp.emp_id, emp.reporting_manager],
      title: `Leave ${req.request_no} approved`,
      body: `${type.name} for ${emp.name}, ${this.describeDates(req)} (${this.core.fmtDays(num(req.leave_days))} days), was approved by ${admin?.name || 'the Admin'}.${dto.remarks ? ` Remarks: ${dto.remarks}` : ''}`,
      email: true, requestId, kind: 'leave_approved', actorId: adminId, employeeId: emp.emp_id,
    });
    return this.getLeaveRequestDetails(requestId, { empId: adminId, isAdmin: true });
  }

  async rejectLeaveRequest(requestId: number, adminId: number, dto: ReviewLeaveRequestDto) {
    if (!dto.remarks || !dto.remarks.trim()) {
      throw new BadRequestException({ message: 'Remarks are required to reject a leave request.', field: 'remarks' });
    }
    const [admin] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    const req = await this.prisma.$transaction(async (tx) => {
      const r = await this.lockRequest(tx, requestId);
      if (r.status !== 'PENDING') throw new ConflictException(await this.alreadyDecidedMessage(r));
      await this.assertNotOwnLeave(r, adminId, 'decided');
      await tx.$executeRaw`
        UPDATE leave_requests
        SET status = 'REJECTED', decided_at = clock_timestamp(), decided_by = ${adminId},
            decision_remarks = ${dto.remarks}, updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;
      await this.releaseBooked(tx, r);
      await this.core.logHistory(tx, requestId, 'Rejected', `Rejected by ${admin?.name || 'Admin'}: ${dto.remarks}`, adminId, {
        remarks: dto.remarks,
      });
      return r;
    });
    const emp = await this.core.getEmployee(req.emp_id);
    const type = await this.core.getLeaveType(req.leave_type_id);
    await this.notifier.notify({
      recipients: [emp.emp_id, emp.reporting_manager],
      title: `Leave ${req.request_no} rejected`,
      body: `${type.name} for ${emp.name}, ${this.describeDates(req)}, was rejected by ${admin?.name || 'the Admin'}. Remarks: ${dto.remarks}`,
      email: true, requestId, kind: 'leave_rejected', actorId: adminId, employeeId: emp.emp_id,
    });
    return this.getLeaveRequestDetails(requestId, { empId: adminId, isAdmin: true });
  }

  async decideCancellation(requestId: number, adminId: number, dto: DecideCancellationDto) {
    if (!dto.agree && (!dto.remarks || !dto.remarks.trim())) {
      throw new BadRequestException({ message: 'Remarks are required to keep the leave.', field: 'remarks' });
    }
    const [admin] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    const req = await this.prisma.$transaction(async (tx) => {
      const r = await this.lockRequest(tx, requestId);
      if (r.status !== 'CANCELLATION_REQUESTED') {
        throw new ConflictException('This leave is no longer waiting for a cancellation decision.');
      }
      await this.assertNotOwnLeave(r, adminId, 'decided');
      if (dto.agree) {
        await this.assertMonthsOpen(tx, r);
        await tx.$executeRaw`
          UPDATE leave_requests
          SET status = 'CANCELLED', cancellation_decided_at = clock_timestamp(), cancellation_decided_by = ${adminId},
              cancellation_remarks = ${dto.remarks || null}, updated_at = clock_timestamp()
          WHERE request_id = ${requestId};
        `;
        await this.returnDays(tx, r, adminId, `${r.request_no} cancelled`);
        await this.core.logHistory(tx, requestId, 'Cancellation agreed',
          `Cancellation agreed by ${admin?.name || 'Admin'}${dto.remarks ? `: ${dto.remarks}` : ''}`, adminId, { remarks: dto.remarks || null });
        const codes = await this.attendanceCodesAfterCancel(tx, r);
        await this.core.logHistory(tx, requestId, 'Attendance updated',
          `Taken back from L: ${codes.map((c) => `${fmtDayMonth(c.date)} → ${c.code}`).join(', ')}`, null, { action: 'REMOVE_L', codes });
      } else {
        await tx.$executeRaw`
          UPDATE leave_requests
          SET status = 'APPROVED', cancellation_decided_at = clock_timestamp(), cancellation_decided_by = ${adminId},
              cancellation_remarks = ${dto.remarks}, updated_at = clock_timestamp()
          WHERE request_id = ${requestId};
        `;
        await this.core.logHistory(tx, requestId, 'Cancellation refused',
          `Leave kept by ${admin?.name || 'Admin'}: ${dto.remarks}`, adminId, { remarks: dto.remarks });
      }
      return r;
    });
    const emp = await this.core.getEmployee(req.emp_id);
    await this.notifier.notify({
      recipients: dto.agree ? [emp.emp_id, emp.reporting_manager] : [emp.emp_id, emp.reporting_manager],
      title: dto.agree ? `Leave ${req.request_no} cancelled` : `Cancellation of ${req.request_no} refused`,
      body: dto.agree
        ? `The leave ${req.request_no} (${this.describeDates(req)}) was cancelled by ${admin?.name || 'the Admin'}. The days went back to the balance.${dto.remarks ? ` Remarks: ${dto.remarks}` : ''}`
        : `The leave ${req.request_no} (${this.describeDates(req)}) stays Approved. Remarks: ${dto.remarks}`,
      email: true, requestId, kind: dto.agree ? 'leave_cancelled' : 'leave_cancellation_refused', actorId: adminId,
      employeeId: emp.emp_id,
    });
    return this.getLeaveRequestDetails(requestId, { empId: adminId, isAdmin: true });
  }

  async adminCancelLeave(requestId: number, adminId: number, dto: AdminCancelLeaveDto, system = false) {
    const [admin] = system ? [{ name: 'System' }] : await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    const req = await this.prisma.$transaction(async (tx) => {
      const r = await this.lockRequest(tx, requestId);
      if (!['APPROVED', 'CANCELLATION_REQUESTED'].includes(r.status)) {
        throw new BadRequestException('Only Approved leave can be cancelled.');
      }
      if (!system) {
        await this.assertNotOwnLeave(r, adminId, 'cancelled');
        await this.assertMonthsOpen(tx, r);
      }
      await tx.$executeRaw`
        UPDATE leave_requests
        SET status = 'CANCELLED', cancellation_reason = COALESCE(cancellation_reason, ${dto.reason}),
            cancellation_decided_at = clock_timestamp(), cancellation_decided_by = ${system ? null : adminId},
            cancellation_remarks = ${dto.reason}, is_system_action = ${system}, updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;
      await this.returnDays(tx, r, system ? (null as any) : adminId, `${r.request_no} cancelled`);
      const codes = await this.attendanceCodesAfterCancel(tx, r);
      await this.core.logHistory(tx, requestId, 'Cancelled by Admin',
        `Cancelled by ${admin?.name || 'Admin'}: ${dto.reason}. Days went back to ${codes.map((c) => `${fmtDayMonth(c.date)} ${c.code}`).join(', ')}`,
        system ? null : adminId, { reason: dto.reason, codes, system });
      await this.core.logHistory(tx, requestId, 'Attendance updated',
        `Taken back from L: ${codes.map((c) => `${fmtDayMonth(c.date)} → ${c.code}`).join(', ')}`, null, { action: 'REMOVE_L', codes });
      return r;
    });
    if (!system) {
      const emp = await this.core.getEmployee(req.emp_id);
      await this.notifier.notify({
        recipients: [emp.emp_id, emp.reporting_manager],
        title: `Leave ${req.request_no} cancelled`,
        body: `The leave ${req.request_no} (${this.describeDates(req)}) was cancelled by ${admin?.name || 'the Admin'}. Reason: ${dto.reason}`,
        email: true, requestId, kind: 'leave_cancelled', actorId: adminId, employeeId: emp.emp_id,
      });
      return this.getLeaveRequestDetails(requestId, { empId: adminId, isAdmin: true });
    }
    return { success: true };
  }

  /** What each leave day goes back to after cancelling: P, HD, MP or A (BFD 7). */
  private async attendanceCodesAfterCancel(db: Db, req: any): Promise<Array<{ date: string; code: string }>> {
    const dates = await this.requestDates(db, req.request_id);
    if (!dates.length) return [];
    const rows = await db.$queryRaw<any[]>`
      SELECT work_date, day_status, check_in_at, check_out_at FROM attendance_days
      WHERE emp_id = ${req.emp_id} AND deleted_at IS NULL AND work_date = ANY(${dates}::date[])
        AND COALESCE(day_status, '') <> 'leave';
    `;
    const today = todayStr();
    return dates.map((date) => {
      const row = rows.find((r) => toDateStr(r.work_date) === date);
      let code = date > today ? '—' : 'A';
      if (row) {
        code = !row.check_out_at ? 'MP' : ATTENDANCE_CODE[String(row.day_status)] || 'P';
      }
      return { date, code };
    });
  }

  async addLeaveForEmployee(adminId: number, dto: AddLeaveForEmployeeDto) {
    if (dto.emp_id === adminId) {
      throw new BadRequestException({ message: 'You cannot add leave for yourself here. Please apply in My Leave.', field: 'emp_id' });
    }
    const v = await this.validate({
      empId: dto.emp_id,
      typeId: dto.leave_type_id,
      from: dto.from_date,
      to: dto.to_date,
      duration: dto.duration,
      reason: dto.reason,
      attachmentUrl: dto.attachment_url || null,
      attachmentName: dto.attachment_name || null,
      mode: 'ADMIN_ADD',
    });
    this.throwIfErrors(v);
    const created = await this.createRequest(v, {
      empId: dto.emp_id,
      appliedBy: adminId,
      dto,
      status: 'APPROVED',
      remarks: dto.remarks || null,
    });
    const [admin] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    await this.notifier.notify({
      recipients: [v.emp.emp_id, v.emp.reporting_manager],
      title: `Leave ${created.request_no} added`,
      body: `${admin?.name || 'The Admin'} added ${v.type!.name} for ${v.emp.name}, ${this.describeDates(created)} (${this.core.fmtDays(v.calc!.leave_days)} days).${dto.remarks ? ` Remarks: ${dto.remarks}` : ''}`,
      email: true, requestId: created.request_id, kind: 'leave_added', actorId: adminId, employeeId: v.emp.emp_id,
    });
    return this.mapRequestRow(created);
  }

  // ===========================================================================
  // Leave Requests (Admin) / Team (Reporting Manager)
  // ===========================================================================

  async listRequests(q: LeaveRequestsQueryDto, scope: { empIds?: number[] } = {}) {
    const today = todayStr();
    const tab = q.tab || 'Pending';
    const where: string[] = ['1=1'];
    const params: any[] = [];
    const p = (v: any) => {
      params.push(v);
      return `$${params.length}`;
    };

    if (scope.empIds) where.push(`r.emp_id = ANY(${p(scope.empIds)}::int[])`);
    if (tab === 'Pending') where.push(`r.status IN ('PENDING','CANCELLATION_REQUESTED')`);
    else if (tab === 'Approved') where.push(`r.status IN ('APPROVED','CANCELLATION_REQUESTED')`);
    else if (tab === 'Rejected') where.push(`r.status = 'REJECTED'`);
    else if (tab === 'Withdrawn') where.push(`r.status = 'WITHDRAWN'`);
    else if (tab === 'Cancelled') where.push(`r.status = 'CANCELLED'`);

    if (q.counter === 'pending') where.push(`r.status = 'PENDING'`);
    if (q.counter === 'cancellation') where.push(`r.status = 'CANCELLATION_REQUESTED'`);
    if (q.counter === 'on_leave_today') {
      where.push(`r.status IN ('APPROVED','CANCELLATION_REQUESTED') AND EXISTS (
        SELECT 1 FROM leave_request_days d WHERE d.request_id = r.request_id AND d.leave_date = ${p(today)}::date)`);
    }
    if (q.counter === 'approved_month') {
      where.push(`r.status IN ('APPROVED','CANCELLATION_REQUESTED') AND date_trunc('month', r.decided_at) = date_trunc('month', ${p(today)}::date)`);
    }
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      where.push(`(r.request_no ILIKE ${p(s)} OR e.name ILIKE ${p(s)})`);
    }
    if (q.leave_type_id) where.push(`r.leave_type_id = ${p(q.leave_type_id)}`);
    if (q.department_id) where.push(`e.dep_id = ${p(q.department_id)}`);
    if (q.employee_id) where.push(`r.emp_id = ${p(q.employee_id)}`);
    if (q.from_date) where.push(`r.to_date >= ${p(q.from_date)}::date`);
    if (q.to_date) where.push(`r.from_date <= ${p(q.to_date)}::date`);

    const order = tab === 'Pending' ? 'r.from_date ASC, r.applied_at ASC' : 'r.applied_at DESC';
    const pageSize = q.page_size || 20;
    const page = q.page || 1;
    const whereSql = where.join(' AND ');
    const avail = this.balances.availableSql().replace(/\b(opening_balance|credited_days|carried_forward_days|adjusted_days|days_taken|days_booked|lapsed_days|carried_out_days)\b/g, 'b.$1');

    const [count] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM leave_requests r JOIN employees e ON e.emp_id = r.emp_id WHERE ${whereSql}`,
      ...params,
    );
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT r.request_id, r.request_no, r.emp_id, r.leave_type_id, r.is_paid, r.duration, r.from_date, r.to_date,
             r.leave_days, r.status, r.applied_at, r.decided_at, r.is_short_notice, r.is_self_approved,
             r.added_by_admin, r.leave_year,
             e.name AS employee_name, e.dep_id, d.name AS department_name,
             t.name AS leave_type_name, t.code AS leave_type_code, t.calendar_color, t.balance_tracked,
             dec.name AS decided_by_name,
             ${avail} AS current_available
      FROM leave_requests r
      JOIN employees e ON e.emp_id = r.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      LEFT JOIN employees dec ON dec.emp_id = r.decided_by
      LEFT JOIN leave_balances b ON b.emp_id = r.emp_id AND b.leave_type_id = r.leave_type_id
        AND b.leave_year = COALESCE(r.leave_year, EXTRACT(YEAR FROM r.from_date)::int)
      WHERE ${whereSql}
      ORDER BY ${order}
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};
      `,
      ...params,
    );

    return {
      total: count?.total || 0,
      page,
      page_size: pageSize,
      requests: rows.map((r) => {
        const avail = r.current_available === null ? null : num(r.current_available);
        return {
          ...this.mapRequestRow(r, today),
          emp_code: this.core.empCode(r.emp_id),
          balance_after: !r.balance_tracked ? null : r.status === 'PENDING' ? avail : avail,
          current_available: avail,
        };
      }),
    };
  }

  async getCounters(scope: { empIds?: number[] } = {}) {
    const today = todayStr();
    const empFilter = scope.empIds ?? null;
    const [c] = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE r.status = 'PENDING')::int AS pending_count,
        COUNT(*) FILTER (WHERE r.status = 'CANCELLATION_REQUESTED')::int AS cancellation_requests_count,
        COUNT(*) FILTER (WHERE r.status IN ('APPROVED','CANCELLATION_REQUESTED')
          AND date_trunc('month', r.decided_at) = date_trunc('month', ${today}::date))::int AS approved_this_month_count
      FROM leave_requests r
      WHERE (${empFilter}::int[] IS NULL OR r.emp_id = ANY(${empFilter}::int[]));
    `;
    const [t] = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(DISTINCT d.emp_id)::int AS n FROM leave_request_days d
      JOIN leave_requests r ON r.request_id = d.request_id
      WHERE d.leave_date = ${today}::date AND r.status IN ('APPROVED','CANCELLATION_REQUESTED')
        AND (${empFilter}::int[] IS NULL OR r.emp_id = ANY(${empFilter}::int[]));
    `;
    return { ...c, on_leave_today_count: t?.n || 0 };
  }

  async getAdminLeaveRequests(q: LeaveRequestsQueryDto) {
    const [list, counters] = await Promise.all([this.listRequests(q), this.getCounters()]);
    return { counters, ...list };
  }

  async getTeamLeaveRequests(managerId: number, q: LeaveRequestsQueryDto) {
    const team = await this.core.getTeamIds(managerId);
    if (!team.length) return { counters: null, total: 0, page: 1, page_size: 20, requests: [], team_size: 0 };
    const [list, counters] = await Promise.all([
      this.listRequests({ ...q, tab: q.tab || 'All' }, { empIds: team }),
      this.getCounters({ empIds: team }),
    ]);
    return { counters, ...list, team_size: team.length };
  }

  // ===========================================================================
  // Request details (BFD 6.2)
  // ===========================================================================

  async getLeaveRequestDetails(requestId: number, viewer: Viewer) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT r.*, e.name AS employee_name, e.dep_id, e.joining_date, e.probation_end_date, e.reporting_manager,
             e.leave_policy_id, d.name AS department_name, rm.name AS reporting_manager_name,
             t.name AS leave_type_name, t.code AS leave_type_code, t.calendar_color, t.balance_tracked,
             dec.name AS decided_by_name, cdec.name AS cancellation_decided_by_name, ab.name AS applied_by_name
      FROM leave_requests r
      JOIN employees e ON e.emp_id = r.emp_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN employees rm ON rm.emp_id = e.reporting_manager
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      LEFT JOIN employees dec ON dec.emp_id = r.decided_by
      LEFT JOIN employees cdec ON cdec.emp_id = r.cancellation_decided_by
      LEFT JOIN employees ab ON ab.emp_id = r.applied_by
      WHERE r.request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    const isOwn = req.emp_id === viewer.empId;
    let isManager = false;
    if (!viewer.isAdmin && !isOwn) {
      const team = await this.core.getTeamIds(viewer.empId);
      isManager = team.includes(req.emp_id);
      if (!isManager) throw new ForbiddenException('You do not have access to this leave request.');
    }

    const today = todayStr();
    const from = toDateStr(req.from_date);
    const to = toDateStr(req.to_date);
    const year = Number(req.leave_year || from.slice(0, 4));
    const settings = await this.core.getSettings();
    const rule = await this.core.getRule(req.leave_policy_id, req.leave_type_id);

    const dayRows = await this.prisma.$queryRaw<any[]>`
      SELECT leave_date, day_part, day_fraction FROM leave_request_days WHERE request_id = ${requestId} ORDER BY leave_date;
    `;
    const days = dayRows.map((d) => ({ date: toDateStr(d.leave_date), part: d.day_part, fraction: num(d.day_fraction) }));
    let excluded: string[] = [];
    try {
      const calc = await this.core.countLeaveDays(req.emp_id, from, to, req.duration, settings);
      excluded = calc.excluded_notes;
    } catch {
      /* shift not set */
    }

    // Balance box
    let balance: any = null;
    if (req.balance_tracked) {
      const row = await this.balances.ensureRow(this.prisma, req.emp_id, req.leave_type_id, year);
      const credited = round2(row.opening_balance + row.credited_days + row.carried_forward_days + Math.max(0, row.adjusted_days));
      const thisRequest = num(req.leave_days);
      const pendingOwn = req.status === 'PENDING' ? thisRequest : 0;
      balance = {
        credited,
        taken: round2(row.days_taken - (['APPROVED', 'CANCELLATION_REQUESTED'].includes(req.status) ? thisRequest : 0)),
        this_request: thisRequest,
        available: row.available,
        balance_after_approval: round2(row.available + pendingOwn - (['PENDING'].includes(req.status) ? thisRequest : 0)),
        other_pending: round2(row.days_booked - pendingOwn),
      };
    }

    // Checks on these dates (information for the decision)
    const checks: Array<{ ok: boolean; label: string; info?: boolean }> = [];
    if (rule) {
      const parts: string[] = [];
      if (rule.max_at_once) parts.push(`max ${this.core.fmtDays(rule.max_at_once).replace('.0', '')} days at once`);
      if (rule.min_notice_days) parts.push(`${rule.min_notice_days} day notice`);
      const withinMax = !rule.max_at_once || num(req.leave_days) <= rule.max_at_once;
      checks.push({
        ok: withinMax && !req.is_short_notice,
        label: req.is_short_notice
          ? `Short notice: ${rule.min_notice_days} days' notice needed${parts.length ? ` (${parts.join(', ')})` : ''}`
          : `Within policy${parts.length ? `: ${parts.join(', ')}` : ''}`,
      });
    } else {
      checks.push({ ok: false, label: 'This leave type is no longer in the employee\'s policy' });
    }
    const dates = days.map((d) => d.date);
    const checkIn = await this.core.findCheckIn(req.emp_id, dates);
    checks.push(checkIn
      ? { ok: req.duration !== 'FULL_DAY', label: `Checked in on ${fmtDayMonth(checkIn)}` }
      : { ok: true, label: 'No check-in on these dates' });
    const locked = await this.core.findLockedMonth(dates.length ? dates : [from, to]);
    checks.push(locked
      ? { ok: false, label: `Attendance month ${locked} is locked` }
      : { ok: true, label: `Attendance month ${this.core.monthLabel(from)}${this.core.monthLabel(to) !== this.core.monthLabel(from) ? `–${this.core.monthLabel(to)}` : ''} is open` });
    if (req.status === 'PENDING' && from < today) {
      checks.push(settings.approve_after_leave_started
        ? { ok: true, label: 'Leave has already started (approval after start is allowed)' }
        : { ok: false, label: 'Leave has already started and approval after start is turned off' });
    }
    const colleagues = req.dep_id && dates.length
      ? await this.prisma.$queryRaw<any[]>`
          SELECT DISTINCT e.name AS employee_name, d.leave_date, t.name AS leave_type_name
          FROM leave_request_days d
          JOIN leave_requests r ON r.request_id = d.request_id
          JOIN employees e ON e.emp_id = d.emp_id
          JOIN leave_types t ON t.leave_type_id = r.leave_type_id
          WHERE e.dep_id = ${req.dep_id} AND d.emp_id <> ${req.emp_id}
            AND r.status IN ('APPROVED','CANCELLATION_REQUESTED')
            AND d.leave_date = ANY(${dates}::date[])
          ORDER BY d.leave_date ASC;`
      : [];
    const byPerson = new Map<string, string[]>();
    for (const c of colleagues) {
      const list = byPerson.get(c.employee_name) || [];
      list.push(fmtDayMonth(toDateStr(c.leave_date)));
      byPerson.set(c.employee_name, list);
    }
    for (const [name, ds] of byPerson) {
      checks.push({ ok: true, info: true, label: `Also on leave from ${req.department_name || 'the department'}: ${name} (${ds.join(', ')})` });
    }

    // History
    const historyRows = await this.prisma.$queryRaw<any[]>`
      SELECT h.log_id AS history_id, h.event, h.summary, h.details, h.performed_at, h.performed_by,
             e.name AS performed_by_name
      FROM activity_logs h
      LEFT JOIN employees e ON e.emp_id = h.performed_by
      WHERE h.entity_type = 'LEAVE_REQUEST' AND h.entity_id = ${requestId}
      ORDER BY h.performed_at DESC, h.log_id DESC;
    `;
    const history = historyRows
      .filter((h) => !(isOwn && !viewer.isAdmin && h.event === 'Notification sent' && h.details?.private_to_others))
      .map((h) => ({
        history_id: Number(h.history_id),
        event: h.event,
        summary: h.summary,
        details: h.details,
        performed_at: h.performed_at,
        performed_by_name: h.performed_by ? h.performed_by_name : 'System',
      }));

    // Actions for this viewer
    const admins = viewer.isAdmin ? await this.core.getAdminIds() : [];
    const ownAsAdmin = viewer.isAdmin && isOwn && admins.some((id) => id !== viewer.empId);
    const adminCan = viewer.isAdmin && !ownAsAdmin;
    const actions = {
      can_approve: adminCan && req.status === 'PENDING',
      can_reject: adminCan && req.status === 'PENDING',
      can_agree_cancel: adminCan && req.status === 'CANCELLATION_REQUESTED',
      can_keep_leave: adminCan && req.status === 'CANCELLATION_REQUESTED',
      can_cancel_leave: adminCan && req.status === 'APPROVED',
      can_withdraw: isOwn && req.status === 'PENDING',
      can_request_cancellation: isOwn && req.status === 'APPROVED' && from >= today,
      own_leave_note: ownAsAdmin ? 'Your own leave is decided by another Admin.' : null,
    };

    return {
      request: {
        ...this.mapRequestRow(req, today),
        emp_code: this.core.empCode(req.emp_id),
        days,
        excluded_notes: excluded,
        attachment_url: req.attachment_url,
      },
      balance,
      checks,
      history,
      actions,
      viewer_role: viewer.isAdmin ? 'ADMIN' : isOwn ? 'EMPLOYEE' : 'REPORTING_MANAGER',
    };
  }

  // ===========================================================================
  // Ledger & balances
  // ===========================================================================

  async getLeaveLedger(empId: number, opts: { typeId?: number; year?: number } = {}) {
    const typeId = opts.typeId ?? null;
    const year = opts.year ?? null;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT l.ledger_id, l.emp_id, l.leave_type_id, l.entry_type, l.days, l.balance_after, l.note,
             l.reference_request_id, l.performed_at, l.leave_year, l.expiry_date,
             t.name AS leave_type_name, t.code AS leave_type_code, r.request_no,
             COALESCE(e.name, 'System') AS performed_by_name
      FROM leave_ledger l
      JOIN leave_types t ON t.leave_type_id = l.leave_type_id
      LEFT JOIN leave_requests r ON r.request_id = l.reference_request_id
      LEFT JOIN employees e ON e.emp_id = l.performed_by
      WHERE l.emp_id = ${empId}
        AND (${typeId}::int IS NULL OR l.leave_type_id = ${typeId}::int)
        AND (${year}::int IS NULL OR l.leave_year = ${year}::int)
      ORDER BY l.performed_at DESC, l.ledger_id DESC;
    `;
    return rows.map((r) => ({
      ...r,
      days: num(r.days),
      balance_after: num(r.balance_after),
      expiry_date: r.expiry_date ? toDateStr(r.expiry_date) : null,
    }));
  }

  async getAllEmployeeBalances(opts: { year?: number; search?: string; department_id?: number }) {
    const settings = await this.core.getSettings();
    const year = opts.year || leaveYearOf(todayStr(), settings.start_month);
    const search = opts.search?.trim() ? `%${opts.search.trim()}%` : null;
    const dep = opts.department_id ?? null;
    const emps = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.leave_policy_id, e.status::text AS status, d.name AS department_name, p.name AS policy_name
      FROM employees e
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN leave_policies p ON p.policy_id = e.leave_policy_id
      WHERE e.deleted_at IS NULL AND e.status = 'Active'
        AND (${search}::text IS NULL OR e.name ILIKE ${search}::text)
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
      ORDER BY e.name ASC;
    `;
    const rules = await this.prisma.$queryRaw<any[]>`
      SELECT r.policy_id, r.leave_type_id, t.name, t.code, t.balance_tracked, t.is_paid, t.calendar_color
      FROM leave_policy_rules r JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE t.status = 'ACTIVE' ORDER BY r.rule_id;
    `;
    const bal = await this.prisma.$queryRaw<any[]>`SELECT * FROM leave_balances WHERE leave_year = ${year}`;
    const types = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT t.leave_type_id, t.name, t.code, t.balance_tracked, t.is_paid, t.calendar_color
      FROM leave_policy_rules r JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE t.status = 'ACTIVE' ORDER BY t.leave_type_id;
    `;
    return {
      leave_year: year,
      leave_year_label: leaveYearLabel(year, settings.start_month),
      types,
      employees: emps.map((e) => ({
        emp_id: e.emp_id,
        emp_code: this.core.empCode(e.emp_id),
        employee_name: e.name,
        department_name: e.department_name,
        policy_name: e.policy_name,
        balances: rules
          .filter((r) => r.policy_id === e.leave_policy_id)
          .map((r) => {
            const row = bal.find((b) => b.emp_id === e.emp_id && b.leave_type_id === r.leave_type_id);
            const n = row ? this.balances.normalise(row) : null;
            return {
              leave_type_id: r.leave_type_id,
              name: r.name,
              code: r.code,
              balance_tracked: r.balance_tracked,
              opening_balance: n?.opening_balance ?? 0,
              credited: n ? round2(n.opening_balance + n.credited_days + n.carried_forward_days + Math.max(0, n.adjusted_days)) : 0,
              taken: n?.days_taken ?? 0,
              booked: n?.days_booked ?? 0,
              lapsed: n?.lapsed_days ?? 0,
              available: r.balance_tracked ? n?.available ?? 0 : null,
            };
          }),
      })),
    };
  }

  private async adminName(adminId: number): Promise<string> {
    const [a] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    return a?.name || 'Admin';
  }

  async adjustBalance(adminId: number, dto: AdjustBalanceDto) {
    if (!isHalfStep(dto.days)) {
      throw new BadRequestException({ message: 'Days must be 0.5 to 365, in steps of 0.5.', field: 'days' });
    }
    const settings = await this.core.getSettings();
    const type = await this.core.getLeaveType(dto.leave_type_id);
    if (!type.balance_tracked) {
      throw new BadRequestException({ message: 'A "No limit" leave type cannot be adjusted.', field: 'leave_type_id' });
    }
    const emp = await this.core.getEmployee(dto.emp_id);
    const year = dto.leave_year || leaveYearOf(todayStr(), settings.start_month);
    const adminName = await this.adminName(adminId);
    const row = await this.balances.adjust({
      empId: dto.emp_id, typeId: dto.leave_type_id, year, direction: dto.direction, days: dto.days,
      note: dto.note, adminId, adminName, typeCode: type.code,
    });
    await this.logEmployeeHistory(dto.emp_id, adminId, 'LEAVE_BALANCE_ADJUSTED',
      `${type.name} ${dto.direction === 'CREDIT' ? '+' : '-'}${dto.days} days: ${dto.note}`);
    await this.notifier.notify({
      recipients: [emp.emp_id],
      title: `${type.name} balance adjusted`,
      body: `${adminName} ${dto.direction === 'CREDIT' ? 'added' : 'removed'} ${dto.days} days ${dto.direction === 'CREDIT' ? 'to' : 'from'} your ${type.name} balance. Note: ${dto.note}`,
      kind: 'leave_balance', actorId: adminId,
    });
    return { success: true, message: 'Balance adjusted.', available_balance: row.available };
  }

  async bulkCredit(adminId: number, dto: BulkAdjustBalanceDto) {
    if (!isHalfStep(dto.days)) {
      throw new BadRequestException({ message: 'Days must be 0.5 to 365, in steps of 0.5.', field: 'days' });
    }
    const settings = await this.core.getSettings();
    const type = await this.core.getLeaveType(dto.leave_type_id);
    if (!type.balance_tracked) {
      throw new BadRequestException({ message: 'A "No limit" leave type cannot be credited.', field: 'leave_type_id' });
    }
    const year = leaveYearOf(todayStr(), settings.start_month);
    const adminName = await this.adminName(adminId);
    const ids = Array.from(new Set(dto.emp_ids));
    const done: number[] = [];
    const skipped: Array<{ emp_id: number; reason: string }> = [];
    for (const empId of ids) {
      try {
        const emp = await this.core.getEmployee(empId);
        if (emp.status !== 'Active') {
          skipped.push({ emp_id: empId, reason: 'Not active' });
          continue;
        }
        const rule = await this.core.getRule(emp.leave_policy_id, type.leave_type_id);
        if (!rule) {
          skipped.push({ emp_id: empId, reason: `${type.name} is not in the employee's policy` });
          continue;
        }
        await this.balances.adjust({
          empId, typeId: type.leave_type_id, year, direction: 'CREDIT', days: dto.days, note: dto.note,
          adminId, adminName, typeCode: type.code,
        });
        await this.logEmployeeHistory(empId, adminId, 'LEAVE_BALANCE_ADJUSTED', `${type.name} +${dto.days} days (bulk): ${dto.note}`);
        done.push(empId);
      } catch (e: any) {
        skipped.push({ emp_id: empId, reason: e?.message || 'Failed' });
      }
    }
    await this.notifier.notify({
      recipients: done,
      title: `${type.name} credited`,
      body: `${adminName} added ${dto.days} days to your ${type.name} balance. Note: ${dto.note}`,
      kind: 'leave_balance', actorId: adminId,
    });
    return { success: true, credited: done.length, skipped };
  }

  async setOpeningBalance(adminId: number, dto: SetOpeningBalanceDto) {
    if (!isHalfStep(dto.opening_balance)) {
      throw new BadRequestException({ message: 'The Opening Balance must be in steps of 0.5.', field: 'opening_balance' });
    }
    const settings = await this.core.getSettings();
    const type = await this.core.getLeaveType(dto.leave_type_id);
    if (!type.balance_tracked) throw new BadRequestException('A "No limit" leave type has no balance.');
    const emp = await this.core.getEmployee(dto.emp_id);
    const year = leaveYearOf(todayStr(), settings.start_month);
    const adminName = await this.adminName(adminId);
    const row = await this.balances.setOpeningBalance({
      empId: dto.emp_id, typeId: dto.leave_type_id, year, value: dto.opening_balance, note: dto.note,
      adminId, adminName, typeCode: type.code,
    });
    await this.logEmployeeHistory(dto.emp_id, adminId, 'LEAVE_OPENING_BALANCE',
      `${type.name} Opening Balance set to ${dto.opening_balance}: ${dto.note}`);
    await this.notifier.notify({
      recipients: [emp.emp_id],
      title: `${type.name} Opening Balance changed`,
      body: `${adminName} set your ${type.name} Opening Balance to ${dto.opening_balance} days. Note: ${dto.note}`,
      kind: 'leave_balance', actorId: adminId,
    });
    return { success: true, available_balance: row.available };
  }

  /** Employee Profile > Pay & Policies (Leave): policy and balances. */
  async getEmployeeLeaveSummary(empId: number) {
    const settings = await this.core.getSettings();
    try {
      await this.balances.runCreditsForEmployee(empId, todayStr(), settings);
    } catch {
      /* best effort */
    }
    const emp = await this.core.getEmployee(empId);
    const year = leaveYearOf(todayStr(), settings.start_month);
    return {
      emp_id: emp.emp_id,
      employee: {
        emp_id: emp.emp_id,
        name: emp.name,
        emp_code: emp.emp_code,
        department_name: emp.department_name,
        status: emp.status,
        joining_date: emp.joining_date,
        probation_end_date: emp.probation_end_date,
      },
      policy_id: emp.leave_policy_id,
      policy_name: emp.policy_name,
      leave_year: year,
      leave_year_label: leaveYearLabel(year, settings.start_month),
      balances: emp.leave_policy_id ? await this.buildBalanceCards(emp, year, settings) : [],
      apply_types: emp.leave_policy_id ? await this.getApplyTypes(emp, settings) : [],
    };
  }

  async assignEmployeePolicy(adminId: number, empId: number, policyId: number) {
    const [p] = await this.prisma.$queryRaw<any[]>`SELECT policy_id, name, status FROM leave_policies WHERE policy_id = ${policyId}`;
    if (!p) throw new NotFoundException('Leave Policy not found.');
    if (p.status !== 'ACTIVE') throw new BadRequestException('This Leave Policy is Inactive.');
    const emp = await this.core.getEmployee(empId);
    if (emp.leave_policy_id === policyId) return { success: true };
    await this.prisma.$executeRaw`
      UPDATE employees SET leave_policy_id = ${policyId}, updated_at = clock_timestamp(), updated_by = ${adminId}
      WHERE emp_id = ${empId};
    `;
    await this.logEmployeeHistory(empId, adminId, 'LEAVE_POLICY_CHANGED',
      `Leave Policy changed from ${emp.policy_name || 'none'} to ${p.name}`);
    return { success: true };
  }

  private async logEmployeeHistory(empId: number, adminId: number, event: string, summary: string) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
        VALUES ('EMPLOYEE', ${empId}, ${event}, ${summary}, '{}'::jsonb, ${adminId}, clock_timestamp());
      `;
    } catch {
      /* history is informational */
    }
  }

  // ===========================================================================
  // Dashboard cards (BFD 13, Topics)
  // ===========================================================================

  async getDashboard(viewer: Viewer) {
    const today = todayStr();
    const settings = await this.core.getSettings();
    const emp = await this.core.getEmployee(viewer.empId);
    const year = leaveYearOf(today, settings.start_month);
    const out: any = {};

    // Employee card
    const [next] = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.from_date, r.to_date, r.duration, r.leave_days, t.name AS leave_type_name
      FROM leave_requests r JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.emp_id = ${viewer.empId} AND r.status IN ('APPROVED','CANCELLATION_REQUESTED') AND r.to_date >= ${today}::date
      ORDER BY r.from_date ASC LIMIT 1;
    `;
    out.employee = {
      has_policy: Boolean(emp.leave_policy_id),
      can_apply: Boolean(emp.leave_policy_id) && emp.status === 'Active',
      balances: emp.leave_policy_id ? await this.buildBalanceCards(emp, year, settings) : [],
      next_leave: next ? { ...next, from_date: toDateStr(next.from_date), to_date: toDateStr(next.to_date), leave_days: num(next.leave_days) } : null,
    };

    const onLeave = async (from: string, to: string, empIds: number[] | null) => {
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT d.emp_id, e.name AS employee_name, dep.name AS department_name, t.name AS leave_type_name,
               MIN(d.leave_date) AS first_day, MAX(d.leave_date) AS last_day, r.request_id, r.duration, r.to_date
        FROM leave_request_days d
        JOIN leave_requests r ON r.request_id = d.request_id
        JOIN employees e ON e.emp_id = d.emp_id
        LEFT JOIN departments dep ON dep.dep_id = e.dep_id
        JOIN leave_types t ON t.leave_type_id = r.leave_type_id
        WHERE d.leave_date BETWEEN ${from}::date AND ${to}::date
          AND r.status IN ('APPROVED','CANCELLATION_REQUESTED')
          AND (${empIds}::int[] IS NULL OR d.emp_id = ANY(${empIds}::int[]))
        GROUP BY d.emp_id, e.name, dep.name, t.name, r.request_id, r.duration, r.to_date
        ORDER BY MIN(d.leave_date), e.name;
      `;
      return rows.map((r) => ({
        ...r,
        first_day: toDateStr(r.first_day),
        last_day: toDateStr(r.last_day),
        to_date: toDateStr(r.to_date),
        part: r.duration === 'FULL_DAY' ? 'Full' : 'Half',
      }));
    };

    if (viewer.isAdmin) {
      const c = await this.getCounters();
      out.admin = {
        pending_count: c.pending_count,
        cancellation_requests_count: c.cancellation_requests_count,
        on_leave_today: await onLeave(today, today, null),
      };
    }
    const team = await this.core.getTeamIds(viewer.empId);
    if (team.length) {
      const week = this.weekRange(today);
      out.manager = {
        team_size: team.length,
        today: await onLeave(today, today, team),
        this_week: await onLeave(week.start, week.end, team),
      };
    }
    return out;
  }

  private weekRange(today: string): { start: string; end: string } {
    const d = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun
    const monday = addDays(today, d === 0 ? -6 : 1 - d);
    return { start: monday, end: addDays(monday, 6) };
  }

  // ===========================================================================
  // Admin jobs started by hand
  // ===========================================================================

  async runYearEndManually(adminId: number, leaveYear: number) {
    const settings = await this.core.getSettings();
    const current = leaveYearOf(todayStr(), settings.start_month);
    if (leaveYear >= current) {
      throw new BadRequestException({
        message: `The ${leaveYearLabel(leaveYear, settings.start_month)} leave year has not ended yet.`,
        field: 'leave_year',
      });
    }
    if (await this.balances.isYearEndDone(leaveYear)) {
      throw new BadRequestException('Year-end processing for this leave year has already run.');
    }
    const r = await this.balances.runYearEnd(leaveYear, adminId);
    await this.balances.runCreditsForAll();
    return { success: true, ...r };
  }

  async runCreditsManually() {
    const credited = await this.balances.runCreditsForAll();
    const compOff = await this.balances.runCompOffCredits();
    return { success: true, employees_credited: credited.length, comp_off_grants: compOff.length };
  }
}
