import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreatePerfFormDto, QueryPerfFormsDto, UpdatePerfFormDto } from '../../presentation/dto/performance.dto';
import {
  FIXED_RATING_QUESTIONS,
  PerfQuestion,
  RuleError,
  cycleStatus,
  normalizeQuestions,
  toDateStr,
  todayStr,
} from '../../domain/perf-rules';
import { perfError } from './performance-access.service';

export { FIXED_RATING_QUESTIONS };

const FORM_OPEN = 'This form is already open for review and cannot be changed.';

/** Question Master (BFD Sections 4 and 8, Screens 3–4). */
@Injectable()
export class PerformanceFormsService {
  constructor(private readonly prisma: PrismaService) {}

  fixedQuestions() {
    return FIXED_RATING_QUESTIONS;
  }

  async listForms(query: QueryPerfFormsDto = {}) {
    const where: any = {};
    if (query.cycle_id) where.cycle_id = Number(query.cycle_id);
    if (query.cycle_type) where.perf_cycles = { cycle_type: String(query.cycle_type).toUpperCase() };
    if (query.search?.trim()) where.form_name = { contains: query.search.trim(), mode: 'insensitive' };
    if (query.status === 'PUBLISHED') where.is_published = true;
    if (query.status === 'DRAFT') where.is_published = false;
    const [forms, deps] = await Promise.all([
      this.prisma.perf_forms.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { perf_cycles: true, _count: { select: { perf_reviews: true } } },
      }),
      this.departmentNames(),
    ]);
    const today = todayStr();
    return forms
      .filter((f) => {
        if (!query.department_id) return true;
        const ids = (f.department_ids || []) as number[];
        return ids.length === 0 || ids.includes(Number(query.department_id));
      })
      .map((f) => this.present(f, deps, today));
  }

  async getFormById(formId: number) {
    const f = await this.prisma.perf_forms.findUnique({
      where: { form_id: formId },
      include: { perf_cycles: true, _count: { select: { perf_reviews: true } } },
    });
    if (!f) throw perfError('Form not found.', 'form_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return this.present(f, await this.departmentNames(), todayStr());
  }

  async createForm(dto: CreatePerfFormDto, userId: number) {
    const cycle = await this.loadCycle(dto.cycle_id);
    this.assertCycleNotOpened(cycle);
    const deptIds = this.cleanDeptIds(dto.department_ids);
    await this.assertNoOverlap(cycle.cycle_id, deptIds);
    const questions = this.questions(dto.questions);
    const created = await this.prisma.perf_forms.create({
      data: {
        cycle_id: cycle.cycle_id,
        form_name: dto.form_name.trim(),
        department_ids: deptIds,
        questions: questions as any,
        is_published: false,
        created_by: userId,
      },
      include: { perf_cycles: true, _count: { select: { perf_reviews: true } } },
    });
    return this.present(created, await this.departmentNames(), todayStr());
  }

  async updateForm(formId: number, dto: UpdatePerfFormDto, userId: number) {
    const form = await this.prisma.perf_forms.findUnique({ where: { form_id: formId }, include: { perf_cycles: true } });
    if (!form) throw perfError('Form not found.', 'form_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.assertCycleNotOpened(form.perf_cycles);
    const cycle = dto.cycle_id && dto.cycle_id !== form.cycle_id ? await this.loadCycle(dto.cycle_id) : form.perf_cycles;
    this.assertCycleNotOpened(cycle);
    const deptIds = dto.department_ids !== undefined ? this.cleanDeptIds(dto.department_ids) : ((form.department_ids || []) as number[]);
    await this.assertNoOverlap(cycle.cycle_id, deptIds, formId);
    const data: any = { cycle_id: cycle.cycle_id, department_ids: deptIds, updated_at: new Date(), updated_by: userId };
    if (dto.form_name !== undefined) data.form_name = dto.form_name.trim();
    if (dto.questions !== undefined) data.questions = this.questions(dto.questions);
    if (form.is_published) await this.assertCoverage(cycle, formId, deptIds);
    const updated = await this.prisma.perf_forms.update({
      where: { form_id: formId },
      data,
      include: { perf_cycles: true, _count: { select: { perf_reviews: true } } },
    });
    return this.present(updated, await this.departmentNames(), todayStr());
  }

  /** BFD Section 4: publish only when every department has a form. */
  async publishForm(formId: number, userId: number) {
    const form = await this.prisma.perf_forms.findUnique({ where: { form_id: formId }, include: { perf_cycles: true } });
    if (!form) throw perfError('Form not found.', 'form_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.assertCycleNotOpened(form.perf_cycles);
    await this.assertCoverage(form.perf_cycles, formId, (form.department_ids || []) as number[]);
    await this.prisma.perf_forms.update({
      where: { form_id: formId },
      data: { is_published: true, updated_at: new Date(), updated_by: userId },
    });
    return this.getFormById(formId);
  }

  async unpublishForm(formId: number, userId: number) {
    const form = await this.prisma.perf_forms.findUnique({ where: { form_id: formId }, include: { perf_cycles: true } });
    if (!form) throw perfError('Form not found.', 'form_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.assertCycleNotOpened(form.perf_cycles);
    await this.prisma.perf_forms.update({
      where: { form_id: formId },
      data: { is_published: false, updated_at: new Date(), updated_by: userId },
    });
    return this.getFormById(formId);
  }

  async deleteForm(formId: number) {
    const form = await this.prisma.perf_forms.findUnique({
      where: { form_id: formId },
      include: { perf_cycles: true, _count: { select: { perf_reviews: true } } },
    });
    if (!form) throw perfError('Form not found.', 'form_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.assertCycleNotOpened(form.perf_cycles);
    if (form._count.perf_reviews > 0) throw perfError('This form already has reviews and cannot be deleted.');
    await this.prisma.perf_forms.delete({ where: { form_id: formId } });
    return { success: true };
  }

  /** Departments without any form for the cycle (shown before publishing). */
  async departmentsWithoutForm(cycleId: number, extra?: { formId?: number; deptIds?: number[] }) {
    const cycle = await this.loadCycle(cycleId);
    const forms = await this.prisma.perf_forms.findMany({ where: { cycle_id: cycle.cycle_id } });
    const sets = forms
      .filter((f) => f.form_id !== extra?.formId)
      .map((f) => (f.department_ids || []) as number[]);
    if (extra?.deptIds) sets.push(extra.deptIds);
    if (sets.some((ids) => ids.length === 0)) return [];
    const covered = new Set(sets.flat());
    const needed = await this.prisma.$queryRaw<Array<{ dep_id: number; name: string }>>`
      SELECT DISTINCT d.dep_id, d.name
      FROM employees e JOIN departments d ON d.dep_id = e.dep_id
      WHERE e.status = 'Active' AND e.deleted_at IS NULL AND d.deleted_at IS NULL
        AND (e.joining_date IS NULL OR e.joining_date <= ${toDateStr(cycle.end_date)}::date)
      ORDER BY d.name;
    `;
    return needed.filter((d) => !covered.has(Number(d.dep_id)));
  }

  // ---------------------------------------------------------------------------

  private async assertCoverage(cycle: any, formId: number, deptIds: number[]) {
    const missing = await this.departmentsWithoutForm(cycle.cycle_id, { formId, deptIds });
    if (missing.length) {
      throw perfError(
        `No form is available for these departments: ${missing.map((d) => d.name).join(', ')}. Add a form or choose All departments.`,
        'department_ids',
      );
    }
  }

  private async assertNoOverlap(cycleId: number, deptIds: number[], exceptFormId?: number) {
    const others = await this.prisma.perf_forms.findMany({
      where: { cycle_id: cycleId, ...(exceptFormId ? { NOT: { form_id: exceptFormId } } : {}) },
      select: { form_name: true, department_ids: true },
    });
    if (deptIds.length === 0) {
      const all = others.find((o) => ((o.department_ids || []) as number[]).length === 0);
      if (all) throw perfError(`An "All departments" form already exists for this cycle (${all.form_name}).`, 'department_ids');
      return;
    }
    const names = await this.departmentNames();
    for (const o of others) {
      const clash = ((o.department_ids || []) as number[]).filter((id) => deptIds.includes(id));
      if (clash.length) {
        throw perfError(
          `${clash.map((id) => names.get(id) || `Department #${id}`).join(', ')} already has a form for this cycle (${o.form_name}).`,
          'department_ids',
        );
      }
    }
  }

  private questions(input: any[] | undefined): PerfQuestion[] {
    try {
      return normalizeQuestions(input);
    } catch (e) {
      if (e instanceof RuleError) throw perfError(e.message, e.field || 'questions');
      throw e;
    }
  }

  private cleanDeptIds(ids?: number[]) {
    return Array.from(new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0)));
  }

  private async loadCycle(cycleId: number) {
    const cycle = await this.prisma.perf_cycles.findUnique({ where: { cycle_id: Number(cycleId) } });
    if (!cycle) throw perfError('Please select the Cycle.', 'cycle_id');
    return cycle;
  }

  private assertCycleNotOpened(cycle: { review_start_date: Date }) {
    if (todayStr() >= toDateStr(cycle.review_start_date)) throw perfError(FORM_OPEN);
  }

  private async departmentNames(): Promise<Map<number, string>> {
    const rows = await this.prisma.$queryRaw<Array<{ dep_id: number; name: string }>>`
      SELECT dep_id, name FROM departments WHERE deleted_at IS NULL;
    `;
    return new Map(rows.map((r) => [Number(r.dep_id), r.name]));
  }

  private present(f: any, deps: Map<number, string>, today: string) {
    const ids = (f.department_ids || []) as number[];
    const questions = (Array.isArray(f.questions) ? f.questions : []) as PerfQuestion[];
    const extra = questions.filter((q) => !q.is_fixed).length;
    const cycleState = f.perf_cycles ? cycleStatus(f.perf_cycles.review_start_date, f.perf_cycles.review_end_date, today) : 'UPCOMING';
    return {
      form_id: f.form_id,
      form_name: f.form_name,
      name: f.form_name,
      cycle_id: f.cycle_id,
      cycle: f.perf_cycles
        ? {
            cycle_id: f.perf_cycles.cycle_id,
            cycle_name: f.perf_cycles.cycle_name,
            cycle_type: f.perf_cycles.cycle_type,
            status: cycleState,
            review_start_date: toDateStr(f.perf_cycles.review_start_date),
            review_end_date: toDateStr(f.perf_cycles.review_end_date),
          }
        : null,
      department_ids: ids,
      departments: ids.map((id) => ({ dep_id: id, name: deps.get(id) || `Department #${id}` })),
      for_label: ids.length === 0 ? 'All departments' : ids.map((id) => deps.get(id) || `#${id}`).join(', '),
      questions,
      questions_label: `5 fixed + ${extra} extra`,
      is_published: f.is_published,
      status: f.is_published ? 'PUBLISHED' : 'DRAFT',
      can_edit: cycleState === 'UPCOMING',
      reviews_count: f._count?.perf_reviews ?? 0,
      created_at: f.created_at,
    };
  }
}
