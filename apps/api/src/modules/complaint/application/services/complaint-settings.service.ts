import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateComplaintTypeDto,
  UpdateComplaintTypeDto,
  UpdateComplaintSettingsDto,
} from '../../presentation/dto/complaint-settings.dto';

@Injectable()
export class ComplaintSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // 1. COMPLAINT TYPES (MASTER DATA CRUD - BFD Page 12 & 29)
  // ===========================================================================

  async getComplaintTypes(includeInactive: boolean = false) {
    const where: any = {
      deleted_at: null,
    };
    if (!includeInactive) {
      where.is_active = true;
    }

    const types = await this.prisma.complaint_types.findMany({
      where,
      include: {
        employees_complaint_types_default_handlerToemployees: {
          select: { emp_id: true, name: true },
        },
        departments: {
          select: { dep_id: true, name: true },
        },
        _count: {
          select: { complaints: true },
        },
      },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });

    return types.map((t) => ({
      type_id: t.type_id,
      name: t.name,
      code: t.code,
      description: t.description,
      default_handler_id: t.default_handler_id,
      default_handler_name: t.employees_complaint_types_default_handlerToemployees?.name || null,
      default_department_id: t.default_department_id,
      default_department_name: t.departments?.name || null,
      default_priority: t.default_priority,
      is_always_confidential: t.is_always_confidential,
      display_order: t.display_order,
      is_active: t.is_active,
      complaints_count: t._count.complaints,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  async getComplaintTypeById(typeId: number) {
    const type = await this.prisma.complaint_types.findFirst({
      where: { type_id: typeId, deleted_at: null },
      include: {
        employees_complaint_types_default_handlerToemployees: {
          select: { emp_id: true, name: true },
        },
        departments: {
          select: { dep_id: true, name: true },
        },
        _count: {
          select: { complaints: true },
        },
      },
    });

    if (!type) {
      throw new NotFoundException(`Complaint type with ID ${typeId} not found`);
    }

    return {
      type_id: type.type_id,
      name: type.name,
      code: type.code,
      description: type.description,
      default_handler_id: type.default_handler_id,
      default_handler_name: type.employees_complaint_types_default_handlerToemployees?.name || null,
      default_department_id: type.default_department_id,
      default_department_name: type.departments?.name || null,
      default_priority: type.default_priority,
      is_always_confidential: type.is_always_confidential,
      display_order: type.display_order,
      is_active: type.is_active,
      complaints_count: type._count.complaints,
    };
  }

  async createComplaintType(dto: CreateComplaintTypeDto, userId: number) {
    const existingName = await this.prisma.complaint_types.findFirst({
      where: {
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        deleted_at: null,
      },
    });
    if (existingName) {
      throw new ConflictException(`Complaint type with name "${dto.name}" already exists`);
    }

    const code =
      dto.code?.trim().toUpperCase() ||
      dto.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const existingCode = await this.prisma.complaint_types.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        deleted_at: null,
      },
    });
    if (existingCode) {
      throw new ConflictException(`Complaint type with code "${code}" already exists`);
    }

    return this.prisma.complaint_types.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description.trim(),
        default_handler_id: dto.default_handler_id || null,
        default_department_id: dto.default_department_id || null,
        default_priority: dto.default_priority,
        is_always_confidential: dto.is_always_confidential ?? false,
        display_order: dto.display_order ?? 1,
        is_active: dto.is_active ?? true,
        created_by: userId,
      },
    });
  }

  async updateComplaintType(typeId: number, dto: UpdateComplaintTypeDto, userId: number) {
    const existing = await this.prisma.complaint_types.findFirst({
      where: { type_id: typeId, deleted_at: null },
    });
    if (!existing) {
      throw new NotFoundException(`Complaint type with ID ${typeId} not found`);
    }

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicateName = await this.prisma.complaint_types.findFirst({
        where: {
          name: { equals: dto.name.trim(), mode: 'insensitive' },
          type_id: { not: typeId },
          deleted_at: null,
        },
      });
      if (duplicateName) {
        throw new ConflictException(`Complaint type with name "${dto.name}" already exists`);
      }
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code.toUpperCase()) {
      const duplicateCode = await this.prisma.complaint_types.findFirst({
        where: {
          code: { equals: dto.code.trim(), mode: 'insensitive' },
          type_id: { not: typeId },
          deleted_at: null,
        },
      });
      if (duplicateCode) {
        throw new ConflictException(`Complaint type with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.complaint_types.update({
      where: { type_id: typeId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.description && { description: dto.description.trim() }),
        ...(dto.default_handler_id !== undefined && { default_handler_id: dto.default_handler_id }),
        ...(dto.default_department_id !== undefined && { default_department_id: dto.default_department_id }),
        ...(dto.default_priority && { default_priority: dto.default_priority }),
        ...(dto.is_always_confidential !== undefined && { is_always_confidential: dto.is_always_confidential }),
        ...(dto.display_order !== undefined && { display_order: dto.display_order }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
        updated_by: userId,
        row_version: { increment: 1 },
      },
    });
  }

  async toggleComplaintTypeStatus(typeId: number, userId: number) {
    const existing = await this.prisma.complaint_types.findFirst({
      where: { type_id: typeId, deleted_at: null },
    });
    if (!existing) {
      throw new NotFoundException(`Complaint type with ID ${typeId} not found`);
    }

    return this.prisma.complaint_types.update({
      where: { type_id: typeId },
      data: {
        is_active: !existing.is_active,
        updated_at: new Date(),
        updated_by: userId,
        row_version: { increment: 1 },
      },
    });
  }

  async deleteComplaintType(typeId: number, userId: number) {
    const existing = await this.prisma.complaint_types.findFirst({
      where: { type_id: typeId, deleted_at: null },
      include: {
        _count: { select: { complaints: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Complaint type with ID ${typeId} not found`);
    }

    // BFD Page 29 Rule: "A type in use cannot be deleted, only switched off."
    if (existing._count.complaints > 0) {
      throw new BadRequestException(
        `This complaint type is in use by ${existing._count.complaints} complaint(s) and cannot be deleted. You can switch it off instead.`,
      );
    }

    return this.prisma.complaint_types.update({
      where: { type_id: typeId },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
        is_active: false,
      },
    });
  }

  // ===========================================================================
  // 2. GENERAL SETTINGS & CHANGE LOG (BFD Page 29)
  // ===========================================================================

  async getSettings() {
    let settings = await this.prisma.complaint_settings.findFirst({
      orderBy: { setting_id: 'asc' },
    });

    if (!settings) {
      settings = await this.prisma.complaint_settings.create({
        data: {
          target_days_low: 15,
          target_days_medium: 7,
          target_days_high: 3,
          target_days_urgent: 1,
          confirmation_window_days: 7,
          reminder_before_target_days: 1,
          review_reminder_hours: 24,
          old_date_warning_days: 90,
          duplicate_warning: true,
        },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateComplaintSettingsDto, userId: number) {
    const current = await this.getSettings();

    // Compute change logs for each modified rule
    const changes: Array<{ field: string; oldVal: string; newVal: string }> = [];

    const checkField = (field: keyof UpdateComplaintSettingsDto, label: string) => {
      if (dto[field] !== undefined && dto[field] !== (current as any)[field]) {
        changes.push({
          field: label,
          oldVal: String((current as any)[field]),
          newVal: String(dto[field]),
        });
      }
    };

    checkField('target_days_low', 'Target days: Low');
    checkField('target_days_medium', 'Target days: Medium');
    checkField('target_days_high', 'Target days: High');
    checkField('target_days_urgent', 'Target days: Urgent');
    checkField('confirmation_window_days', 'Confirmation window days');
    checkField('reminder_before_target_days', 'Reminder before target (days)');
    checkField('review_reminder_hours', 'Review reminder (hours)');
    checkField('old_date_warning_days', 'Old date warning threshold (days)');
    checkField('duplicate_warning', 'Duplicate warning');

    const updated = await this.prisma.complaint_settings.update({
      where: { setting_id: current.setting_id },
      data: {
        ...(dto.target_days_low !== undefined && { target_days_low: dto.target_days_low }),
        ...(dto.target_days_medium !== undefined && { target_days_medium: dto.target_days_medium }),
        ...(dto.target_days_high !== undefined && { target_days_high: dto.target_days_high }),
        ...(dto.target_days_urgent !== undefined && { target_days_urgent: dto.target_days_urgent }),
        ...(dto.confirmation_window_days !== undefined && { confirmation_window_days: dto.confirmation_window_days }),
        ...(dto.reminder_before_target_days !== undefined && { reminder_before_target_days: dto.reminder_before_target_days }),
        ...(dto.review_reminder_hours !== undefined && { review_reminder_hours: dto.review_reminder_hours }),
        ...(dto.old_date_warning_days !== undefined && { old_date_warning_days: dto.old_date_warning_days }),
        ...(dto.duplicate_warning !== undefined && { duplicate_warning: dto.duplicate_warning }),
        updated_at: new Date(),
        updated_by: userId,
        row_version: { increment: 1 },
      },
    });

    // Write change log entries
    for (const ch of changes) {
      await this.prisma.settings_change_log.create({
        data: {
          module: 'COMPLAINT',
          field_name: ch.field,
          old_value: ch.oldVal,
          new_value: ch.newVal,
          changed_by: userId,
        },
      });
    }

    return updated;
  }

  async getChangeLog() {
    const logs = await this.prisma.settings_change_log.findMany({
      where: { module: 'COMPLAINT' },
      include: {
        employees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
      orderBy: { changed_at: 'desc' },
      take: 50,
    });

    return logs.map((l) => ({
      log_id: l.log_id,
      field_name: l.field_name,
      old_value: l.old_value,
      new_value: l.new_value,
      changed_by_name: l.employees?.name || 'Admin',
      changed_at: l.changed_at,
    }));
  }
}

