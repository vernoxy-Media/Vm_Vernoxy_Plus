import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseGeneralSettingsDto,
  AssignAuthorisedApproverDto,
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
} from '../../presentation/dto/expense-settings.dto';

@Injectable()
export class ExpenseSettingsService {
  constructor(private readonly prisma: PrismaService) { }

  // ===========================================================================
  // 1. EXPENSE CATEGORIES (MASTER DATA CRUD)
  // ===========================================================================

  async getCategories() {
    return this.prisma.expense_categories.findMany({
      where: { deleted_at: null },
      orderBy: [{ display_order: 'asc' }, { category_id: 'asc' }],
    });
  }

  async getCategoryById(id: number) {
    const category = await this.prisma.expense_categories.findFirst({
      where: { category_id: id, deleted_at: null },
    });
    if (!category) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }
    return category;
  }

  async createCategory(dto: CreateExpenseCategoryDto, adminId: number) {
    const trimmedName = dto.name.trim();

    // Check duplicate name
    const existing = await this.prisma.expense_categories.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Expense category "${trimmedName}" already exists`);
    }

    const created = await this.prisma.expense_categories.create({
      data: {
        name: trimmedName,
        code: dto.code?.trim() || null,
        allowed_type: dto.allowed_type,
        limit_per_claim: dto.limit_per_claim !== undefined && dto.limit_per_claim !== null ? dto.limit_per_claim : null,
        receipt_rule: dto.receipt_rule,
        receipt_threshold_amount: dto.receipt_threshold_amount ?? 500.0,
        is_active: dto.is_active ?? true,
        display_order: dto.display_order ?? 0,
        created_by: adminId,
      },
    });

    await this.logChange('CATEGORY', created.category_id, 'CREATED', null, JSON.stringify(created), adminId);

    return created;
  }

  async updateCategory(id: number, dto: UpdateExpenseCategoryDto, adminId: number) {
    const existing = await this.getCategoryById(id);

    if (dto.name) {
      const trimmedName = dto.name.trim();
      const duplicate = await this.prisma.expense_categories.findFirst({
        where: {
          category_id: { not: id },
          name: { equals: trimmedName, mode: 'insensitive' },
          deleted_at: null,
        },
      });
      if (duplicate) {
        throw new ConflictException(`Expense category "${trimmedName}" already exists`);
      }
    }

    // Prepare update data and diff changes
    const updateData: any = {
      updated_by: adminId,
      updated_at: new Date(),
      row_version: { increment: 1 },
    };

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.code !== undefined) updateData.code = dto.code ? dto.code.trim() : null;
    if (dto.allowed_type !== undefined) updateData.allowed_type = dto.allowed_type;
    if (dto.limit_per_claim !== undefined) {
      updateData.limit_per_claim = dto.limit_per_claim !== null ? dto.limit_per_claim : null;
    }
    if (dto.receipt_rule !== undefined) updateData.receipt_rule = dto.receipt_rule;
    if (dto.receipt_threshold_amount !== undefined) {
      updateData.receipt_threshold_amount = dto.receipt_threshold_amount;
    }
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.display_order !== undefined) updateData.display_order = dto.display_order;

    // Log individual field differences
    const fieldsToTrack: (keyof UpdateExpenseCategoryDto)[] = [
      'name',
      'code',
      'allowed_type',
      'limit_per_claim',
      'receipt_rule',
      'receipt_threshold_amount',
      'is_active',
      'display_order',
    ];

    for (const field of fieldsToTrack) {
      if (dto[field] !== undefined) {
        const oldVal = (existing as any)[field];
        const newVal = (dto as any)[field];
        if (String(oldVal) !== String(newVal)) {
          await this.logChange('CATEGORY', id, field, String(oldVal), String(newVal), adminId);
        }
      }
    }

    return this.prisma.expense_categories.update({
      where: { category_id: id },
      data: updateData,
    });
  }

  async toggleCategoryStatus(id: number, adminId: number) {
    const existing = await this.getCategoryById(id);
    const newStatus = !existing.is_active;

    await this.logChange('CATEGORY', id, 'is_active', String(existing.is_active), String(newStatus), adminId);

    return this.prisma.expense_categories.update({
      where: { category_id: id },
      data: {
        is_active: newStatus,
        updated_by: adminId,
        updated_at: new Date(),
        row_version: { increment: 1 },
      },
    });
  }

  async deleteCategory(id: number, adminId: number) {
    const existing = await this.getCategoryById(id);

    // Guard: check if claims exist referencing this category
    const claimsCount = await this.prisma.expense_claims.count({
      where: { category_id: id, deleted_at: null },
    });

    if (claimsCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${existing.name}" because it is linked to ${claimsCount} expense claim(s). Please deactivate it instead.`,
      );
    }

    // Soft delete
    await this.logChange('CATEGORY', id, 'DELETED', existing.name, 'SOFT_DELETED', adminId);

    return this.prisma.expense_categories.update({
      where: { category_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by: adminId,
        is_active: false,
      },
    });
  }

  // ===========================================================================
  // 2. GENERAL SETTINGS
  // ===========================================================================

  async getGeneralSettings() {
    let settings = await this.prisma.expense_general_settings.findFirst();
    if (!settings) {
      settings = await this.prisma.expense_general_settings.create({
        data: {
          claim_window_days: 60,
          after_claim_window_action: 'FLAG_AS_LATE',
          duplicate_check_enabled: true,
          default_reimbursement_method: 'DIRECT',
          approver_reminder_days: 3,
          currency: 'INR',
        },
      });
    }
    return settings;
  }

  async updateGeneralSettings(dto: UpdateExpenseGeneralSettingsDto, adminId: number) {
    const current = await this.getGeneralSettings();

    const fieldsToTrack: (keyof UpdateExpenseGeneralSettingsDto)[] = [
      'claim_window_days',
      'after_claim_window_action',
      'duplicate_check_enabled',
      'default_reimbursement_method',
      'approver_reminder_days',
      'currency',
    ];

    for (const field of fieldsToTrack) {
      if (dto[field] !== undefined) {
        const oldVal = (current as any)[field];
        const newVal = (dto as any)[field];
        if (String(oldVal) !== String(newVal)) {
          await this.logChange('GENERAL_SETTINGS', current.setting_id, field, String(oldVal), String(newVal), adminId);
        }
      }
    }

    return this.prisma.expense_general_settings.update({
      where: { setting_id: current.setting_id },
      data: {
        ...dto,
        updated_at: new Date(),
        updated_by: adminId,
      },
    });
  }

  // ===========================================================================
  // 3. AUTHORISED APPROVERS MAPPING
  // ===========================================================================

  async getAuthorisedApprovers() {
    // Get all departments and their configured approver (if any)
    const departments = await this.prisma.departments.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
      select: {
        dep_id: true,
        name: true,
      },
    });

    const approvers: any[] = await this.prisma.expense_authorised_approvers.findMany({
      where: { deleted_at: null },
      include: {
        employees_expense_authorised_approvers_approver_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const approverMap = new Map<number, any>();
    for (const a of approvers) {
      approverMap.set(a.department_id, {
        approver_mapping_id: a.approver_mapping_id,
        approver_emp_id: a.approver_emp_id,
        approver: a.employees_expense_authorised_approvers_approver_emp_idToemployees,
        updated_at: a.updated_at || a.created_at,
      });
    }

    return departments.map((dept) => ({
      department_id: dept.dep_id,
      department_name: dept.name,
      mapping: approverMap.get(dept.dep_id) || null,
    }));
  }

  async assignAuthorisedApprover(dto: AssignAuthorisedApproverDto, adminId: number) {
    const { department_id, approver_emp_id } = dto;

    // Validate department exists
    const dept = await this.prisma.departments.findFirst({
      where: { dep_id: department_id, deleted_at: null },
    });
    if (!dept) {
      throw new NotFoundException(`Department with ID ${department_id} not found`);
    }

    // Validate employee exists
    const emp = await this.prisma.employees.findFirst({
      where: { emp_id: approver_emp_id, deleted_at: null },
    });
    if (!emp) {
      throw new NotFoundException(`Employee with ID ${approver_emp_id} not found`);
    }

    // Check if mapping exists (including soft-deleted)
    const existing = await this.prisma.expense_authorised_approvers.findFirst({
      where: { department_id },
    });

    let result;
    if (existing) {
      const oldApproverId = existing.deleted_at ? null : existing.approver_emp_id;

      result = await this.prisma.expense_authorised_approvers.update({
        where: { approver_mapping_id: existing.approver_mapping_id },
        data: {
          approver_emp_id,
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date(),
          updated_by: adminId,
        },
      });

      await this.logChange(
        'AUTHORISED_APPROVER',
        department_id,
        'approver_emp_id',
        oldApproverId ? `Emp #${oldApproverId}` : 'NONE',
        `Emp #${approver_emp_id} (${emp.name})`,
        adminId,
      );
    } else {
      result = await this.prisma.expense_authorised_approvers.create({
        data: {


          department_id,
          approver_emp_id,
          created_by: adminId,
        },
      });

      await this.logChange(
        'AUTHORISED_APPROVER',
        department_id,
        'approver_emp_id',
        'NONE',
        `Emp #${approver_emp_id} (${emp.name})`,
        adminId,
      );
    }

    return result;
  }

  async removeAuthorisedApprover(departmentId: number, adminId: number) {
    const existing: any = await this.prisma.expense_authorised_approvers.findFirst({
      where: { department_id: departmentId, deleted_at: null },
      include: {
        departments: true,
        employees_expense_authorised_approvers_approver_emp_idToemployees: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`No active approver assignment found for department ${departmentId}`);
    }

    await this.logChange(
      'AUTHORISED_APPROVER',
      departmentId,
      'approver_emp_id',
      `Emp #${existing.approver_emp_id} (${existing.employees_expense_authorised_approvers_approver_emp_idToemployees?.name || 'Unknown'})`,
      'REMOVED (Routes to Admin)',
      adminId,
    );

    return this.prisma.expense_authorised_approvers.update({
      where: { approver_mapping_id: existing.approver_mapping_id },
      data: {
        deleted_at: new Date(),
        deleted_by: adminId,
      },
    });
  }

  // ===========================================================================
  // 4. SETTINGS CHANGE LOG / AUDIT TRAIL
  // ===========================================================================

  async getChangeLogs() {
    return this.prisma.$queryRaw`
      SELECT 
        l.log_id,
        l.entity_type,
        l.entity_id,
        l.field_name,
        l.old_value,
        l.new_value,
        l.changed_at,
        l.changed_by,
        e.name as changed_by_name
      FROM settings_change_log l
      LEFT JOIN employees e ON l.changed_by = e.emp_id
      WHERE l.module = 'EXPENSE'
      ORDER BY l.changed_at DESC
      LIMIT 200;
    `;
  }

  private async logChange(
    entityType: 'CATEGORY' | 'GENERAL_SETTINGS' | 'AUTHORISED_APPROVER' | 'EXPENSE_TYPE',
    entityId: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    adminId: number,
  ) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO settings_change_log (
          module, entity_type, entity_id, field_name, old_value, new_value, changed_by
        ) VALUES (
          'EXPENSE', ${entityType}, ${entityId}, ${fieldName}, ${oldValue}, ${newValue}, ${adminId}
        );
      `;
    } catch (err) {
      console.error('Failed to log expense settings change:', err);
    }
  }

  // ===========================================================================
  // 6. Expense Types Master Data (CRUD)
  // ===========================================================================

  async getExpenseTypes() {
    return this.prisma.expense_types.findMany({
      where: { deleted_at: null },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });
  }

  async createExpenseType(dto: CreateExpenseTypeDto, adminId: number) {
    const existing = await this.prisma.expense_types.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          { code: { equals: dto.code, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new BadRequestException('Expense Type name or code already exists.');
    }

    const created = await this.prisma.expense_types.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description || null,
        is_active: dto.is_active ?? true,
        display_order: dto.display_order ?? 1,
        created_by: adminId,
      },
    });

    await this.logChange('EXPENSE_TYPE', created.type_id, 'created', null, JSON.stringify(created), adminId);
    return created;
  }

  async updateExpenseType(id: number, dto: UpdateExpenseTypeDto, adminId: number) {
    const current = await this.prisma.expense_types.findFirst({
      where: { type_id: id, deleted_at: null },
    });
    if (!current) throw new NotFoundException('Expense Type not found.');

    if (dto.name || dto.code) {
      const conflict = await this.prisma.expense_types.findFirst({
        where: {
          type_id: { not: id },
          deleted_at: null,
          OR: [
            dto.name ? { name: { equals: dto.name, mode: 'insensitive' } } : {},
            dto.code ? { code: { equals: dto.code, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (conflict) {
        throw new BadRequestException('Another Expense Type with this name or code already exists.');
      }
    }

    const updated = await this.prisma.expense_types.update({
      where: { type_id: id },
      data: {
        name: dto.name ?? current.name,
        code: dto.code ? dto.code.toUpperCase() : current.code,
        description: dto.description !== undefined ? dto.description : current.description,
        is_active: dto.is_active !== undefined ? dto.is_active : current.is_active,
        display_order: dto.display_order !== undefined ? dto.display_order : current.display_order,
        updated_at: new Date(),
        updated_by: adminId,
      },
    });

    await this.logChange('EXPENSE_TYPE', id, 'updated', JSON.stringify(current), JSON.stringify(updated), adminId);
    return updated;
  }

  async toggleExpenseTypeStatus(id: number, adminId: number) {
    const current = await this.prisma.expense_types.findFirst({
      where: { type_id: id, deleted_at: null },
    });
    if (!current) throw new NotFoundException('Expense Type not found.');

    const updated = await this.prisma.expense_types.update({
      where: { type_id: id },
      data: {
        is_active: !current.is_active,
        updated_at: new Date(),
        updated_by: adminId,
      },
    });

    await this.logChange(
      'EXPENSE_TYPE',
      id,
      'is_active',
      String(current.is_active),
      String(updated.is_active),
      adminId,
    );
    return updated;
  }

  async deleteExpenseType(id: number, adminId: number) {
    const current = await this.prisma.expense_types.findFirst({
      where: { type_id: id, deleted_at: null },
    });
    if (!current) throw new NotFoundException('Expense Type not found.');

    await this.prisma.expense_types.update({
      where: { type_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by: adminId,
        is_active: false,
      },
    });

    await this.logChange('EXPENSE_TYPE', id, 'deleted', JSON.stringify(current), null, adminId);
    return { success: true, message: 'Expense type deleted successfully.' };
  }
}