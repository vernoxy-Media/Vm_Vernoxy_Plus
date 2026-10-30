import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateKbCategoryDto, UpdateKbCategoryDto } from '../../presentation/dto/kb-settings.dto';

@Injectable()
export class KbSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(space?: 'INTERNAL' | 'CLIENT', includeInactive = false) {
    const where: any = {};
    if (space) {
      where.space = space;
    }
    if (!includeInactive) {
      where.is_active = true;
    }

    const categories = await this.prisma.kb_categories.findMany({
      where,
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      include: {
        employees_kb_categories_default_owner_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_kb_categories_default_approver_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        _count: {
          select: {
            kb_articles: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    return categories.map((c) => ({
      ...c,
      articles_count: c._count.kb_articles,
      default_owner: c.employees_kb_categories_default_owner_idToemployees,
      default_approver: c.employees_kb_categories_default_approver_idToemployees,
    }));
  }

  async getCategoryById(categoryId: number) {
    const category = await this.prisma.kb_categories.findUnique({
      where: { category_id: categoryId },
      include: {
        employees_kb_categories_default_owner_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_kb_categories_default_approver_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        _count: {
          select: {
            kb_articles: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Knowledge Base category #${categoryId} not found`);
    }

    return {
      ...category,
      articles_count: category._count.kb_articles,
      default_owner: category.employees_kb_categories_default_owner_idToemployees,
      default_approver: category.employees_kb_categories_default_approver_idToemployees,
    };
  }

  async createCategory(dto: CreateKbCategoryDto, creatorId?: number) {
    const trimmedName = dto.name.trim();

    // Check unique within space
    const existing = await this.prisma.kb_categories.findFirst({
      where: {
        space: dto.space,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${trimmedName}" already exists in ${dto.space} knowledge space`);
    }

    const created = await this.prisma.kb_categories.create({
      data: {
        space: dto.space,
        name: trimmedName,
        description: dto.description?.trim() || null,
        icon: dto.icon || null,
        default_owner_id: dto.default_owner_id ?? null,
        default_approver_id: dto.default_approver_id ?? null,
        default_review_cycle_months: dto.default_review_cycle_months ?? null,
        default_ack_required: dto.space === 'INTERNAL' ? (dto.default_ack_required ?? false) : false,
        default_audience_scope: dto.default_audience_scope || 'ALL',
        default_audience_departments: dto.default_audience_departments || [],
        default_audience_roles: dto.default_audience_roles || [],
        default_audience_employees: dto.default_audience_employees || [],
        default_audience_companies: dto.default_audience_companies || [],
        default_audience_projects: dto.default_audience_projects || [],
        display_order: dto.display_order ?? 0,
        is_active: dto.is_active ?? true,
        created_by: creatorId ?? null,
      },
    });

    // Audit log in unified settings_change_log
    await this.prisma.settings_change_log.create({
      data: {
        module: 'KNOWLEDGE_BASE',
        entity_type: 'CATEGORY',
        entity_id: created.category_id,
        field_name: 'CATEGORY_CREATED',
        old_value: null,
        new_value: JSON.stringify({ name: created.name, space: created.space }),
        changed_by: creatorId ?? 1,
      },
    });

    return this.getCategoryById(created.category_id);
  }

  async updateCategory(categoryId: number, dto: UpdateKbCategoryDto, updaterId?: number) {
    const current = await this.prisma.kb_categories.findUnique({
      where: { category_id: categoryId },
    });

    if (!current) {
      throw new NotFoundException(`Category #${categoryId} not found`);
    }

    const trimmedName = dto.name ? dto.name.trim() : current.name;

    if (dto.name && dto.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const duplicate = await this.prisma.kb_categories.findFirst({
        where: {
          space: current.space,
          name: { equals: trimmedName, mode: 'insensitive' },
          category_id: { not: categoryId },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Category "${trimmedName}" already exists in ${current.space} space`);
      }
    }

    const updated = await this.prisma.kb_categories.update({
      where: { category_id: categoryId },
      data: {
        name: trimmedName,
        description: dto.description !== undefined ? dto.description?.trim() || null : current.description,
        icon: dto.icon !== undefined ? dto.icon : current.icon,
        default_owner_id: dto.default_owner_id !== undefined ? dto.default_owner_id : current.default_owner_id,
        default_approver_id: dto.default_approver_id !== undefined ? dto.default_approver_id : current.default_approver_id,
        default_review_cycle_months:
          dto.default_review_cycle_months !== undefined ? dto.default_review_cycle_months : current.default_review_cycle_months,
        default_ack_required:
          current.space === 'INTERNAL' && dto.default_ack_required !== undefined
            ? dto.default_ack_required
            : current.default_ack_required,
        default_audience_scope: dto.default_audience_scope !== undefined ? dto.default_audience_scope : current.default_audience_scope,
        default_audience_departments:
          dto.default_audience_departments !== undefined ? dto.default_audience_departments : current.default_audience_departments,
        default_audience_roles: dto.default_audience_roles !== undefined ? dto.default_audience_roles : current.default_audience_roles,
        default_audience_employees:
          dto.default_audience_employees !== undefined ? dto.default_audience_employees : current.default_audience_employees,
        default_audience_companies:
          dto.default_audience_companies !== undefined ? dto.default_audience_companies : current.default_audience_companies,
        default_audience_projects:
          dto.default_audience_projects !== undefined ? dto.default_audience_projects : current.default_audience_projects,
        display_order: dto.display_order !== undefined ? dto.display_order : current.display_order,
        is_active: dto.is_active !== undefined ? dto.is_active : current.is_active,
        updated_at: new Date(),
        updated_by: updaterId ?? null,
      },
    });

    // Record audit in unified settings_change_log
    await this.prisma.settings_change_log.create({
      data: {
        module: 'KNOWLEDGE_BASE',
        entity_type: 'CATEGORY',
        entity_id: categoryId,
        field_name: 'CATEGORY_UPDATED',
        old_value: JSON.stringify({ name: current.name, is_active: current.is_active }),
        new_value: JSON.stringify({ name: updated.name, is_active: updated.is_active }),
        changed_by: updaterId ?? 1,
      },
    });

    return this.getCategoryById(categoryId);
  }

  async deleteCategory(categoryId: number, deleterId?: number) {
    const category = await this.prisma.kb_categories.findUnique({
      where: { category_id: categoryId },
      include: {
        _count: {
          select: {
            kb_articles: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category #${categoryId} not found`);
    }

    // BFD Section 4: Only an empty category can be deleted. Otherwise it can only be made inactive.
    if (category._count.kb_articles > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it contains ${category._count.kb_articles} article(s). You can deactivate it instead.`
      );
    }

    await this.prisma.kb_categories.delete({
      where: { category_id: categoryId },
    });

    await this.prisma.settings_change_log.create({
      data: {
        module: 'KNOWLEDGE_BASE',
        entity_type: 'CATEGORY',
        entity_id: categoryId,
        field_name: 'CATEGORY_DELETED',
        old_value: JSON.stringify({ name: category.name, space: category.space }),
        new_value: 'DELETED',
        changed_by: deleterId ?? 1,
      },
    });

    return { success: true, message: `Category "${category.name}" deleted successfully` };
  }
}
