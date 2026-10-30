import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateVendorDto,
  UpdateVendorDto,
  CreateReasonDto,
  UpdateReasonDto,
  UpdateLicenseSettingsDto,
} from '../../presentation/dto/license-settings.dto';

@Injectable()
export class LicenseSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 1. Categories
  // ---------------------------------------------------------------------------
  async getCategories(includeInactive = false) {
    return this.prisma.software_license_categories.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.software_license_categories.create({
      data: {
        name: dto.name.trim(),
        display_order: dto.display_order ?? 1,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateCategory(categoryId: number, dto: UpdateCategoryDto) {
    return this.prisma.software_license_categories.update({
      where: { category_id: categoryId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.display_order !== undefined && { display_order: dto.display_order }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      },
    });
  }

  async deleteCategory(categoryId: number) {
    const licensesCount = await this.prisma.software_licenses.count({
      where: { category_id: categoryId },
    });
    if (licensesCount > 0) {
      // Soft disable if in use
      return this.prisma.software_license_categories.update({
        where: { category_id: categoryId },
        data: { is_active: false, updated_at: new Date() },
      });
    }
    return this.prisma.software_license_categories.delete({
      where: { category_id: categoryId },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Vendors
  // ---------------------------------------------------------------------------
  async getVendors(includeInactive = false) {
    return this.prisma.software_license_vendors.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createVendor(dto: CreateVendorDto) {
    const existing = await this.prisma.software_license_vendors.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.software_license_vendors.create({
      data: {
        name: dto.name.trim(),
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateVendor(vendorId: number, dto: UpdateVendorDto) {
    return this.prisma.software_license_vendors.update({
      where: { vendor_id: vendorId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      },
    });
  }

  async deleteVendor(vendorId: number) {
    const licensesCount = await this.prisma.software_licenses.count({
      where: { vendor_id: vendorId },
    });
    if (licensesCount > 0) {
      return this.prisma.software_license_vendors.update({
        where: { vendor_id: vendorId },
        data: { is_active: false, updated_at: new Date() },
      });
    }
    return this.prisma.software_license_vendors.delete({
      where: { vendor_id: vendorId },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Revoke Reasons (Consolidated in master_lookup)
  // ---------------------------------------------------------------------------
  async getRevokeReasons(includeInactive = false) {
    const list = await this.prisma.master_lookup.findMany({
      where: {
        lookup_type: 'software_revoke_reason',
        deleted_at: null,
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
    });
    return list.map((l) => ({
      reason_id: l.lookup_id,
      name: l.label,
      display_order: l.sort_order ?? 1,
      is_active: l.is_active,
    }));
  }

  async createRevokeReason(dto: CreateReasonDto) {
    const code = dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const created = await this.prisma.master_lookup.create({
      data: {
        lookup_type: 'software_revoke_reason',
        code,
        label: dto.name.trim(),
        sort_order: dto.display_order ?? 1,
        is_active: dto.is_active ?? true,
      },
    });
    return {
      reason_id: created.lookup_id,
      name: created.label,
      display_order: created.sort_order ?? 1,
      is_active: created.is_active,
    };
  }

  async updateRevokeReason(reasonId: number, dto: UpdateReasonDto) {
    const updated = await this.prisma.master_lookup.update({
      where: { lookup_id: reasonId },
      data: {
        ...(dto.name && {
          label: dto.name.trim(),
          code: dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        }),
        ...(dto.display_order !== undefined && { sort_order: dto.display_order }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
    return {
      reason_id: updated.lookup_id,
      name: updated.label,
      display_order: updated.sort_order ?? 1,
      is_active: updated.is_active,
    };
  }

  async deleteRevokeReason(reasonId: number) {
    const inUse = await this.prisma.software_license_assignments.count({
      where: { revoke_reason_id: reasonId },
    });
    if (inUse > 0) {
      await this.prisma.master_lookup.update({
        where: { lookup_id: reasonId },
        data: { is_active: false },
      });
      return { success: true, deactivated: true };
    }
    await this.prisma.master_lookup.delete({
      where: { lookup_id: reasonId },
    });
    return { success: true, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // 4. Discontinue Reasons (Consolidated in master_lookup)
  // ---------------------------------------------------------------------------
  async getDiscontinueReasons(includeInactive = false) {
    const list = await this.prisma.master_lookup.findMany({
      where: {
        lookup_type: 'software_discontinue_reason',
        deleted_at: null,
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
    });
    return list.map((l) => ({
      reason_id: l.lookup_id,
      name: l.label,
      display_order: l.sort_order ?? 1,
      is_active: l.is_active,
    }));
  }

  async createDiscontinueReason(dto: CreateReasonDto) {
    const code = dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const created = await this.prisma.master_lookup.create({
      data: {
        lookup_type: 'software_discontinue_reason',
        code,
        label: dto.name.trim(),
        sort_order: dto.display_order ?? 1,
        is_active: dto.is_active ?? true,
      },
    });
    return {
      reason_id: created.lookup_id,
      name: created.label,
      display_order: created.sort_order ?? 1,
      is_active: created.is_active,
    };
  }

  async updateDiscontinueReason(reasonId: number, dto: UpdateReasonDto) {
    const updated = await this.prisma.master_lookup.update({
      where: { lookup_id: reasonId },
      data: {
        ...(dto.name && {
          label: dto.name.trim(),
          code: dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        }),
        ...(dto.display_order !== undefined && { sort_order: dto.display_order }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
    return {
      reason_id: updated.lookup_id,
      name: updated.label,
      display_order: updated.sort_order ?? 1,
      is_active: updated.is_active,
    };
  }

  async deleteDiscontinueReason(reasonId: number) {
    const inUse = await this.prisma.software_licenses.count({
      where: { discontinue_reason_id: reasonId },
    });
    if (inUse > 0) {
      await this.prisma.master_lookup.update({
        where: { lookup_id: reasonId },
        data: { is_active: false },
      });
      return { success: true, deactivated: true };
    }
    await this.prisma.master_lookup.delete({
      where: { lookup_id: reasonId },
    });
    return { success: true, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // 5. Software License Managers
  // ---------------------------------------------------------------------------
  async getManagers() {
    return this.prisma.software_license_managers.findMany({
      include: {
        employees_software_license_managers_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            profile_picture: true,
            dep_id: true,
            departments_employees_dep_idTodepartments: { select: { dep_id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async isEmployeeManager(empId: number): Promise<boolean> {
    const manager = await this.prisma.software_license_managers.findUnique({
      where: { emp_id: empId },
    });
    return !!manager;
  }

  async addManager(empId: number, appointedBy: number) {
    const existing = await this.prisma.software_license_managers.findUnique({
      where: { emp_id: empId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.software_license_managers.create({
      data: {
        emp_id: empId,
        created_by: appointedBy,
      },
    });
  }

  async removeManager(empId: number) {
    return this.prisma.software_license_managers.delete({
      where: { emp_id: empId },
    });
  }

  // ---------------------------------------------------------------------------
  // 6. License System Settings
  // ---------------------------------------------------------------------------
  async getSettings() {
    let settings = await this.prisma.software_license_settings.findFirst();
    if (!settings) {
      settings = await this.prisma.software_license_settings.create({
        data: {
          setting_id: 1,
          reminder_window_days: 30,
          reminder_days: [30, 15, 7, 1],
          remind_accounts: true,
          weekly_renewal_summary: true,
          unused_seat_flag_days: 90,
          recovery_reminder_days: 3,
          max_trial_days: 90,
          currency: '₹',
        },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateLicenseSettingsDto, changedBy: number) {
    const current = await this.getSettings();

    // Log changes
    const changeLogs: { setting_field: string; old_value: string | null; new_value: string; changed_by: number }[] = [];

    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined && (current as any)[key] !== val) {
        changeLogs.push({
          setting_field: key,
          old_value: String((current as any)[key]),
          new_value: Array.isArray(val) ? JSON.stringify(val) : String(val),
          changed_by: changedBy,
        });
      }
    }

    if (changeLogs.length > 0) {
      const unifiedLogs = changeLogs.map((l) => ({
        module: 'LICENSE',
        field_name: l.setting_field,
        old_value: l.old_value,
        new_value: l.new_value,
        changed_by: l.changed_by,
      }));
      await this.prisma.settings_change_log.createMany({
        data: unifiedLogs,
      });
    }

    return this.prisma.software_license_settings.update({
      where: { setting_id: current.setting_id },
      data: {
        ...dto,
        updated_by: changedBy,
        updated_at: new Date(),
      },
    });
  }
}
