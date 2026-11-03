import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreatePerfFormDto,
  UpdatePerfFormDto,
} from '../../presentation/dto/performance.dto';

export const FIXED_RATING_QUESTIONS = [
  {
    id: 'fixed_comm',
    title: 'Communication',
    description: 'How clearly and politely the employee shares ideas and information.',
    type: 'STAR_RATING',
    is_fixed: true,
    is_required: true,
    display_order: 1,
  },
  {
    id: 'fixed_behav',
    title: 'Behaviour',
    description: 'How respectful and professional the employee is with others.',
    type: 'STAR_RATING',
    is_fixed: true,
    is_required: true,
    display_order: 2,
  },
  {
    id: 'fixed_regul',
    title: 'Regularity',
    description: 'How regular the employee is in attendance and in keeping to time.',
    type: 'STAR_RATING',
    is_fixed: true,
    is_required: true,
    display_order: 3,
  },
  {
    id: 'fixed_teamw',
    title: 'Teamwork',
    description: 'How well the employee works with others.',
    type: 'STAR_RATING',
    is_fixed: true,
    is_required: true,
    display_order: 4,
  },
  {
    id: 'fixed_qual',
    title: 'Quality of Work',
    description: 'How accurate and complete the employee’s work is.',
    type: 'STAR_RATING',
    is_fixed: true,
    is_required: true,
    display_order: 5,
  },
];

@Injectable()
export class PerformanceFormsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize and order questions passed in DTO
   */
  private normalizeQuestions(questions?: any[]): any[] {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return FIXED_RATING_QUESTIONS;
    }

    return questions.map((q, idx) => ({
      id: q.id || `q_${Date.now()}_${idx}`,
      title: q.title?.trim() || 'Untitled Question',
      description: q.description?.trim() || '',
      type: q.type || 'STAR_RATING',
      options: Array.isArray(q.options) ? q.options : [],
      is_fixed: Boolean(q.is_fixed),
      is_required: Boolean(q.is_required ?? (q.required || q.type === 'STAR_RATING')),
      display_order: idx + 1,
    }));
  }

  async listForms(cycleId?: number) {
    const where: any = {};
    if (cycleId) {
      where.cycle_id = Number(cycleId);
    }

    const forms = await this.prisma.perf_forms.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        perf_cycles: {
          select: {
            cycle_id: true,
            cycle_name: true,
            cycle_type: true,
            status: true,
            review_start_date: true,
            review_end_date: true,
          },
        },
        _count: {
          select: { perf_reviews: true },
        },
      },
    });

    return forms.map((f) => ({
      ...f,
      name: f.form_name,
      perf_cycles: f.perf_cycles
        ? {
            ...f.perf_cycles,
            name: (f.perf_cycles as any).cycle_name,
          }
        : null,
      reviews_count: f._count.perf_reviews,
    }));
  }

  async getFormById(formId: number) {
    const form = await this.prisma.perf_forms.findUnique({
      where: { form_id: formId },
      include: {
        perf_cycles: true,
        _count: { select: { perf_reviews: true } },
      },
    });

    if (!form) {
      throw new NotFoundException(`Performance form #${formId} not found`);
    }

    return {
      ...form,
      reviews_count: form._count.perf_reviews,
    };
  }

  async createForm(dto: CreatePerfFormDto, userId?: number) {
    const cycle = await this.prisma.perf_cycles.findUnique({
      where: { cycle_id: dto.cycle_id },
    });

    if (!cycle) {
      throw new NotFoundException(`Performance cycle #${dto.cycle_id} not found`);
    }

    const questions = this.normalizeQuestions(dto.questions);

    const created = await this.prisma.perf_forms.create({
      data: {
        cycle_id: dto.cycle_id,
        form_name: dto.form_name.trim(),
        description: dto.description?.trim() || null,
        department_ids: dto.department_ids || [],
        questions,
        is_published: dto.is_published ?? true,
        created_by: userId || 1,
      },
      include: {
        perf_cycles: true,
      },
    });

    return created;
  }

  async updateForm(formId: number, dto: UpdatePerfFormDto, userId?: number) {
    const form = await this.prisma.perf_forms.findUnique({
      where: { form_id: formId },
      include: { perf_cycles: true },
    });

    if (!form) {
      throw new NotFoundException(`Performance form #${formId} not found`);
    }

    // Rule: Form cannot be changed after review window opens (BFD Section 4)
    if (form.perf_cycles.status === 'REVIEW_OPEN' || form.perf_cycles.status === 'CLOSED') {
      throw new BadRequestException('This form is already open for review or closed and cannot be changed.');
    }

    const updateData: any = {
      updated_at: new Date(),
      updated_by: userId ?? null,
    };

    if (dto.form_name?.trim()) updateData.form_name = dto.form_name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.department_ids !== undefined) updateData.department_ids = dto.department_ids;
    if (dto.is_published !== undefined) updateData.is_published = dto.is_published;
    if (dto.questions) {
      updateData.questions = this.normalizeQuestions(dto.questions);
    }

    return this.prisma.perf_forms.update({
      where: { form_id: formId },
      data: updateData,
      include: { perf_cycles: true },
    });
  }

  async deleteForm(formId: number) {
    const form = await this.prisma.perf_forms.findUnique({
      where: { form_id: formId },
      include: { _count: { select: { perf_reviews: true } } },
    });

    if (!form) {
      throw new NotFoundException(`Performance form #${formId} not found`);
    }

    if (form._count.perf_reviews > 0) {
      throw new BadRequestException('Cannot delete form with existing employee reviews.');
    }

    await this.prisma.perf_forms.delete({
      where: { form_id: formId },
    });

    return { success: true, message: `Form #${formId} deleted successfully` };
  }
}

