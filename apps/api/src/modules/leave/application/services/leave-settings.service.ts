import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { LeaveCoreService } from './leave-core.service';
import { LeaveNotifierService } from './leave-notifier.service';
import {
  CreateLeavePolicyDto,
  CreateLeaveTypeDto,
  LeavePolicyRuleInputDto,
  UpdateGeneralSettingsDto,
  UpdateLeavePolicyDto,
  UpdateLeaveTypeDto,
} from '../../presentation/dto/leave.dto';
import { isHalfStep, num } from '../../domain/leave-dates';

const LOOKUP_TYPES = [
  'leave_calendar_color',
  'leave_applies_to',
  'leave_credit_frequency',
  'leave_duration',
  'leave_request_status',
  'leave_year_start',
  'leave_year_end_processing',
  'leave_adjust_direction',
] as const;

/** Lookups whose stored value is the upper-cased code (enum columns). */
const ENUM_LOOKUPS = new Set<string>([
  'leave_applies_to',
  'leave_credit_frequency',
  'leave_duration',
  'leave_request_status',
  'leave_year_start',
  'leave_year_end_processing',
  'leave_adjust_direction',
]);

const TYPE_FIELDS = [
  'name', 'code', 'is_paid', 'balance_tracked', 'half_day_allowed', 'applies_to',
  'calendar_color', 'description', 'status',
];

const RULE_FIELDS = [
  'days_per_year', 'credit_frequency', 'carry_forward_days', 'max_at_once', 'min_notice_days',
  'backdated_days', 'attachment_after_days', 'allowed_during_probation', 'comp_off_expiry_days',
];

const GENERAL_FIELDS = [
  'leave_year_start', 'count_sandwich_leave', 'pending_reminder_hours', 'approve_after_leave_started',
  'year_end_processing', 'comp_off_hours_per_day',
];

