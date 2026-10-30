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
  // 3. Revoke Reasons
  // ---------------------------------------------------------------------------
  async getRevokeReasons(includeInactive = false) {
    return this.prisma.software_license_revoke_reasons.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });
  }

  async createRevokeReason(dto: CreateReasonDto) {
    return this.prisma.software_license_revoke_reasons.create({
      data: {
        name: dto.name.trim(),
        display_order: dto.display_order ?? 1,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateRevokeReason(reasonId: number, dto: UpdateReasonDto) {
    return this.prisma.software_license_revoke_reasons.update({
      where: { reason_id: reasonId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.display_order !== undefined && { display_order: dto.display_order }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
  }

  async deleteRevokeReason(reasonId: number) {
    const inUse = await this.prisma.software_license_assignments.count({
      where: { revoke_reason_id: reasonId },
    });
    if (inUse > 0) {
      return this.prisma.software_license_revoke_reasons.update({
        where: { reason_id: reasonId },
        data: { is_active: false },
      });
    }
    return this.prisma.software_license_revoke_reasons.delete({
      where: { reason_id: reasonId },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Discontinue Reasons
  // ---------------------------------------------------------------------------
  async getDiscontinueReasons(includeInactive = false) {
    return this.prisma.software_license_discontinue_reasons.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });
  }

  async createDiscontinueReason(dto: CreateReasonDto) {
    return this.prisma.software_license_discontinue_reasons.create({
      data: {
        name: dto.name.trim(),
        display_order: dto.display_order ?? 1,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateDiscontinueReason(reasonId: number, dto: UpdateReasonDto) {
    return this.prisma.software_license_discontinue_reasons.update({
      where: { reason_id: reasonId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.display_order !== undefined && { display_order: dto.display_order }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
  }

  async deleteDiscontinueReason(reasonId: number) {
    const inUse = await this.prisma.software_licenses.count({
      where: { discontinue_reason_id: reasonId },
    });
    if (inUse > 0) {
      return this.prisma.software_license_discontinue_reasons.update({
        where: { reason_id: reasonId },
        data: { is_active: false },
      });
    }
    return this.prisma.software_license_discontinue_reasons.delete({
      where: { reason_id: reasonId },
    });
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
      await this.prisma.software_license_settings_change_log.createMany({
        data: changeLogs,
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
