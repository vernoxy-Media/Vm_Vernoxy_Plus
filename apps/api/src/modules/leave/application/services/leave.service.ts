import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  UpdateGeneralSettingsDto,
  CalculateLeaveDaysDto,
  ApplyLeaveDto,
  AddLeaveForEmployeeDto,
  ReviewLeaveRequestDto,
  RequestCancellationDto,
  DecideCancellationDto,
  AdminCancelLeaveDto,
  AdjustBalanceDto,
} from '../../presentation/dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // 1. LEAVE TYPES (MASTER DATA CRUD)
  // ===========================================================================

  async getLeaveTypes() {
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        leave_type_id, name, code, is_paid, balance_tracked, half_day_allowed,
        applies_to, calendar_color, description, status, created_at, updated_at
      FROM leave_types
      ORDER BY leave_type_id ASC;
    `;
  }

  async getLeaveTypeById(id: number) {
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_types WHERE leave_type_id = ${id} LIMIT 1;
    `;
    if (!row) throw new NotFoundException(`Leave Type with ID ${id} not found.`);
    return row;
  }

  async createLeaveType(dto: CreateLeaveTypeDto, adminId: number) {
    const [existing] = await this.prisma.$queryRaw<any[]>`
      SELECT leave_type_id FROM leave_types WHERE name = ${dto.name} OR code = ${dto.code} LIMIT 1;
    `;
    if (existing) {
      throw new BadRequestException('A leave type with this name or code already exists.');
    }

    const [created] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_types (
        name, code, is_paid, balance_tracked, half_day_allowed,
        applies_to, calendar_color, description, status, created_by
      ) VALUES (
        ${dto.name}, ${dto.code.toUpperCase()}, ${dto.is_paid}, ${dto.balance_tracked}, ${dto.half_day_allowed},
        ${dto.applies_to}, ${dto.calendar_color}, ${dto.description || null}, ${dto.status || 'ACTIVE'}, ${adminId}
      )
      RETURNING *;
    `;

    await this.logChange(
      'LEAVE_TYPE',
      created.leave_type_id,
      'CREATE',
      null,
      JSON.stringify(created),
      adminId,
    );

    return created;
  }

  async updateLeaveType(id: number, dto: UpdateLeaveTypeDto, adminId: number) {
    const existing = await this.getLeaveTypeById(id);

    if (dto.name && dto.name !== existing.name) {
      const [dup] = await this.prisma.$queryRaw<any[]>`
        SELECT leave_type_id FROM leave_types WHERE name = ${dto.name} AND leave_type_id <> ${id} LIMIT 1;
      `;
      if (dup) throw new BadRequestException('A leave type with this name already exists.');
    }
    if (dto.code && dto.code !== existing.code) {
      const [dup] = await this.prisma.$queryRaw<any[]>`
        SELECT leave_type_id FROM leave_types WHERE code = ${dto.code.toUpperCase()} AND leave_type_id <> ${id} LIMIT 1;
      `;
      if (dup) throw new BadRequestException('A leave type with this code already exists.');
    }

    const name = dto.name !== undefined ? dto.name : existing.name;
    const code = dto.code !== undefined ? dto.code.toUpperCase() : existing.code;
    const isPaid = dto.is_paid !== undefined ? dto.is_paid : existing.is_paid;
    const balanceTracked = dto.balance_tracked !== undefined ? dto.balance_tracked : existing.balance_tracked;
    const halfDayAllowed = dto.half_day_allowed !== undefined ? dto.half_day_allowed : existing.half_day_allowed;
    const appliesTo = dto.applies_to !== undefined ? dto.applies_to : existing.applies_to;
    const calendarColor = dto.calendar_color !== undefined ? dto.calendar_color : existing.calendar_color;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const status = dto.status !== undefined ? dto.status : existing.status;

    const [updated] = await this.prisma.$queryRaw<any[]>`
      UPDATE leave_types
      SET name = ${name},
          code = ${code},
          is_paid = ${isPaid},
          balance_tracked = ${balanceTracked},
          half_day_allowed = ${halfDayAllowed},
          applies_to = ${appliesTo},
          calendar_color = ${calendarColor},
          description = ${description},
          status = ${status},
          updated_at = clock_timestamp(),
          updated_by = ${adminId}
      WHERE leave_type_id = ${id}
      RETURNING *;
    `;

    await this.logChange(
      'LEAVE_TYPE',
      id,
      'UPDATE',
      JSON.stringify(existing),
      JSON.stringify(updated),
      adminId,
    );

    return updated;
  }

  async toggleLeaveTypeStatus(id: number, adminId: number) {
    const existing = await this.getLeaveTypeById(id);
    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const [updated] = await this.prisma.$queryRaw<any[]>`
      UPDATE leave_types
      SET status = ${newStatus}, updated_at = clock_timestamp(), updated_by = ${adminId}
      WHERE leave_type_id = ${id}
      RETURNING *;
    `;

    await this.logChange(
      'LEAVE_TYPE',
      id,
      'status',
      existing.status,
      newStatus,
      adminId,
    );

    return updated;
  }

  async deleteLeaveType(id: number, adminId: number) {
    const existing = await this.getLeaveTypeById(id);

    // BFD Page 7 Marker 9: "A type that has been used cannot be deleted, only made Inactive"
    const [usedInRequests] = await this.prisma.$queryRaw<any[]>`
      SELECT request_id FROM leave_requests WHERE leave_type_id = ${id} LIMIT 1;
    `;
    if (usedInRequests) {
      throw new BadRequestException(
        'This leave type has already been used in leave requests and cannot be deleted. You can mark it as Inactive instead.',
      );
    }

    const [usedInRules] = await this.prisma.$queryRaw<any[]>`
      SELECT rule_id FROM leave_policy_rules WHERE leave_type_id = ${id} LIMIT 1;
    `;
    if (usedInRules) {
      throw new BadRequestException(
        'This leave type is assigned to one or more leave policies. Remove it from policies before deleting.',
      );
    }

    await this.prisma.$executeRaw`
      DELETE FROM leave_types WHERE leave_type_id = ${id};
    `;

    await this.logChange('LEAVE_TYPE', id, 'DELETE', JSON.stringify(existing), null, adminId);
    return { success: true, message: `Leave Type ${existing.name} was deleted.` };
  }

  // ===========================================================================
  // 2. LEAVE POLICIES (MASTER DATA CRUD)
  // ===========================================================================

  async getLeavePolicies() {
    const policies = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.policy_id, p.name, p.pro_rata, p.status, p.created_at, p.updated_at,
        COUNT(DISTINCT e.emp_id)::int as employees_count,
        COUNT(DISTINCT r.rule_id)::int as rules_count
      FROM leave_policies p
      LEFT JOIN employees e ON e.leave_policy_id = p.policy_id AND e.status = 'Active'
      LEFT JOIN leave_policy_rules r ON r.policy_id = p.policy_id
      GROUP BY p.policy_id
      ORDER BY p.policy_id ASC;
    `;

    const rules = await this.prisma.$queryRaw<any[]>`
      SELECT 
        r.*, t.name as leave_type_name, t.code as leave_type_code, t.is_paid, t.calendar_color
      FROM leave_policy_rules r
      JOIN leave_types t ON r.leave_type_id = t.leave_type_id
      ORDER BY r.rule_id ASC;
    `;

    return policies.map((pol) => ({
      ...pol,
      rules: rules.filter((r) => r.policy_id === pol.policy_id),
    }));
  }

  async getLeavePolicyById(id: number) {
    const [policy] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_policies WHERE policy_id = ${id} LIMIT 1;
    `;
    if (!policy) throw new NotFoundException(`Leave Policy with ID ${id} not found.`);

    const rules = await this.prisma.$queryRaw<any[]>`
      SELECT 
        r.*, t.name as leave_type_name, t.code as leave_type_code, t.is_paid, t.calendar_color
      FROM leave_policy_rules r
      JOIN leave_types t ON r.leave_type_id = t.leave_type_id
      WHERE r.policy_id = ${id}
      ORDER BY r.rule_id ASC;
    `;

    return { ...policy, rules };
  }

  async createLeavePolicy(dto: CreateLeavePolicyDto, adminId: number) {
    const [existing] = await this.prisma.$queryRaw<any[]>`
      SELECT policy_id FROM leave_policies WHERE name = ${dto.name} LIMIT 1;
    `;
    if (existing) {
      throw new BadRequestException('A leave policy with this name already exists.');
    }

    const [createdPolicy] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_policies (name, pro_rata, status, created_by)
      VALUES (${dto.name}, ${dto.pro_rata ?? true}, ${dto.status || 'ACTIVE'}, ${adminId})
      RETURNING *;
    `;

    if (dto.rules && dto.rules.length > 0) {
      for (const rule of dto.rules) {
        await this.prisma.$executeRaw`
          INSERT INTO leave_policy_rules (
            policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
            max_at_once, min_notice_days, backdated_days, attachment_after_days,
            allowed_during_probation, comp_off_expiry_days
          ) VALUES (
            ${createdPolicy.policy_id}, ${rule.leave_type_id}, ${rule.days_per_year ?? null}, ${rule.credit_frequency},
            ${rule.carry_forward_days ?? 0.0}, ${rule.max_at_once ?? null}, ${rule.min_notice_days ?? 0},
            ${rule.backdated_days ?? 0}, ${rule.attachment_after_days ?? null}, ${rule.allowed_during_probation ?? true},
            ${rule.comp_off_expiry_days ?? 90}
          );
        `;
      }
    }

    await this.logChange(
      'LEAVE_POLICY',
      createdPolicy.policy_id,
      'CREATE',
      null,
      JSON.stringify(dto),
      adminId,
    );

    return this.getLeavePolicyById(createdPolicy.policy_id);
  }

  async updateLeavePolicy(id: number, dto: UpdateLeavePolicyDto, adminId: number) {
    const existing = await this.getLeavePolicyById(id);

    if (dto.name && dto.name !== existing.name) {
      const [dup] = await this.prisma.$queryRaw<any[]>`
        SELECT policy_id FROM leave_policies WHERE name = ${dto.name} AND policy_id <> ${id} LIMIT 1;
      `;
      if (dup) throw new BadRequestException('A leave policy with this name already exists.');
    }

    const name = dto.name !== undefined ? dto.name : existing.name;
    const proRata = dto.pro_rata !== undefined ? dto.pro_rata : existing.pro_rata;
    const status = dto.status !== undefined ? dto.status : existing.status;

    await this.prisma.$executeRaw`
      UPDATE leave_policies
      SET name = ${name}, pro_rata = ${proRata}, status = ${status},
          updated_at = clock_timestamp(), updated_by = ${adminId}
      WHERE policy_id = ${id};
    `;

    if (dto.rules) {
      // Re-synchronize rules
      await this.prisma.$executeRaw`
        DELETE FROM leave_policy_rules WHERE policy_id = ${id};
      `;

      for (const rule of dto.rules) {
        await this.prisma.$executeRaw`
          INSERT INTO leave_policy_rules (
            policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
            max_at_once, min_notice_days, backdated_days, attachment_after_days,
            allowed_during_probation, comp_off_expiry_days
          ) VALUES (
            ${id}, ${rule.leave_type_id}, ${rule.days_per_year ?? null}, ${rule.credit_frequency},
            ${rule.carry_forward_days ?? 0.0}, ${rule.max_at_once ?? null}, ${rule.min_notice_days ?? 0},
            ${rule.backdated_days ?? 0}, ${rule.attachment_after_days ?? null}, ${rule.allowed_during_probation ?? true},
            ${rule.comp_off_expiry_days ?? 90}
          );
        `;
      }
    }

    await this.logChange(
      'LEAVE_POLICY',
      id,
      'UPDATE',
      JSON.stringify(existing),
      JSON.stringify(dto),
      adminId,
    );

    return this.getLeavePolicyById(id);
  }

  async copyLeavePolicy(id: number, newName: string, adminId: number) {
    const source = await this.getLeavePolicyById(id);

    const [dup] = await this.prisma.$queryRaw<any[]>`
      SELECT policy_id FROM leave_policies WHERE name = ${newName} LIMIT 1;
    `;
    if (dup) throw new BadRequestException('A policy with this name already exists.');

    const [newPolicy] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_policies (name, pro_rata, status, created_by)
      VALUES (${newName}, ${source.pro_rata}, 'ACTIVE', ${adminId})
      RETURNING *;
    `;

    for (const rule of source.rules) {
      await this.prisma.$executeRaw`
        INSERT INTO leave_policy_rules (
          policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
          max_at_once, min_notice_days, backdated_days, attachment_after_days,
          allowed_during_probation, comp_off_expiry_days
        ) VALUES (
          ${newPolicy.policy_id}, ${rule.leave_type_id}, ${rule.days_per_year}, ${rule.credit_frequency},
          ${rule.carry_forward_days}, ${rule.max_at_once}, ${rule.min_notice_days},
          ${rule.backdated_days}, ${rule.attachment_after_days}, ${rule.allowed_during_probation},
          ${rule.comp_off_expiry_days}
        );
      `;
    }

    await this.logChange(
      'LEAVE_POLICY',
      newPolicy.policy_id,
      'COPY_FROM',
      `Policy ID ${id} (${source.name})`,
      `Created as ${newName}`,
      adminId,
    );

    return this.getLeavePolicyById(newPolicy.policy_id);
  }

  // ===========================================================================
  // 3. GENERAL SETTINGS
  // ===========================================================================

  async getGeneralSettings() {
    const [settings] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_general_settings LIMIT 1;
    `;
    return settings;
  }

  async updateGeneralSettings(dto: UpdateGeneralSettingsDto, adminId: number) {
    const existing = await this.getGeneralSettings();

    const leaveYearStart = dto.leave_year_start || existing.leave_year_start;
    const countSandwichLeave =
      dto.count_sandwich_leave !== undefined ? dto.count_sandwich_leave : existing.count_sandwich_leave;
    const pendingReminderHours =
      dto.pending_reminder_hours !== undefined ? dto.pending_reminder_hours : existing.pending_reminder_hours;
    const approveAfterLeaveStarted =
      dto.approve_after_leave_started !== undefined
        ? dto.approve_after_leave_started
        : existing.approve_after_leave_started;
    const yearEndProcessing = dto.year_end_processing || existing.year_end_processing;
    const compOffHoursPerDay =
      dto.comp_off_hours_per_day !== undefined
        ? dto.comp_off_hours_per_day
        : existing.comp_off_hours_per_day;

    const [updated] = await this.prisma.$queryRaw<any[]>`
      UPDATE leave_general_settings
      SET leave_year_start = ${leaveYearStart},
          count_sandwich_leave = ${countSandwichLeave},
          pending_reminder_hours = ${pendingReminderHours},
          approve_after_leave_started = ${approveAfterLeaveStarted},
          year_end_processing = ${yearEndProcessing},
          comp_off_hours_per_day = ${compOffHoursPerDay},
          updated_at = clock_timestamp(),
          updated_by = ${adminId}
      WHERE setting_id = ${existing.setting_id}
      RETURNING *;
    `;

    await this.logChange(
      'GENERAL_SETTINGS',
      existing.setting_id,
      'UPDATE',
      JSON.stringify(existing),
      JSON.stringify(updated),
      adminId,
    );

    return updated;
  }

  async getSettingsChangeLog() {
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        l.*, e.name as changed_by_name
      FROM leave_settings_change_log l
      LEFT JOIN employees e ON l.changed_by = e.emp_id
      ORDER BY l.changed_at DESC
      LIMIT 100;
    `;
  }

  // ===========================================================================
  // 4. DAY COUNTING & CHECK LOGIC (SECTION 5)
  // ===========================================================================

  async calculateLeaveDays(empId: number, dto: CalculateLeaveDaysDto) {
    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, joining_date, probation_end_date, status, leave_policy_id
      FROM employees WHERE emp_id = ${empId} LIMIT 1;
    `;
    if (!emp) throw new NotFoundException('Employee not found.');

    const leaveType = await this.getLeaveTypeById(dto.leave_type_id);
    const settings = await this.getGeneralSettings();

    // Check policy rule for this leave type
    let rule: any = null;
    if (emp.leave_policy_id) {
      const [r] = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM leave_policy_rules 
        WHERE policy_id = ${emp.leave_policy_id} AND leave_type_id = ${dto.leave_type_id}
        LIMIT 1;
      `;
      rule = r;
    }

    const from = new Date(dto.from_date);
    const to = new Date(dto.to_date);

    if (to < from) {
      throw new BadRequestException('To Date cannot be before From Date.');
    }

    if (dto.duration !== 'FULL_DAY' && dto.from_date !== dto.to_date) {
      throw new BadRequestException('A half day leave must be for a single date.');
    }
    if (dto.duration !== 'FULL_DAY' && !leaveType.half_day_allowed) {
      throw new BadRequestException(`${leaveType.name} cannot be taken as a half day.`);
    }

    // Half day single date case
    if (dto.duration !== 'FULL_DAY') {
      return {
        leave_days: 0.5,
        counted_days: 0.5,
        days_breakdown: [
          {
            date: dto.from_date,
            day_type: 'WORKING_DAY',
            day_count: 0.5,
            note: `${dto.duration === 'FIRST_HALF' ? 'First Half' : 'Second Half'} Leave`,
          },
        ],
        is_short_notice: false,
        attachment_required: false,
      };
    }

    // Full day range iteration
    // Fetch holidays in the range
    const holidays = await this.prisma.$queryRaw<any[]>`
      SELECT holiday_date, name FROM company_holidays 
      WHERE holiday_date >= ${dto.from_date}::date AND holiday_date <= ${dto.to_date}::date
      AND deleted_at IS NULL;
    `;
    const holidayDates = new Set(
      holidays.map((h) => new Date(h.holiday_date).toISOString().split('T')[0]),
    );

    // Fetch shift weekly off days (default Sunday: 0)
    const [shift] = await this.prisma.$queryRaw<any[]>`
      SELECT weekly_off_days FROM attendance_shifts WHERE is_default = true AND deleted_at IS NULL LIMIT 1;
    `;
    const weeklyOffDays: number[] = shift?.weekly_off_days || [0];

    const breakdown: any[] = [];
    let countedLeaveDays = 0;

    const curr = new Date(from);
    while (curr <= to) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayOfWeek = curr.getDay(); // 0 = Sunday

      const isHoliday = holidayDates.has(dateStr);
      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

      if (isWeeklyOff && !settings.count_sandwich_leave) {
        breakdown.push({
          date: dateStr,
          day_type: 'WEEKLY_OFF',
          day_count: 0,
          note: `${dateStr} is your Weekly Off and is not counted`,
        });
      } else if (isHoliday && !settings.count_sandwich_leave) {
        const holiday = holidays.find(
          (h) => new Date(h.holiday_date).toISOString().split('T')[0] === dateStr,
        );
        breakdown.push({
          date: dateStr,
          day_type: 'HOLIDAY',
          day_count: 0,
          note: `${dateStr} is a Holiday (${holiday?.name || 'Holiday'}) and is not counted`,
        });
      } else {
        countedLeaveDays += 1.0;
        breakdown.push({
          date: dateStr,
          day_type: 'WORKING_DAY',
          day_count: 1.0,
          note: dateStr,
        });
      }

      curr.setDate(curr.getDate() + 1);
    }

    // Notice check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((from.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isShortNotice = rule?.min_notice_days && diffDays < rule.min_notice_days;

    // Attachment check
    const attachmentRequired = Boolean(
      rule?.attachment_after_days && countedLeaveDays > rule.attachment_after_days,
    );

    return {
      leave_days: countedLeaveDays,
      counted_days: countedLeaveDays,
      days_breakdown: breakdown,
      is_short_notice: Boolean(isShortNotice),
      attachment_required: attachmentRequired,
      rule,
    };
  }

  // ===========================================================================
  // 5. EMPLOYEE APPLY LEAVE & MY LEAVE OVERVIEW
  // ===========================================================================

  async getMyLeaveOverview(empId: number, yearParam?: number) {
    const currentYear = yearParam || new Date().getFullYear();

    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.status, e.leave_policy_id, p.name as policy_name
      FROM employees e
      LEFT JOIN leave_policies p ON e.leave_policy_id = p.policy_id
      WHERE e.emp_id = ${empId} LIMIT 1;
    `;
    if (!emp) throw new NotFoundException('Employee not found.');

    // Fetch all active leave types
    const types = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_types WHERE status = 'ACTIVE' ORDER BY leave_type_id ASC;
    `;

    // Ensure leave balance rows exist for this year
    for (const t of types) {
      if (t.balance_tracked) {
        await this.prisma.$executeRaw`
          INSERT INTO leave_balances (emp_id, leave_type_id, leave_year)
          VALUES (${empId}, ${t.leave_type_id}, ${currentYear})
          ON CONFLICT (emp_id, leave_type_id, leave_year) DO NOTHING;
        `;
      }
    }

    // Fetch balances
    const balances = await this.prisma.$queryRaw<any[]>`
      SELECT 
        b.*, t.name as leave_type_name, t.code as leave_type_code,
        t.is_paid, t.balance_tracked, t.calendar_color,
        (b.opening_balance + b.credited_days + b.carried_forward_days - b.days_taken - b.days_booked) as available_balance
      FROM leave_balances b
      JOIN leave_types t ON b.leave_type_id = t.leave_type_id
      WHERE b.emp_id = ${empId} AND b.leave_year = ${currentYear}
      ORDER BY t.leave_type_id ASC;
    `;

    // Nearest comp-off expiry
    const [nearestCompOff] = await this.prisma.$queryRaw<any[]>`
      SELECT expiry_date FROM leave_comp_off_grants
      WHERE emp_id = ${empId} AND is_lapsed = false AND days_used < days_credited
      ORDER BY expiry_date ASC LIMIT 1;
    `;

    // Requests for this employee
    const requests = await this.prisma.$queryRaw<any[]>`
      SELECT 
        r.*, t.name as leave_type_name, t.code as leave_type_code, t.calendar_color
      FROM leave_requests r
      JOIN leave_types t ON r.leave_type_id = t.leave_type_id
      WHERE r.emp_id = ${empId}
      ORDER BY r.created_at DESC;
    `;

    return {
      employee: emp,
      current_year: currentYear,
      policy_name: emp.policy_name || 'Standard Leave Policy',
      balances: balances.map((b) => ({
        ...b,
        nearest_expiry: b.leave_type_code === 'CO' ? nearestCompOff?.expiry_date : null,
      })),
      requests,
    };
  }

  async applyLeave(empId: number, dto: ApplyLeaveDto) {
    const calc = await this.calculateLeaveDays(empId, dto);

    if (calc.leave_days <= 0) {
      throw new BadRequestException(
        'The selected dates fall entirely on Weekly Offs or Holidays. There are no leave days to apply for.',
      );
    }

    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, status, joining_date, probation_end_date, leave_policy_id
      FROM employees WHERE emp_id = ${empId} LIMIT 1;
    `;
    if (emp.status !== 'Active') {
      throw new BadRequestException('Leave can be applied only by active employees.');
    }

    const fromDate = new Date(dto.from_date);
    if (fromDate < new Date(emp.joining_date)) {
      throw new BadRequestException(
        `You cannot apply for leave before your joining date (${new Date(emp.joining_date).toISOString().split('T')[0]}).`,
      );
    }

    const leaveType = await this.getLeaveTypeById(dto.leave_type_id);

    // Rule checks
    const rule = calc.rule;
    if (rule) {
      if (rule.max_at_once && calc.leave_days > rule.max_at_once) {
        throw new BadRequestException(
          `${leaveType.name} can be taken for up to ${rule.max_at_once} days at a time.`,
        );
      }
      if (!rule.allowed_during_probation && emp.probation_end_date) {
        if (fromDate < new Date(emp.probation_end_date)) {
          throw new BadRequestException(
            `${leaveType.name} can be taken only after your probation ends on ${new Date(emp.probation_end_date).toISOString().split('T')[0]}.`,
          );
        }
      }
      if (rule.attachment_after_days && calc.leave_days > rule.attachment_after_days && !dto.attachment_url) {
        throw new BadRequestException(
          `Please attach a medical certificate / document for ${leaveType.name} of more than ${rule.attachment_after_days} days.`,
        );
      }
    }

    // Overlap Check (Page 17)
    const [overlap] = await this.prisma.$queryRaw<any[]>`
      SELECT request_no, from_date, to_date FROM leave_requests
      WHERE emp_id = ${empId}
        AND status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED')
        AND from_date <= ${dto.to_date}::date
        AND to_date >= ${dto.from_date}::date
      LIMIT 1;
    `;
    if (overlap) {
      throw new BadRequestException(
        `You already have a leave request (${overlap.request_no}) overlapping with these dates.`,
      );
    }

    // Balance check for tracked type
    const leaveYear = fromDate.getFullYear();
    let balanceRecord: any = null;
    if (leaveType.balance_tracked) {
      const [bal] = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM leave_balances
        WHERE emp_id = ${empId} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear}
        LIMIT 1;
      `;
      const available = bal
        ? Number(bal.opening_balance) +
          Number(bal.credited_days) +
          Number(bal.carried_forward_days) -
          Number(bal.days_taken) -
          Number(bal.days_booked)
        : 0;

      if (available < calc.leave_days) {
        throw new BadRequestException(
          `You have ${available} days of ${leaveType.name} available. This request needs ${calc.leave_days}. You can apply for the rest as Leave Without Pay.`,
        );
      }
      balanceRecord = bal;
    }

    // Request No: LV/YYYY/MM/NNNN
    const month = String(fromDate.getMonth() + 1).padStart(2, '0');
    const [countRow] = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count FROM leave_requests
      WHERE EXTRACT(YEAR FROM applied_at) = ${leaveYear}
        AND EXTRACT(MONTH FROM applied_at) = ${fromDate.getMonth() + 1};
    `;
    const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
    const requestNo = `LV/${leaveYear}/${month}/${seq}`;

    // Insert Request
    const [created] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_requests (
        request_no, emp_id, leave_type_id, is_paid, duration,
        from_date, to_date, leave_days, reason, attachment_url,
        is_short_notice, status, applied_by
      ) VALUES (
        ${requestNo}, ${empId}, ${dto.leave_type_id}, ${leaveType.is_paid}, ${dto.duration},
        ${dto.from_date}::date, ${dto.to_date}::date, ${calc.leave_days}, ${dto.reason}, ${dto.attachment_url || null},
        ${calc.is_short_notice}, 'PENDING', ${empId}
      )
      RETURNING *;
    `;

    // Book days in balance
    if (leaveType.balance_tracked && balanceRecord) {
      await this.prisma.$executeRaw`
        UPDATE leave_balances
        SET days_booked = days_booked + ${calc.leave_days}, updated_at = clock_timestamp()
        WHERE balance_id = ${balanceRecord.balance_id};
      `;
    }

    // Log history
    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (
        ${created.request_id}, 'Submitted', ${empId},
        ${calc.is_short_notice ? 'Submitted with Short Notice warning' : 'Submitted successfully'}
      );
    `;

    return created;
  }

  async withdrawLeave(requestId: number, empId: number) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_requests WHERE request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (req.emp_id !== empId) throw new ForbiddenException('You can only withdraw your own leave request.');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING requests can be withdrawn.');
    }

    await this.prisma.$executeRaw`
      UPDATE leave_requests
      SET status = 'WITHDRAWN', updated_at = clock_timestamp()
      WHERE request_id = ${requestId};
    `;

    // Release booked days
    const leaveYear = new Date(req.from_date).getFullYear();
    await this.prisma.$executeRaw`
      UPDATE leave_balances
      SET days_booked = GREATEST(0, days_booked - ${req.leave_days}), updated_at = clock_timestamp()
      WHERE emp_id = ${empId} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (${requestId}, 'Withdrawn', ${empId}, 'Withdrawn by employee while Pending');
    `;

    return { success: true, message: 'Leave request withdrawn.' };
  }

  async requestCancellation(requestId: number, empId: number, dto: RequestCancellationDto) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_requests WHERE request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (req.emp_id !== empId) throw new ForbiddenException('You can only cancel your own leave.');
    if (req.status !== 'APPROVED') {
      throw new BadRequestException('Cancellation can only be requested for APPROVED leave.');
    }

    await this.prisma.$executeRaw`
      UPDATE leave_requests
      SET status = 'CANCELLATION_REQUESTED',
          cancellation_reason = ${dto.cancellation_reason},
          cancellation_requested_at = clock_timestamp(),
          updated_at = clock_timestamp()
      WHERE request_id = ${requestId};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (${requestId}, 'Cancellation requested', ${empId}, ${dto.cancellation_reason});
    `;

    return { success: true, message: 'Cancellation requested and awaiting Admin decision.' };
  }

  // ===========================================================================
  // 6. ADMIN LEAVE REQUESTS, REVIEW & DECISIONS
  // ===========================================================================

  async getAdminLeaveRequests(tab: string = 'Pending', search?: string) {
    // 4 Counters (Page 19 Marker 1)
    const [counts] = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING')::int as pending_count,
        COUNT(*) FILTER (WHERE status = 'CANCELLATION_REQUESTED')::int as cancellation_requests_count,
        COUNT(*) FILTER (
          WHERE status = 'APPROVED' AND CURRENT_DATE >= from_date AND CURRENT_DATE <= to_date
        )::int as on_leave_today_count,
        COUNT(*) FILTER (
          WHERE status = 'APPROVED' 
            AND EXTRACT(YEAR FROM decided_at) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM decided_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::int as approved_this_month_count
      FROM leave_requests;
    `;

    let statusCondition = '';
    if (tab === 'Pending') {
      statusCondition = "WHERE r.status IN ('PENDING', 'CANCELLATION_REQUESTED')";
    } else if (tab === 'Approved') {
      statusCondition = "WHERE r.status = 'APPROVED'";
    } else if (tab === 'Rejected') {
      statusCondition = "WHERE r.status = 'REJECTED'";
    } else if (tab === 'Cancelled') {
      statusCondition = "WHERE r.status = 'CANCELLED'";
    } else {
      statusCondition = 'WHERE 1=1';
    }

    if (search && search.trim()) {
      const sanitized = search.trim().replace(/'/g, "''");
      statusCondition += ` AND (r.request_no ILIKE '%${sanitized}%' OR e.name ILIKE '%${sanitized}%')`;
    }

    const requests = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        r.*,
        e.name as employee_name, e.dep_id, d.name as department_name,
        t.name as leave_type_name, t.code as leave_type_code, t.calendar_color,
        (b.opening_balance + b.credited_days + b.carried_forward_days - b.days_taken - b.days_booked) as current_available_balance
      FROM leave_requests r
      JOIN employees e ON r.emp_id = e.emp_id
      LEFT JOIN departments d ON e.dep_id = d.dep_id
      JOIN leave_types t ON r.leave_type_id = t.leave_type_id
      LEFT JOIN leave_balances b ON b.emp_id = r.emp_id 
        AND b.leave_type_id = r.leave_type_id 
        AND b.leave_year = EXTRACT(YEAR FROM r.from_date)::int
      ${statusCondition}
      ORDER BY r.from_date ASC, r.created_at DESC;
    `);

    return {
      counters: counts || {
        pending_count: 0,
        cancellation_requests_count: 0,
        on_leave_today_count: 0,
        approved_this_month_count: 0,
      },
      requests,
    };
  }

  async getLeaveRequestDetails(requestId: number) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT 
        r.*,
        e.name as employee_name, e.dep_id, e.joining_date, e.probation_end_date,
        d.name as department_name,
        t.name as leave_type_name, t.code as leave_type_code, t.calendar_color, t.balance_tracked,
        dec.name as decided_by_name,
        cdec.name as cancellation_decided_by_name
      FROM leave_requests r
      JOIN employees e ON r.emp_id = e.emp_id
      LEFT JOIN departments d ON e.dep_id = d.dep_id
      JOIN leave_types t ON r.leave_type_id = t.leave_type_id
      LEFT JOIN employees dec ON r.decided_by = dec.emp_id
      LEFT JOIN employees cdec ON r.cancellation_decided_by = cdec.emp_id
      WHERE r.request_id = ${requestId}
      LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');

    const leaveYear = new Date(req.from_date).getFullYear();
    const [balance] = await this.prisma.$queryRaw<any[]>`
      SELECT 
        b.*,
        (b.opening_balance + b.credited_days + b.carried_forward_days - b.days_taken - b.days_booked) as available_balance,
        (b.opening_balance + b.credited_days + b.carried_forward_days - b.days_taken - ${req.leave_days}) as balance_after_approval
      FROM leave_balances b
      WHERE b.emp_id = ${req.emp_id} AND b.leave_type_id = ${req.leave_type_id} AND b.leave_year = ${leaveYear}
      LIMIT 1;
    `;

    // Department colleagues on leave during these dates (Page 20 Marker 6)
    const departmentCollisions = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, e.name as employee_name, r.from_date, r.to_date, t.name as leave_type_name
      FROM leave_requests r
      JOIN employees e ON r.emp_id = e.emp_id
      JOIN leave_types t ON r.leave_type_id = t.leave_type_id
      WHERE e.dep_id = ${req.dep_id}
        AND r.emp_id <> ${req.emp_id}
        AND r.status = 'APPROVED'
        AND r.from_date <= ${req.to_date}::date
        AND r.to_date >= ${req.from_date}::date;
    `;

    // History events
    const history = await this.prisma.$queryRaw<any[]>`
      SELECT h.*, e.name as performed_by_name
      FROM leave_request_history h
      LEFT JOIN employees e ON h.performed_by = e.emp_id
      WHERE h.request_id = ${requestId}
      ORDER BY h.performed_at DESC;
    `;

    return {
      request: req,
      balance,
      department_collisions: departmentCollisions,
      history,
    };
  }

  async approveLeaveRequest(requestId: number, adminId: number, dto: ReviewLeaveRequestDto) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_requests WHERE request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve request in ${req.status} status.`);
    }

    const isSelfApproved = adminId === req.emp_id;

    // Update Request
    const [approved] = await this.prisma.$queryRaw<any[]>`
      UPDATE leave_requests
      SET status = 'APPROVED',
          decided_at = clock_timestamp(),
          decided_by = ${adminId},
          decision_remarks = ${dto.remarks || null},
          is_self_approved = ${isSelfApproved},
          updated_at = clock_timestamp()
      WHERE request_id = ${requestId}
      RETURNING *;
    `;

    // Move days from booked to taken in leave_balances
    const leaveYear = new Date(req.from_date).getFullYear();
    await this.prisma.$executeRaw`
      UPDATE leave_balances
      SET days_booked = GREATEST(0, days_booked - ${req.leave_days}),
          days_taken = days_taken + ${req.leave_days},
          updated_at = clock_timestamp()
      WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear};
    `;

    // Record into leave_ledger (TAKEN)
    const [bal] = await this.prisma.$queryRaw<any[]>`
      SELECT (opening_balance + credited_days + carried_forward_days - days_taken - days_booked) as available_balance
      FROM leave_balances
      WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear}
      LIMIT 1;
    `;
    await this.prisma.$executeRaw`
      INSERT INTO leave_ledger (
        emp_id, leave_type_id, entry_type, days, balance_after, note, reference_request_id, performed_by
      ) VALUES (
        ${req.emp_id}, ${req.leave_type_id}, 'TAKEN', -${req.leave_days},
        ${bal?.available_balance || 0.0}, ${req.request_no + ' approved: ' + req.leave_days + ' days'},
        ${requestId}, ${adminId}
      );
    `;

    // Sync to attendance_days
    const curr = new Date(req.from_date);
    const to = new Date(req.to_date);
    while (curr <= to) {
      const dateStr = curr.toISOString().split('T')[0];
      await this.prisma.$executeRaw`
        INSERT INTO attendance_days (
          emp_id, work_date, check_in_at, day_status, leave_request_id, leave_half
        ) VALUES (
          ${req.emp_id}, ${dateStr}::date, clock_timestamp(), 'leave', ${requestId},
          ${req.duration === 'FULL_DAY' ? null : req.duration}
        )
        ON CONFLICT (emp_id, work_date) WHERE deleted_at IS NULL
        DO UPDATE SET 
          day_status = 'leave',
          leave_request_id = ${requestId},
          leave_half = ${req.duration === 'FULL_DAY' ? null : req.duration},
          updated_at = clock_timestamp();
      `;
      curr.setDate(curr.getDate() + 1);
    }

    // History log
    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (
        ${requestId}, 'Approved', ${adminId},
        ${(isSelfApproved ? '[Self-approved] ' : '') + (dto.remarks || 'Approved by Admin')}
      );
    `;

    return approved;
  }

  async rejectLeaveRequest(requestId: number, adminId: number, dto: ReviewLeaveRequestDto) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_requests WHERE request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject request in ${req.status} status.`);
    }

    if (!dto.remarks || dto.remarks.trim().length === 0) {
      throw new BadRequestException('Remarks are required when rejecting a leave request.');
    }

    const [rejected] = await this.prisma.$queryRaw<any[]>`
      UPDATE leave_requests
      SET status = 'REJECTED',
          decided_at = clock_timestamp(),
          decided_by = ${adminId},
          decision_remarks = ${dto.remarks},
          updated_at = clock_timestamp()
      WHERE request_id = ${requestId}
      RETURNING *;
    `;

    // Release booked days
    const leaveYear = new Date(req.from_date).getFullYear();
    await this.prisma.$executeRaw`
      UPDATE leave_balances
      SET days_booked = GREATEST(0, days_booked - ${req.leave_days}), updated_at = clock_timestamp()
      WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (${requestId}, 'Rejected', ${adminId}, ${dto.remarks});
    `;

    return rejected;
  }

  async decideCancellation(requestId: number, adminId: number, dto: DecideCancellationDto) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_requests WHERE request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (req.status !== 'CANCELLATION_REQUESTED') {
      throw new BadRequestException('Leave is not awaiting cancellation decision.');
    }

    if (dto.agree) {
      // Cancel leave
      await this.prisma.$executeRaw`
        UPDATE leave_requests
        SET status = 'CANCELLED',
            cancellation_decided_at = clock_timestamp(),
            cancellation_decided_by = ${adminId},
            cancellation_remarks = ${dto.remarks},
            updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;

      // Return days taken back to balance
      const leaveYear = new Date(req.from_date).getFullYear();
      await this.prisma.$executeRaw`
        UPDATE leave_balances
        SET days_taken = GREATEST(0, days_taken - ${req.leave_days}), updated_at = clock_timestamp()
        WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear};
      `;

      // Record in leave_ledger (RETURNED)
      const [bal] = await this.prisma.$queryRaw<any[]>`
        SELECT (opening_balance + credited_days + carried_forward_days - days_taken - days_booked) as available_balance
        FROM leave_balances
        WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear}
        LIMIT 1;
      `;
      await this.prisma.$executeRaw`
        INSERT INTO leave_ledger (
          emp_id, leave_type_id, entry_type, days, balance_after, note, reference_request_id, performed_by
        ) VALUES (
          ${req.emp_id}, ${req.leave_type_id}, 'RETURNED', ${req.leave_days},
          ${bal?.available_balance || 0.0}, ${req.request_no + ' cancelled: +' + req.leave_days + ' days returned'},
          ${requestId}, ${adminId}
        );
      `;

      // Remove 'leave' status from attendance
      await this.prisma.$executeRaw`
        UPDATE attendance_days
        SET day_status = 'absent', leave_request_id = NULL, leave_half = NULL, updated_at = clock_timestamp()
        WHERE leave_request_id = ${requestId};
      `;

      await this.prisma.$executeRaw`
        INSERT INTO leave_request_history (request_id, event, performed_by, details)
        VALUES (${requestId}, 'Cancellation agreed', ${adminId}, ${dto.remarks});
      `;

      return { success: true, message: 'Cancellation approved. Days returned to balance.' };
    } else {
      // Keep leave
      await this.prisma.$executeRaw`
        UPDATE leave_requests
        SET status = 'APPROVED',
            cancellation_remarks = ${dto.remarks},
            updated_at = clock_timestamp()
        WHERE request_id = ${requestId};
      `;

      await this.prisma.$executeRaw`
        INSERT INTO leave_request_history (request_id, event, performed_by, details)
        VALUES (${requestId}, 'Cancellation refused', ${adminId}, ${dto.remarks});
      `;

      return { success: true, message: 'Cancellation rejected. Leave kept as Approved.' };
    }
  }

  async adminCancelLeave(requestId: number, adminId: number, dto: AdminCancelLeaveDto) {
    const [req] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM leave_requests WHERE request_id = ${requestId} LIMIT 1;
    `;
    if (!req) throw new NotFoundException('Leave request not found.');
    if (req.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED leave can be cancelled.');
    }

    await this.prisma.$executeRaw`
      UPDATE leave_requests
      SET status = 'CANCELLED',
          cancellation_reason = ${dto.reason},
          cancellation_decided_at = clock_timestamp(),
          cancellation_decided_by = ${adminId},
          cancellation_remarks = ${dto.reason},
          updated_at = clock_timestamp()
      WHERE request_id = ${requestId};
    `;

    // Return taken days
    const leaveYear = new Date(req.from_date).getFullYear();
    await this.prisma.$executeRaw`
      UPDATE leave_balances
      SET days_taken = GREATEST(0, days_taken - ${req.leave_days}), updated_at = clock_timestamp()
      WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear};
    `;

    // Record in ledger
    const [bal] = await this.prisma.$queryRaw<any[]>`
      SELECT (opening_balance + credited_days + carried_forward_days - days_taken - days_booked) as available_balance
      FROM leave_balances
      WHERE emp_id = ${req.emp_id} AND leave_type_id = ${req.leave_type_id} AND leave_year = ${leaveYear}
      LIMIT 1;
    `;
    await this.prisma.$executeRaw`
      INSERT INTO leave_ledger (
        emp_id, leave_type_id, entry_type, days, balance_after, note, reference_request_id, performed_by
      ) VALUES (
        ${req.emp_id}, ${req.leave_type_id}, 'RETURNED', ${req.leave_days},
        ${bal?.available_balance || 0.0}, ${'Admin cancelled: ' + dto.reason},
        ${requestId}, ${adminId}
      );
    `;

    // Revert attendance
    await this.prisma.$executeRaw`
      UPDATE attendance_days
      SET day_status = 'absent', leave_request_id = NULL, leave_half = NULL, updated_at = clock_timestamp()
      WHERE leave_request_id = ${requestId};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (${requestId}, 'Cancelled by Admin', ${adminId}, ${dto.reason});
    `;

    return { success: true, message: 'Leave cancelled by Admin.' };
  }

  async addLeaveForEmployee(adminId: number, dto: AddLeaveForEmployeeDto) {
    const calc = await this.calculateLeaveDays(dto.emp_id, dto);
    const leaveType = await this.getLeaveTypeById(dto.leave_type_id);

    const fromDate = new Date(dto.from_date);
    const leaveYear = fromDate.getFullYear();
    const month = String(fromDate.getMonth() + 1).padStart(2, '0');

    const [countRow] = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count FROM leave_requests
      WHERE EXTRACT(YEAR FROM applied_at) = ${leaveYear}
        AND EXTRACT(MONTH FROM applied_at) = ${fromDate.getMonth() + 1};
    `;
    const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
    const requestNo = `LV/${leaveYear}/${month}/${seq}`;

    const [created] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_requests (
        request_no, emp_id, leave_type_id, is_paid, duration,
        from_date, to_date, leave_days, reason, attachment_url,
        is_short_notice, status, applied_by, decided_at, decided_by, decision_remarks
      ) VALUES (
        ${requestNo}, ${dto.emp_id}, ${dto.leave_type_id}, ${leaveType.is_paid}, ${dto.duration},
        ${dto.from_date}::date, ${dto.to_date}::date, ${calc.leave_days}, ${dto.reason}, ${dto.attachment_url || null},
        false, 'APPROVED', ${adminId}, clock_timestamp(), ${adminId}, 'Added directly by Admin'
      )
      RETURNING *;
    `;

    // Deduct directly from balance (days_taken)
    await this.prisma.$executeRaw`
      UPDATE leave_balances
      SET days_taken = days_taken + ${calc.leave_days}, updated_at = clock_timestamp()
      WHERE emp_id = ${dto.emp_id} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear};
    `;

    // Ledger entry
    const [bal] = await this.prisma.$queryRaw<any[]>`
      SELECT (opening_balance + credited_days + carried_forward_days - days_taken - days_booked) as available_balance
      FROM leave_balances
      WHERE emp_id = ${dto.emp_id} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear}
      LIMIT 1;
    `;
    await this.prisma.$executeRaw`
      INSERT INTO leave_ledger (
        emp_id, leave_type_id, entry_type, days, balance_after, note, reference_request_id, performed_by
      ) VALUES (
        ${dto.emp_id}, ${dto.leave_type_id}, 'TAKEN', -${calc.leave_days},
        ${bal?.available_balance || 0.0}, ${'Added by Admin: ' + dto.reason},
        ${created.request_id}, ${adminId}
      );
    `;

    // Sync to attendance
    const curr = new Date(dto.from_date);
    const to = new Date(dto.to_date);
    while (curr <= to) {
      const dateStr = curr.toISOString().split('T')[0];
      await this.prisma.$executeRaw`
        INSERT INTO attendance_days (
          emp_id, work_date, check_in_at, day_status, leave_request_id, leave_half
        ) VALUES (
          ${dto.emp_id}, ${dateStr}::date, clock_timestamp(), 'leave', ${created.request_id},
          ${dto.duration === 'FULL_DAY' ? null : dto.duration}
        )
        ON CONFLICT (emp_id, work_date) WHERE deleted_at IS NULL
        DO UPDATE SET 
          day_status = 'leave',
          leave_request_id = ${created.request_id},
          leave_half = ${dto.duration === 'FULL_DAY' ? null : dto.duration},
          updated_at = clock_timestamp();
      `;
      curr.setDate(curr.getDate() + 1);
    }

    await this.prisma.$executeRaw`
      INSERT INTO leave_request_history (request_id, event, performed_by, details)
      VALUES (${created.request_id}, 'Added by Admin', ${adminId}, ${dto.reason});
    `;

    return created;
  }

  // ===========================================================================
  // 7. LEAVE LEDGER & ADJUSTMENTS
  // ===========================================================================

  async adjustBalance(adminId: number, dto: AdjustBalanceDto) {
    const leaveYear = new Date().getFullYear();
    const signedDays = dto.direction === 'CREDIT' ? dto.days : -dto.days;

    const [admin] = await this.prisma.$queryRaw<any[]>`
      SELECT name FROM employees WHERE emp_id = ${adminId} LIMIT 1;
    `;
    const adminName = admin?.name || 'Admin';

    // Ensure balance row exists
    await this.prisma.$executeRaw`
      INSERT INTO leave_balances (emp_id, leave_type_id, leave_year)
      VALUES (${dto.emp_id}, ${dto.leave_type_id}, ${leaveYear})
      ON CONFLICT (emp_id, leave_type_id, leave_year) DO NOTHING;
    `;

    if (dto.direction === 'CREDIT') {
      await this.prisma.$executeRaw`
        UPDATE leave_balances
        SET credited_days = credited_days + ${dto.days}, updated_at = clock_timestamp()
        WHERE emp_id = ${dto.emp_id} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear};
      `;
    } else {
      // Check limits (Debit cannot take available below 0)
      const [bal] = await this.prisma.$queryRaw<any[]>`
        SELECT (opening_balance + credited_days + carried_forward_days - days_taken - days_booked) as available_balance
        FROM leave_balances
        WHERE emp_id = ${dto.emp_id} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear}
        LIMIT 1;
      `;
      if (Number(bal?.available_balance || 0) < dto.days) {
        throw new BadRequestException('A Debit cannot take the Available Balance below 0.');
      }

      await this.prisma.$executeRaw`
        UPDATE leave_balances
        SET credited_days = GREATEST(0, credited_days - ${dto.days}), updated_at = clock_timestamp()
        WHERE emp_id = ${dto.emp_id} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear};
      `;
    }

    const [balAfter] = await this.prisma.$queryRaw<any[]>`
      SELECT (opening_balance + credited_days + carried_forward_days - days_taken - days_booked) as available_balance
      FROM leave_balances
      WHERE emp_id = ${dto.emp_id} AND leave_type_id = ${dto.leave_type_id} AND leave_year = ${leaveYear}
      LIMIT 1;
    `;

    const noteFormatted = `${adminName}: ${dto.direction === 'CREDIT' ? '+' : '-'}${dto.days}, "${dto.note}"`;

    await this.prisma.$executeRaw`
      INSERT INTO leave_ledger (
        emp_id, leave_type_id, entry_type, days, balance_after, note, performed_by
      ) VALUES (
        ${dto.emp_id}, ${dto.leave_type_id}, 'ADJUSTED', ${signedDays},
        ${balAfter?.available_balance || 0.0}, ${noteFormatted}, ${adminId}
      );
    `;

    return {
      success: true,
      message: 'Balance adjusted successfully.',
      available_balance: balAfter?.available_balance || 0.0,
    };
  }

  async getLeaveLedger(empId: number, leaveTypeId?: number) {
    let filter = `WHERE l.emp_id = ${empId}`;
    if (leaveTypeId) {
      filter += ` AND l.leave_type_id = ${leaveTypeId}`;
    }

    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        l.*, t.name as leave_type_name, t.code as leave_type_code,
        e.name as performed_by_name
      FROM leave_ledger l
      JOIN leave_types t ON l.leave_type_id = t.leave_type_id
      LEFT JOIN employees e ON l.performed_by = e.emp_id
      ${filter}
      ORDER BY l.performed_at DESC;
    `);
  }

  async getAllEmployeeBalances(yearParam?: number) {
    const currentYear = yearParam || new Date().getFullYear();

    return this.prisma.$queryRaw<any[]>`
      SELECT 
        e.emp_id, e.name as employee_name, d.name as department_name,
        p.name as policy_name,
        json_agg(
          json_build_object(
            'leave_type_id', t.leave_type_id,
            'name', t.name,
            'code', t.code,
            'calendar_color', t.calendar_color,
            'opening_balance', COALESCE(b.opening_balance, 0),
            'credited_days', COALESCE(b.credited_days, 0),
            'carried_forward_days', COALESCE(b.carried_forward_days, 0),
            'days_taken', COALESCE(b.days_taken, 0),
            'days_booked', COALESCE(b.days_booked, 0),
            'available_balance', COALESCE(b.opening_balance + b.credited_days + b.carried_forward_days - b.days_taken - b.days_booked, 0)
          )
        ) as balances
      FROM employees e
      LEFT JOIN departments d ON e.dep_id = d.dep_id
      LEFT JOIN leave_policies p ON e.leave_policy_id = p.policy_id
      CROSS JOIN leave_types t
      LEFT JOIN leave_balances b ON b.emp_id = e.emp_id AND b.leave_type_id = t.leave_type_id AND b.leave_year = ${currentYear}
      WHERE e.status = 'Active' AND t.status = 'ACTIVE' AND t.balance_tracked = true
      GROUP BY e.emp_id, e.name, d.name, p.name
      ORDER BY e.name ASC;
    `;
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async logChange(
    entityType: 'LEAVE_TYPE' | 'LEAVE_POLICY' | 'GENERAL_SETTINGS',
    entityId: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    adminId: number,
  ) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO leave_settings_change_log (
          entity_type, entity_id, field_name, old_value, new_value, changed_by
        ) VALUES (
          ${entityType}, ${entityId}, ${fieldName}, ${oldValue}, ${newValue}, ${adminId}
        );
      `;
    } catch (err) {
      console.error('Failed to log change:', err);
    }
  }
}