@Injectable()
export class LeaveSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
    private readonly notifier: LeaveNotifierService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lookups (every Leave dropdown comes from master_lookup)
  // ---------------------------------------------------------------------------

  async getLookups(): Promise<Record<string, Array<{ value: string; label: string; code: string }>>> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT lookup_type, code, label FROM master_lookup
      WHERE lookup_type = ANY(${[...LOOKUP_TYPES]}::text[]) AND is_active = true AND deleted_at IS NULL
      ORDER BY lookup_type ASC, sort_order ASC, lookup_id ASC;
    `;
    const out: Record<string, Array<{ value: string; label: string; code: string }>> = {};
    for (const t of LOOKUP_TYPES) out[t] = [];
    for (const r of rows) {
      out[r.lookup_type].push({
        code: r.code,
        label: r.label,
        value: ENUM_LOOKUPS.has(r.lookup_type) ? String(r.code).toUpperCase() : r.code,
      });
    }
    return out;
  }

  private async assertLookup(type: string, value: string, field: string): Promise<void> {
    const code = ENUM_LOOKUPS.has(type) ? value.toLowerCase() : value;
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT 1 AS ok FROM master_lookup
      WHERE lookup_type = ${type} AND code = ${code} AND is_active = true AND deleted_at IS NULL LIMIT 1;
    `;
    if (!r) throw new BadRequestException({ message: `"${value}" is not a valid option.`, field });
  }

  private async notifySettingsChanged(adminId: number, what: string): Promise<void> {
    const admins = await this.core.getAdminIds();
    const [a] = await this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${adminId}`;
    await this.notifier.notify({
      recipients: admins,
      title: 'Leave Settings changed',
      body: `${a?.name || 'An Admin'} changed ${what}.`,
      kind: 'leave_settings',
      actorId: adminId,
    });
  }

  // ---------------------------------------------------------------------------
  // Leave Types
  // ---------------------------------------------------------------------------

  async getLeaveTypes() {
    return this.prisma.$queryRaw<any[]>`
      SELECT t.*,
        EXISTS (SELECT 1 FROM leave_requests r WHERE r.leave_type_id = t.leave_type_id) AS is_used,
        (SELECT COUNT(*)::int FROM leave_policy_rules pr WHERE pr.leave_type_id = t.leave_type_id) AS policies_count
      FROM leave_types t
      ORDER BY t.leave_type_id ASC;
    `;
  }

  async getLeaveTypeById(id: number) {
    return this.core.getLeaveType(id);
  }

  private async validateType(dto: CreateLeaveTypeDto | UpdateLeaveTypeDto, existing?: any) {
    const name = (dto.name ?? existing?.name ?? '').trim();
    const code = (dto.code ?? existing?.code ?? '').trim().toUpperCase();
    const isPaid = dto.is_paid ?? existing?.is_paid;
    const tracked = dto.balance_tracked ?? existing?.balance_tracked;

    if (name.length < 3 || name.length > 50) {
      throw new BadRequestException({ message: 'Leave Type Name must be 3 to 50 characters.', field: 'name' });
    }
    if (!/^[A-Z]{2,5}$/.test(code)) {
      throw new BadRequestException({ message: 'Code must be 2 to 5 capital letters, such as CL.', field: 'code' });
    }
    if (tracked === false && isPaid !== false) {
      throw new BadRequestException({
        message: 'Only an Unpaid leave type can be "No limit".',
        field: 'balance_tracked',
      });
    }
    if (dto.applies_to) await this.assertLookup('leave_applies_to', dto.applies_to, 'applies_to');
    if (dto.calendar_color) await this.assertLookup('leave_calendar_color', dto.calendar_color, 'calendar_color');
    if (dto.description && dto.description.length > 200) {
      throw new BadRequestException({ message: 'Description can be up to 200 characters.', field: 'description' });
    }

    const id = existing?.leave_type_id ?? 0;
    const [dupName] = await this.prisma.$queryRaw<any[]>`
      SELECT 1 FROM leave_types WHERE lower(name) = lower(${name}) AND leave_type_id <> ${id} LIMIT 1;
    `;
    if (dupName) throw new BadRequestException({ message: 'A leave type with this name already exists.', field: 'name' });
    const [dupCode] = await this.prisma.$queryRaw<any[]>`
      SELECT 1 FROM leave_types WHERE code = ${code} AND leave_type_id <> ${id} LIMIT 1;
    `;
    if (dupCode) throw new BadRequestException({ message: 'A leave type with this code already exists.', field: 'code' });
    return { name, code };
  }

  async createLeaveType(dto: CreateLeaveTypeDto, adminId: number) {
    const { name, code } = await this.validateType(dto);
    const [created] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_types (
        name, code, is_paid, balance_tracked, half_day_allowed,
        applies_to, calendar_color, description, status, created_by
      ) VALUES (
        ${name}, ${code}, ${dto.is_paid}, ${dto.balance_tracked}, ${dto.half_day_allowed},
        ${dto.applies_to}, ${dto.calendar_color}, ${dto.description?.trim() || null}, ${dto.status || 'ACTIVE'}, ${adminId}
      )
      RETURNING *;
    `;
    await this.core.logSettingsChange('LEAVE_TYPE', created.leave_type_id, 'created', null, `${name} (${code})`, adminId);
    await this.core.logFieldChanges('LEAVE_TYPE', created.leave_type_id, {}, created, TYPE_FIELDS, adminId);
    await this.notifySettingsChanged(adminId, `Leave Type "${name}" (created)`);
    return created;
  }

  async updateLeaveType(id: number, dto: UpdateLeaveTypeDto, adminId: number) {
    const existing = await this.core.getLeaveType(id);
    const { name, code } = await this.validateType(dto, existing);
    const v = <K extends keyof UpdateLeaveTypeDto>(k: K, fallback: any) => (dto[k] !== undefined ? dto[k] : fallback);

    const [updated] = await this.prisma.$queryRaw<any[]>`
      UPDATE leave_types
      SET name = ${name},
          code = ${code},
          is_paid = ${v('is_paid', existing.is_paid)},
          balance_tracked = ${v('balance_tracked', existing.balance_tracked)},
          half_day_allowed = ${v('half_day_allowed', existing.half_day_allowed)},
          applies_to = ${v('applies_to', existing.applies_to)},
          calendar_color = ${v('calendar_color', existing.calendar_color)},
          description = ${dto.description !== undefined ? dto.description?.trim() || null : existing.description},
          status = ${v('status', existing.status)},
          updated_at = clock_timestamp(),
          updated_by = ${adminId}
      WHERE leave_type_id = ${id}
      RETURNING *;
    `;
    const changed = await this.core.logFieldChanges('LEAVE_TYPE', id, existing, updated, TYPE_FIELDS, adminId);
    if (changed > 0) await this.notifySettingsChanged(adminId, `Leave Type "${updated.name}"`);
    return updated;
  }

  async toggleLeaveTypeStatus(id: number, adminId: number) {
    const existing = await this.core.getLeaveType(id);
    const status = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateLeaveType(id, { status }, adminId);
  }

  async deleteLeaveType(id: number, adminId: number) {
    const existing = await this.core.getLeaveType(id);
    const [used] = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM leave_requests WHERE leave_type_id = ${id} LIMIT 1`;
    const [ledger] = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM leave_ledger WHERE leave_type_id = ${id} LIMIT 1`;
    if (used || ledger) {
      throw new BadRequestException(
        'This leave type has been used and cannot be deleted. You can make it Inactive instead.',
      );
    }
    const [inRules] = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM leave_policy_rules WHERE leave_type_id = ${id} LIMIT 1`;
    if (inRules) {
      throw new BadRequestException('This leave type is part of a Leave Policy. Remove it from the policy first.');
    }
    await this.prisma.$executeRaw`DELETE FROM leave_balances WHERE leave_type_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM leave_types WHERE leave_type_id = ${id}`;
    await this.core.logSettingsChange('LEAVE_TYPE', id, 'deleted', `${existing.name} (${existing.code})`, 'Deleted', adminId);
    await this.notifySettingsChanged(adminId, `Leave Type "${existing.name}" (deleted)`);
    return { success: true, message: `Leave Type ${existing.name} was deleted.` };
  }

  // ---------------------------------------------------------------------------
  // Leave Policies
  // ---------------------------------------------------------------------------

  private async withRules(policies: any[]) {
    const ids = policies.map((p) => p.policy_id);
    if (!ids.length) return [];
    const rules = await this.prisma.$queryRaw<any[]>`
      SELECT r.*, t.name AS leave_type_name, t.code AS leave_type_code, t.is_paid, t.balance_tracked,
             t.calendar_color, t.status AS leave_type_status
      FROM leave_policy_rules r
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.policy_id = ANY(${ids}::int[])
      ORDER BY r.rule_id ASC;
    `;
    return policies.map((p) => ({
      ...p,
      rules: rules
        .filter((r) => r.policy_id === p.policy_id)
        .map((r) => ({
          ...r,
          days_per_year: r.days_per_year === null ? null : num(r.days_per_year),
          carry_forward_days: num(r.carry_forward_days),
          max_at_once: r.max_at_once === null ? null : num(r.max_at_once),
          attachment_after_days: r.attachment_after_days === null ? null : num(r.attachment_after_days),
        })),
    }));
  }

  async getLeavePolicies() {
    const s = await this.core.getSettings();
    const policies = await this.prisma.$queryRaw<any[]>`
      SELECT p.policy_id, p.name, p.pro_rata, p.status, p.created_at, p.updated_at,
        (SELECT COUNT(*)::int FROM employees e
          WHERE e.leave_policy_id = p.policy_id AND e.deleted_at IS NULL AND e.status <> 'Inactive') AS employees_count
      FROM leave_policies p
      ORDER BY p.policy_id ASC;
    `;
    const out = await this.withRules(policies);
    return out.map((p) => ({ ...p, leave_year_start: s.leave_year_start }));
  }

  async getLeavePolicyById(id: number) {
    const policies = await this.prisma.$queryRaw<any[]>`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM employees e
          WHERE e.leave_policy_id = p.policy_id AND e.deleted_at IS NULL AND e.status <> 'Inactive') AS employees_count
      FROM leave_policies p WHERE p.policy_id = ${id} LIMIT 1;
    `;
    if (!policies.length) throw new NotFoundException(`Leave Policy with ID ${id} not found.`);
    const [p] = await this.withRules(policies);
    return p;
  }

  private async validateRules(rules: LeavePolicyRuleInputDto[], existingTypeIds: number[] = []) {
    const seen = new Set<number>();
    for (const r of rules) {
      if (seen.has(r.leave_type_id)) {
        throw new BadRequestException({ message: 'A leave type can be added to a policy only once.', field: 'rules' });
      }
      seen.add(r.leave_type_id);
      const t = await this.core.getLeaveType(r.leave_type_id);
      if (t.status !== 'ACTIVE' && !existingTypeIds.includes(r.leave_type_id)) {
        throw new BadRequestException({ message: `${t.name} is Inactive and cannot be added to a policy.`, field: 'rules' });
      }
      await this.assertLookup('leave_credit_frequency', r.credit_frequency, 'credit_frequency');
      if (!t.balance_tracked) {
        r.days_per_year = undefined;
      } else if (r.credit_frequency !== 'FROM_APPROVED_OT') {
        if (r.days_per_year === undefined || r.days_per_year === null) {
          throw new BadRequestException({ message: `Please enter Days per year for ${t.name}.`, field: 'rules' });
        }
        if (r.days_per_year < 0 || r.days_per_year > 365 || !isHalfStep(r.days_per_year)) {
          throw new BadRequestException({
            message: `Days per year for ${t.name} must be 0 to 365, in steps of 0.5.`,
            field: 'rules',
          });
        }
      } else {
        r.days_per_year = undefined;
      }
      for (const [k, label] of [
        ['carry_forward_days', 'Carry forward'],
        ['max_at_once', 'Maximum at a time'],
        ['attachment_after_days', 'Attachment after days'],
      ] as const) {
        const val = (r as any)[k];
        if (val !== undefined && val !== null && (!isHalfStep(Number(val)) || Number(val) < 0)) {
          throw new BadRequestException({ message: `${label} for ${t.name} must be in steps of 0.5.`, field: 'rules' });
        }
      }
    }
  }

  async createLeavePolicy(dto: CreateLeavePolicyDto, adminId: number) {
    const name = dto.name.trim();
    const [dup] = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM leave_policies WHERE lower(name) = lower(${name}) LIMIT 1`;
    if (dup) throw new BadRequestException({ message: 'A leave policy with this name already exists.', field: 'name' });
    await this.validateRules(dto.rules || []);

    const created = await this.prisma.$transaction(async (tx) => {
      const [p] = await tx.$queryRaw<any[]>`
        INSERT INTO leave_policies (name, pro_rata, status, created_by)
        VALUES (${name}, ${dto.pro_rata ?? true}, ${dto.status || 'ACTIVE'}, ${adminId})
        RETURNING *;
      `;
      for (const rule of dto.rules || []) await this.insertRule(tx, p.policy_id, rule);
      return p;
    });
    await this.core.logSettingsChange('LEAVE_POLICY', created.policy_id, 'created', null, name, adminId);
    await this.notifySettingsChanged(adminId, `Leave Policy "${name}" (created)`);
    return this.getLeavePolicyById(created.policy_id);
  }

  private async insertRule(db: any, policyId: number, rule: LeavePolicyRuleInputDto) {
    await db.$executeRaw`
      INSERT INTO leave_policy_rules (
        policy_id, leave_type_id, days_per_year, credit_frequency, carry_forward_days,
        max_at_once, min_notice_days, backdated_days, attachment_after_days,
        allowed_during_probation, comp_off_expiry_days
      ) VALUES (
        ${policyId}, ${rule.leave_type_id}, ${rule.days_per_year ?? null}, ${rule.credit_frequency},
        ${rule.carry_forward_days ?? 0}, ${rule.max_at_once ?? null}, ${rule.min_notice_days ?? 0},
        ${rule.backdated_days ?? 0}, ${rule.attachment_after_days ?? null}, ${rule.allowed_during_probation ?? true},
        ${rule.comp_off_expiry_days ?? 90}
      );
    `;
  }

  async updateLeavePolicy(id: number, dto: UpdateLeavePolicyDto, adminId: number) {
    const existing = await this.getLeavePolicyById(id);
    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    if (name !== existing.name) {
      const [dup] = await this.prisma.$queryRaw<any[]>`
        SELECT 1 FROM leave_policies WHERE lower(name) = lower(${name}) AND policy_id <> ${id} LIMIT 1;
      `;
      if (dup) throw new BadRequestException({ message: 'A leave policy with this name already exists.', field: 'name' });
    }
    if (dto.status === 'INACTIVE' && existing.employees_count > 0) {
      throw new BadRequestException({
        message: `${existing.employees_count} employees are on this policy. Move them to another policy before making it Inactive.`,
        field: 'status',
      });
    }
    const existingTypeIds = (existing.rules || []).map((r: any) => r.leave_type_id);
    if (dto.rules) await this.validateRules(dto.rules, existingTypeIds);

    const updatedPolicy = { ...existing, name, pro_rata: dto.pro_rata ?? existing.pro_rata, status: dto.status ?? existing.status };

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE leave_policies
        SET name = ${updatedPolicy.name}, pro_rata = ${updatedPolicy.pro_rata}, status = ${updatedPolicy.status},
            updated_at = clock_timestamp(), updated_by = ${adminId}
        WHERE policy_id = ${id};
      `;
      if (dto.rules) {
        const keep = dto.rules.map((r) => r.leave_type_id);
        // Removed types: rules deleted. Balances and history are kept.
        for (const old of existing.rules) {
          if (!keep.includes(old.leave_type_id)) {
            await tx.$executeRaw`DELETE FROM leave_policy_rules WHERE rule_id = ${old.rule_id}`;
          }
        }
        for (const rule of dto.rules) {
          const old = existing.rules.find((r: any) => r.leave_type_id === rule.leave_type_id);
          if (!old) {
            await this.insertRule(tx, id, rule);
          } else {
            await tx.$executeRaw`
              UPDATE leave_policy_rules SET
                days_per_year = ${rule.days_per_year ?? null},
                credit_frequency = ${rule.credit_frequency},
                carry_forward_days = ${rule.carry_forward_days ?? 0},
                max_at_once = ${rule.max_at_once ?? null},
                min_notice_days = ${rule.min_notice_days ?? 0},
                backdated_days = ${rule.backdated_days ?? 0},
                attachment_after_days = ${rule.attachment_after_days ?? null},
                allowed_during_probation = ${rule.allowed_during_probation ?? true},
                comp_off_expiry_days = ${rule.comp_off_expiry_days ?? 90},
                updated_at = clock_timestamp()
              WHERE rule_id = ${old.rule_id};
            `;
          }
        }
      }
    });

    let changed = await this.core.logFieldChanges('LEAVE_POLICY', id, existing, updatedPolicy, ['name', 'pro_rata', 'status'], adminId);
    if (dto.rules) {
      for (const rule of dto.rules) {
        const old = existing.rules.find((r: any) => r.leave_type_id === rule.leave_type_id);
        const t = await this.core.getLeaveType(rule.leave_type_id);
        if (!old) {
          await this.core.logSettingsChange('LEAVE_POLICY', id, `${t.code}: added`, null, 'Added to policy', adminId);
          changed++;
          continue;
        }
        const before: Record<string, any> = {};
        const after: Record<string, any> = {};
        for (const f of RULE_FIELDS) {
          before[`${t.code}.${f}`] = old[f] === null || old[f] === undefined ? null : typeof old[f] === 'boolean' ? old[f] : num(old[f]) || old[f];
          const nv = (rule as any)[f];
          after[`${t.code}.${f}`] = nv === undefined ? null : typeof nv === 'boolean' ? nv : num(nv) || nv;
        }
        changed += await this.core.logFieldChanges('LEAVE_POLICY', id, before, after, Object.keys(before), adminId);
      }
      for (const old of existing.rules) {
        if (!dto.rules.some((r) => r.leave_type_id === old.leave_type_id)) {
          await this.core.logSettingsChange('LEAVE_POLICY', id, `${old.leave_type_code}: removed`, 'In policy', 'Removed', adminId);
          changed++;
        }
      }
    }
    if (changed > 0) await this.notifySettingsChanged(adminId, `Leave Policy "${name}"`);
    return this.getLeavePolicyById(id);
  }

  async copyLeavePolicy(id: number, newName: string, adminId: number) {
    const source = await this.getLeavePolicyById(id);
    const name = newName.trim();
    const [dup] = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM leave_policies WHERE lower(name) = lower(${name}) LIMIT 1`;
    if (dup) throw new BadRequestException({ message: 'A policy with this name already exists.', field: 'new_name' });

    const created = await this.prisma.$transaction(async (tx) => {
      const [p] = await tx.$queryRaw<any[]>`
        INSERT INTO leave_policies (name, pro_rata, status, created_by)
        VALUES (${name}, ${source.pro_rata}, 'ACTIVE', ${adminId}) RETURNING *;
      `;
      for (const r of source.rules) {
        await this.insertRule(tx, p.policy_id, {
          leave_type_id: r.leave_type_id,
          days_per_year: r.days_per_year ?? undefined,
          credit_frequency: r.credit_frequency,
          carry_forward_days: num(r.carry_forward_days),
          max_at_once: r.max_at_once ?? undefined,
          min_notice_days: r.min_notice_days,
          backdated_days: r.backdated_days,
          attachment_after_days: r.attachment_after_days ?? undefined,
          allowed_during_probation: r.allowed_during_probation,
          comp_off_expiry_days: r.comp_off_expiry_days,
        });
      }
      return p;
    });
    await this.core.logSettingsChange('LEAVE_POLICY', created.policy_id, 'copied from', source.name, name, adminId);
    await this.notifySettingsChanged(adminId, `Leave Policy "${name}" (copied from "${source.name}")`);
    return this.getLeavePolicyById(created.policy_id);
  }

  // ---------------------------------------------------------------------------
  // General settings
  // ---------------------------------------------------------------------------

  async getGeneralSettings() {
    const s = await this.core.getSettings();
    const [opened] = await this.prisma.$queryRaw<any[]>`
      SELECT (EXISTS (SELECT 1 FROM leave_ledger) OR EXISTS (SELECT 1 FROM leave_requests)) AS opened;
    `;
    return { ...s, leave_year_locked: Boolean(opened?.opened) };
  }

  async updateGeneralSettings(dto: UpdateGeneralSettingsDto, adminId: number) {
    const existing = await this.getGeneralSettings();
    if (dto.leave_year_start && dto.leave_year_start !== existing.leave_year_start) {
      await this.assertLookup('leave_year_start', dto.leave_year_start, 'leave_year_start');
      if (existing.leave_year_locked) {
        throw new BadRequestException({
          message: 'The Leave Year can be changed only before the first leave year is opened.',
          field: 'leave_year_start',
        });
      }
    }
    if (dto.year_end_processing) {
      await this.assertLookup('leave_year_end_processing', dto.year_end_processing, 'year_end_processing');
    }
    const next = {
      leave_year_start: dto.leave_year_start ?? existing.leave_year_start,
      count_sandwich_leave: dto.count_sandwich_leave ?? existing.count_sandwich_leave,
      pending_reminder_hours: dto.pending_reminder_hours ?? existing.pending_reminder_hours,
      approve_after_leave_started: dto.approve_after_leave_started ?? existing.approve_after_leave_started,
      year_end_processing: dto.year_end_processing ?? existing.year_end_processing,
      comp_off_hours_per_day: dto.comp_off_hours_per_day ?? existing.comp_off_hours_per_day,
    };
    await this.prisma.$executeRaw`
      UPDATE leave_general_settings
      SET leave_year_start = ${next.leave_year_start},
          count_sandwich_leave = ${next.count_sandwich_leave},
          pending_reminder_hours = ${next.pending_reminder_hours},
          approve_after_leave_started = ${next.approve_after_leave_started},
          year_end_processing = ${next.year_end_processing},
          comp_off_hours_per_day = ${next.comp_off_hours_per_day},
          updated_at = clock_timestamp(),
          updated_by = ${adminId}
      WHERE setting_id = ${existing.setting_id};
    `;
    const changed = await this.core.logFieldChanges(
      'GENERAL_SETTINGS', existing.setting_id, existing, next, GENERAL_FIELDS, adminId,
    );
    if (changed > 0) await this.notifySettingsChanged(adminId, 'Leave General settings');
    return this.getGeneralSettings();
  }

  async getSettingsChangeLog(limit = 200) {
    return this.prisma.$queryRaw<any[]>`
      SELECT l.log_id, l.entity_type, l.entity_id, l.field_name, l.old_value, l.new_value, l.changed_at,
             e.name AS changed_by_name,
             CASE l.entity_type
               WHEN 'LEAVE_TYPE' THEN (SELECT name FROM leave_types WHERE leave_type_id = l.entity_id)
               WHEN 'LEAVE_POLICY' THEN (SELECT name FROM leave_policies WHERE policy_id = l.entity_id)
               ELSE 'General settings'
             END AS entity_name
      FROM settings_change_log l
      LEFT JOIN employees e ON l.changed_by = e.emp_id
      WHERE l.module = 'LEAVE'
      ORDER BY l.changed_at DESC
      LIMIT ${limit};
    `;
  }
}
