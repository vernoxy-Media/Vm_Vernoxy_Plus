import { HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import {
  ReopenReviewDto,
  ReviewPart,
  SubmitBulkProjectRatingsDto,
  SubmitReviewRatingsDto,
  SummaryQueryDto,
  TeamReviewsQueryDto,
} from '../../presentation/dto/performance.dto';
import {
  PerfQuestion,
  RuleError,
  averageOf,
  cycleStatus,
  daysLeft,
  finalRating,
  fmtDate,
  fmtDayMonth,
  periodLabel,
  round1,
  toDateStr,
  todayStr,
  validateSubmission,
} from '../../domain/perf-rules';
import { PerformanceAccessService, perfError, requireEmpId } from './performance-access.service';

const PART_COLS = {
  SELF: { status: 'self_status', ratings: 'self_ratings', answers: 'self_answers', comment: 'self_comment', avg: 'self_avg_rating', at: 'self_submitted_at' },
  MANAGER: { status: 'manager_status', ratings: 'manager_ratings', answers: 'manager_answers', comment: 'manager_comment', avg: 'manager_avg_rating', at: 'manager_submitted_at' },
  ADMIN: { status: 'admin_status', ratings: 'admin_ratings', answers: 'admin_answers', comment: 'admin_comment', avg: 'admin_avg_rating', at: 'admin_submitted_at' },
} as const;

const PART_NAMES: Record<ReviewPart, string> = { SELF: 'Employee', MANAGER: 'Reporting Manager', ADMIN: 'Admin' };
const ALREADY_SUBMITTED = 'This review is already submitted and cannot be changed.';
const NO_MANAGER = 'This employee has no Reporting Manager. Please set one in Employee Details.';

type Notice = { recipients: number[]; kind: string; title: string; body: string; entityType: string; entityId: number; createdBy?: number | null };

/** Reviews, Rating Summary and Project Rating (BFD Sections 5, 6, 9–12). */
@Injectable()
export class PerformanceReviewsService {
  private readonly logger = new Logger(PerformanceReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PerformanceAccessService,
    @Optional() private readonly createNotificationUseCase?: CreateNotificationUseCase,
  ) {}

  // ===========================================================================
  // Review records
  // ===========================================================================

  /** BFD 13: all active employees who joined on or before the last day of the cycle. */
  async eligibleEmployees(cycle: any, filter: { managerId?: number; departmentId?: number } = {}) {
    const end = toDateStr(cycle.end_date);
    return this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.dep_id, d.name AS department_name, e.reporting_manager, m.name AS manager_name
      FROM employees e
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN employees m ON m.emp_id = e.reporting_manager
      WHERE e.status = 'Active' AND e.deleted_at IS NULL
        AND (e.joining_date IS NULL OR e.joining_date <= ${end}::date)
        AND (${filter.managerId ?? null}::int IS NULL OR (e.reporting_manager = ${filter.managerId ?? null}::int AND e.emp_id <> ${filter.managerId ?? null}::int))
        AND (${filter.departmentId ?? null}::int IS NULL OR e.dep_id = ${filter.departmentId ?? null}::int)
      ORDER BY e.name;
    `;
  }

  /** Form for an employee: the selected-departments form, else the "All departments" form (BFD 4). */
  private async formFor(cycleId: number, depId: number | null) {
    const forms = await this.prisma.perf_forms.findMany({ where: { cycle_id: cycleId, is_published: true } });
    return (
      forms.find((f) => depId && ((f.department_ids || []) as number[]).includes(depId)) ||
      forms.find((f) => ((f.department_ids || []) as number[]).length === 0) ||
      null
    );
  }

  /** Finds or creates the review record. Keeps the Reporting Manager in step until the manager submits. */
  async ensureReview(cycle: any, emp: { emp_id: number; dep_id: number | null; reporting_manager: number | null; department_name?: string | null }) {
    const existing = await this.prisma.perf_reviews.findUnique({
      where: { cycle_id_emp_id: { cycle_id: cycle.cycle_id, emp_id: emp.emp_id } },
    });
    if (existing) {
      if (existing.manager_status !== 'SUBMITTED' && existing.manager_emp_id !== (emp.reporting_manager ?? null)) {
        return this.prisma.perf_reviews.update({
          where: { review_id: existing.review_id },
          data: { manager_emp_id: emp.reporting_manager ?? null, updated_at: new Date() },
        });
      }
      return existing;
    }
    const form = await this.formFor(cycle.cycle_id, emp.dep_id);
    if (!form) {
      throw perfError(
        `No form is available for these departments: ${emp.department_name || 'No department'}. Add a form or choose All departments.`,
        'form',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'NO_FORM',
      );
    }
    try {
      return await this.prisma.perf_reviews.create({
        data: {
          cycle_id: cycle.cycle_id,
          form_id: form.form_id,
          emp_id: emp.emp_id,
          manager_emp_id: emp.reporting_manager ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return this.prisma.perf_reviews.findUniqueOrThrow({
          where: { cycle_id_emp_id: { cycle_id: cycle.cycle_id, emp_id: emp.emp_id } },
        });
      }
      throw e;
    }
  }

  /** Creates review records for everyone who must review (used when the window opens). */
  async ensureReviewsForCycle(cycle: any, employees?: any[]) {
    const list = employees ?? (await this.eligibleEmployees(cycle));
    const noForm: string[] = [];
    for (const emp of list) {
      try {
        await this.ensureReview(cycle, emp);
      } catch (e: any) {
        noForm.push(emp.department_name || 'No department');
      }
    }
    return Array.from(new Set(noForm));
  }

  // ===========================================================================
  // Screen 5: Self Review
  // ===========================================================================

  async getMyReviewDetail(user: any, cycleId?: number) {
    const empId = requireEmpId(user);
    const today = todayStr();
    const [isAdmin, roles] = await Promise.all([this.access.isAdmin(empId), this.roleFlags(empId)]);
    const cycle = await this.pickCycle(cycleId, today);
    const base = { is_admin: isAdmin, is_manager: roles.isManager, is_project_manager: roles.isProjectManager };
    if (!cycle) return { ...base, cycle: null, form: null, review: null, message: 'No review cycle has been created yet.' };

    const cyclePayload = this.cyclePayload(cycle, today);
    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.dep_id, e.reporting_manager, e.status, e.joining_date,
             d.name AS department_name, m.name AS manager_name
      FROM employees e
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN employees m ON m.emp_id = e.reporting_manager
      WHERE e.emp_id = ${empId};
    `;
    const details = {
      employee_name: emp?.name,
      emp_code: this.empCode(empId),
      department_name: emp?.department_name || '—',
      manager_name: emp?.manager_name || null,
      cycle_type: cycle.cycle_type,
    };
    const eligible =
      emp && emp.status === 'Active' && (!emp.joining_date || toDateStr(emp.joining_date) <= toDateStr(cycle.end_date));
    if (!eligible) {
      return { ...base, cycle: cyclePayload, form: null, review: null, details, message: 'You are not part of this review cycle.' };
    }

    let review: any;
    try {
      review = await this.ensureReview(cycle, emp);
    } catch (e: any) {
      const opened = cyclePayload.status !== 'UPCOMING';
      return {
        ...base,
        cycle: cyclePayload,
        form: null,
        review: null,
        details,
        message: opened ? 'No review form is available for your department yet. Please contact Admin.' : `This review opens on ${fmtDate(cycle.review_start_date)}.`,
      };
    }
    const form = await this.prisma.perf_forms.findUnique({ where: { form_id: review.form_id } });
    const questions = (form?.questions || []) as unknown as PerfQuestion[];
    const projects = await this.projectRatingsFor(cycle.cycle_id, [empId]);
    const mine = projects.get(empId) || [];
    const allIn = this.allSubmitted(review);
    const state = this.partState(review, 'SELF', cycle, today);

    // Privacy (BFD 9, 15.2): the employee sees only his or her own review.
    return {
      ...base,
      cycle: cyclePayload,
      form: form ? { form_id: form.form_id, form_name: form.form_name, questions } : null,
      details,
      review: {
        review_id: review.review_id,
        status: review.self_status,
        ratings: review.self_ratings || {},
        answers: review.self_answers || {},
        comment: review.self_comment || '',
        average: review.self_avg_rating !== null ? Number(review.self_avg_rating) : null,
        submitted_at: review.self_submitted_at,
        reopened: review.self_status === 'REOPENED',
        reopened_reason: review.self_status === 'REOPENED' ? review.reopened_reason : null,
        final_rating: allIn && review.final_rating !== null ? Number(review.final_rating) : null,
        final_pending: !allIn,
      },
      can_edit: state.canEdit,
      message: state.message,
      project_ratings: mine.map((p) => ({ project_id: p.project_id, project_name: p.project_name, rating: p.rating })),
      project_avg_rating: mine.length ? round1(mine.reduce((s, p) => s + p.rating, 0) / mine.length) : null,
    };
  }

  async getMyReviews(user: any) {
    const empId = requireEmpId(user);
    const rows = await this.prisma.perf_reviews.findMany({
      where: { emp_id: empId },
      include: { perf_cycles: true },
      orderBy: { created_at: 'desc' },
    });
    const today = todayStr();
    return rows.map((r) => ({
      review_id: r.review_id,
      cycle: this.cyclePayload(r.perf_cycles, today),
      self_status: r.self_status,
      self_submitted_at: r.self_submitted_at,
      self_avg_rating: r.self_avg_rating !== null ? Number(r.self_avg_rating) : null,
      final_rating: this.allSubmitted(r) && r.final_rating !== null ? Number(r.final_rating) : null,
    }));
  }

  // ===========================================================================
  // Screen 6: Team Review (Reporting Manager, and Admin for all employees)
  // ===========================================================================

  async getTeamReviews(user: any, query: TeamReviewsQueryDto) {
    const empId = requireEmpId(user);
    const isAdmin = await this.access.isAdmin(empId);
    const roles = await this.roleFlags(empId);
    const mode: 'MANAGER' | 'ADMIN' = query.as === 'ADMIN' ? 'ADMIN' : query.as === 'MANAGER' ? 'MANAGER' : roles.isManager ? 'MANAGER' : 'ADMIN';
    if (mode === 'ADMIN' && !isAdmin) throw perfError('Only Admin can do this.', 'as', HttpStatus.FORBIDDEN, 'FORBIDDEN');
    if (mode === 'MANAGER' && !roles.isManager) return { mode, cycle: null, items: [], is_admin: isAdmin, is_manager: false };

    const today = todayStr();
    const cycle = await this.pickCycle(query.cycle_id, today);
    if (!cycle) return { mode, cycle: null, items: [], is_admin: isAdmin, is_manager: roles.isManager };
    const people = await this.eligibleEmployees(cycle, mode === 'MANAGER' ? { managerId: empId } : { departmentId: query.department_id });
    if (cycleStatus(cycle.review_start_date, cycle.review_end_date, today) !== 'UPCOMING') {
      await this.ensureReviewsForCycle(cycle, people);
    }
    const reviews = await this.prisma.perf_reviews.findMany({
      where: { cycle_id: cycle.cycle_id, emp_id: { in: people.map((p) => p.emp_id) } },
      include: { perf_forms: true },
    });
    const byEmp = new Map(reviews.map((r) => [r.emp_id, r]));
    const part: ReviewPart = mode;
    const otherAdminExists = mode === 'ADMIN' && (await this.access.getAdminIds()).some((id) => id !== empId);
    const items = people
      .map((p) => {
        const r = byEmp.get(p.emp_id);
        const questions = ((r?.perf_forms?.questions || []) as unknown) as PerfQuestion[];
        const state = r ? this.partState(r, part, cycle, today) : { canEdit: false, message: 'No review form is available for this department yet.' };
        let canEdit = state.canEdit;
        let message = state.message;
        if (r && mode === 'MANAGER' && r.manager_emp_id !== empId) {
          canEdit = false;
          message = 'You are not the Reporting Manager for this review.';
        }
        if (r && mode === 'MANAGER' && !p.reporting_manager) {
          canEdit = false;
          message = NO_MANAGER;
        }
        if (r && mode === 'ADMIN' && p.emp_id === empId && otherAdminExists) {
          canEdit = false;
          message = 'Another Admin must give the Admin rating for your own review.';
        }
        const selfIn = r?.self_status === 'SUBMITTED';
        const c = PART_COLS[part];
        return {
          review_id: r?.review_id ?? null,
          employee: {
            emp_id: p.emp_id,
            name: p.name,
            emp_code: this.empCode(p.emp_id),
            department_name: p.department_name || '—',
            manager_name: p.manager_name || null,
          },
          has_manager: Boolean(p.reporting_manager),
          questions,
          self: {
            status: r?.self_status ?? 'PENDING',
            submitted_at: selfIn ? r!.self_submitted_at : null,
            // The employee's own rating and comment are shown once submitted (Screen 6).
            ratings: selfIn ? r!.self_ratings : {},
            answers: selfIn ? r!.self_answers : {},
            comment: selfIn ? r!.self_comment : null,
            average: selfIn && r!.self_avg_rating !== null ? Number(r!.self_avg_rating) : null,
          },
          mine: {
            status: r ? (r as any)[c.status] : 'PENDING',
            ratings: r ? (r as any)[c.ratings] || {} : {},
            answers: r ? (r as any)[c.answers] || {} : {},
            comment: r ? (r as any)[c.comment] || '' : '',
            average: r && (r as any)[c.avg] !== null ? Number((r as any)[c.avg]) : null,
            submitted_at: r ? (r as any)[c.at] : null,
          },
          done: r ? (r as any)[c.status] === 'SUBMITTED' : false,
          can_edit: canEdit,
          message,
        };
      });
    return {
      mode,
      cycle: this.cyclePayload(cycle, today),
      is_admin: isAdmin,
      is_manager: roles.isManager,
      counts: { total: items.length, done: items.filter((i) => i.done).length },
      items,
    };
  }

  // ===========================================================================
  // Screen 7: Rating Summary (Admin)
  // ===========================================================================

  async getAdminReviewsSummary(user: any, query: SummaryQueryDto) {
    await this.access.assertAdmin(user);
    const today = todayStr();
    const cycle = await this.pickCycle(query.cycle_id, today);
    if (!cycle) return { cycle: null, counts: { employees: 0, completed: 0, pending: 0 }, items: [], missing_manager_employees: [], departments_without_form: [] };
    const people = await this.eligibleEmployees(cycle, { departmentId: query.department_id });
    const opened = cycleStatus(cycle.review_start_date, cycle.review_end_date, today) !== 'UPCOMING';
    const noForm = opened ? await this.ensureReviewsForCycle(cycle, people) : [];
    const reviews = await this.prisma.perf_reviews.findMany({
      where: { cycle_id: cycle.cycle_id, emp_id: { in: people.map((p) => p.emp_id) } },
    });
    const byEmp = new Map(reviews.map((r) => [r.emp_id, r]));
    const projects = await this.projectRatingsFor(cycle.cycle_id, people.map((p) => p.emp_id));
    const num = (v: any) => (v === null || v === undefined ? null : Number(v));

    const items = people.map((p) => {
      const r = byEmp.get(p.emp_id);
      const selfIn = r?.self_status === 'SUBMITTED';
      const mgrIn = r?.manager_status === 'SUBMITTED';
      const adminIn = r?.admin_status === 'SUBMITTED';
      const complete = Boolean(r && selfIn && mgrIn && adminIn);
      const pendingBy: string[] = [];
      if (!selfIn) pendingBy.push(p.name);
      if (!mgrIn) pendingBy.push(p.manager_name ? `${p.manager_name} (Reporting Manager)` : 'Reporting Manager (not set)');
      if (!adminIn) pendingBy.push('Admin');
      const pr = projects.get(p.emp_id) || [];
      return {
        review_id: r?.review_id ?? null,
        emp_id: p.emp_id,
        name: p.name,
        emp_code: this.empCode(p.emp_id),
        department_name: p.department_name || '—',
        manager_name: p.manager_name || null,
        has_missing_manager: !p.reporting_manager,
        self_status: r?.self_status ?? 'PENDING',
        manager_status: r?.manager_status ?? 'PENDING',
        admin_status: r?.admin_status ?? 'PENDING',
        self_avg: selfIn ? num(r!.self_avg_rating) : null,
        manager_avg: mgrIn ? num(r!.manager_avg_rating) : null,
        admin_avg: adminIn ? num(r!.admin_avg_rating) : null,
        final_rating: complete ? num(r!.final_rating) : null,
        project_avg: pr.length ? round1(pr.reduce((s, x) => s + x.rating, 0) / pr.length) : null,
        status: complete ? 'COMPLETE' : 'PENDING',
        pending_by: complete ? [] : pendingBy,
        has_form: Boolean(r),
      };
    });
    const completed = items.filter((i) => i.status === 'COMPLETE').length;
    return {
      cycle: this.cyclePayload(cycle, today),
      counts: { employees: items.length, completed, pending: items.length - completed },
      items,
      missing_manager_employees: items
        .filter((i) => i.has_missing_manager)
        .map((i) => ({ emp_id: i.emp_id, name: i.name, department_name: i.department_name })),
      departments_without_form: noForm,
    };
  }

  // ===========================================================================
  // Single review (role-scoped)
  // ===========================================================================

  async getReviewById(reviewId: number, user: any) {
    const empId = requireEmpId(user);
    const r = await this.prisma.perf_reviews.findUnique({ where: { review_id: reviewId }, include: { perf_forms: true, perf_cycles: true } });
    if (!r) throw perfError('Review not found.', 'review_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const isAdmin = await this.access.isAdmin(empId);
    const isEmployee = r.emp_id === empId;
    const isManager = r.manager_emp_id === empId;
    if (!isAdmin && !isEmployee && !isManager) {
      throw perfError('You do not have access to this review.', 'review_id', HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    const pick = (part: ReviewPart) => {
      const c = PART_COLS[part];
      return {
        status: (r as any)[c.status],
        ratings: (r as any)[c.ratings],
        answers: (r as any)[c.answers],
        comment: (r as any)[c.comment],
        average: (r as any)[c.avg] !== null ? Number((r as any)[c.avg]) : null,
        submitted_at: (r as any)[c.at],
      };
    };
    const out: any = {
      review_id: r.review_id,
      cycle: this.cyclePayload(r.perf_cycles, todayStr()),
      questions: r.perf_forms?.questions || [],
      emp_id: r.emp_id,
      self: isEmployee || r.self_status === 'SUBMITTED' || isAdmin ? pick('SELF') : null,
    };
    if (isAdmin) {
      out.manager = pick('MANAGER');
      out.admin = pick('ADMIN');
      out.final_rating = this.allSubmitted(r) && r.final_rating !== null ? Number(r.final_rating) : null;
    } else if (isManager && !isEmployee) {
      out.manager = pick('MANAGER');
    } else {
      out.final_rating = this.allSubmitted(r) && r.final_rating !== null ? Number(r.final_rating) : null;
    }
    return out;
  }

  // ===========================================================================
  // Submit (Save Draft / Submit) — BFD 5
  // ===========================================================================

  submitSelfReview(reviewId: number, dto: SubmitReviewRatingsDto, user: any) {
    return this.submitPart('SELF', reviewId, dto, user);
  }

  submitManagerReview(reviewId: number, dto: SubmitReviewRatingsDto, user: any) {
    return this.submitPart('MANAGER', reviewId, dto, user);
  }

  submitAdminReview(reviewId: number, dto: SubmitReviewRatingsDto, user: any) {
    return this.submitPart('ADMIN', reviewId, dto, user);
  }

  private async submitPart(part: ReviewPart, reviewId: number, dto: SubmitReviewRatingsDto, user: any) {
    const empId = requireEmpId(user);
    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
      include: { perf_forms: true, perf_cycles: true },
    });
    if (!review) throw perfError('Review not found.', 'review_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const forbidden = (msg: string) => perfError(msg, 'review_id', HttpStatus.FORBIDDEN, 'FORBIDDEN');

    if (part === 'SELF' && review.emp_id !== empId) throw forbidden('You can fill only your own self review.');
    if (part === 'MANAGER') {
      const [emp] = await this.prisma.$queryRaw<any[]>`SELECT reporting_manager FROM employees WHERE emp_id = ${review.emp_id}`;
      if (!emp?.reporting_manager) throw perfError(NO_MANAGER, 'manager');
      if (review.manager_status !== 'SUBMITTED' && review.manager_emp_id !== emp.reporting_manager) {
        await this.prisma.perf_reviews.update({ where: { review_id: reviewId }, data: { manager_emp_id: emp.reporting_manager } });
        review.manager_emp_id = emp.reporting_manager;
      }
      if (review.manager_emp_id !== empId) throw forbidden('Only the Reporting Manager of this employee can give this rating.');
    }
    if (part === 'ADMIN') {
      if (!(await this.access.isAdmin(empId))) throw forbidden('Only Admin can do this.');
      if (review.emp_id === empId) {
        const admins = await this.access.getAdminIds();
        if (admins.some((id) => id !== empId)) throw forbidden('Another Admin must give the Admin rating for your own review.');
      }
    }

    const c = PART_COLS[part];
    const status = (review as any)[c.status] as string;
    if (status === 'SUBMITTED') throw perfError(ALREADY_SUBMITTED);
    if (status !== 'REOPENED') this.assertWindowOpen(review.perf_cycles);

    const questions = (review.perf_forms?.questions || []) as unknown as PerfQuestion[];
    const isDraft = Boolean(dto.is_draft);
    let clean: { ratings: Record<string, number>; answers: Record<string, any> };
    try {
      clean = validateSubmission(questions, dto.ratings || {}, dto.answers || {}, isDraft);
    } catch (e) {
      if (e instanceof RuleError) throw perfError(e.message, e.field || 'ratings');
      throw e;
    }

    const data: any = {
      [c.ratings]: clean.ratings,
      [c.answers]: clean.answers,
      [c.comment]: dto.comment?.trim() || null,
      [c.avg]: averageOf(questions, clean.ratings),
      updated_at: new Date(),
    };
    if (part === 'ADMIN') data.admin_emp_id = empId;
    if (!isDraft) {
      data[c.status] = 'SUBMITTED';
      data[c.at] = new Date();
    }
    const updated = await this.prisma.perf_reviews.update({ where: { review_id: reviewId }, data });
    await this.refreshFinal(updated.review_id);

    if (!isDraft && part === 'SELF') {
      // BFD 12 (Required): self review submitted → Reporting Manager and Admin.
      const [emp] = await this.prisma.$queryRaw<any[]>`SELECT name, reporting_manager FROM employees WHERE emp_id = ${review.emp_id}`;
      const admins = await this.access.getAdminIds();
      const recipients = new Set<number>(admins);
      if (emp?.reporting_manager) recipients.add(Number(emp.reporting_manager));
      recipients.delete(review.emp_id);
      await this.notify({
        recipients: Array.from(recipients),
        kind: 'perf_self_review_submitted',
        title: 'Self review submitted',
        body: `${emp?.name || 'An employee'} has submitted the self review for ${periodLabel(review.perf_cycles)}.`,
        entityType: 'perf_reviews',
        entityId: review.review_id,
        createdBy: empId,
      });
    }
    return { success: true, review_id: reviewId, status: isDraft ? status : 'SUBMITTED' };
  }

  /** Final Rating only when all three are in (BFD 6). */
  private async refreshFinal(reviewId: number) {
    const r = await this.prisma.perf_reviews.findUnique({ where: { review_id: reviewId } });
    if (!r) return;
    const allIn = this.allSubmitted(r) && r.self_avg_rating !== null && r.manager_avg_rating !== null && r.admin_avg_rating !== null;
    const final = allIn ? finalRating(Number(r.self_avg_rating), Number(r.manager_avg_rating), Number(r.admin_avg_rating)) : null;
    await this.prisma.perf_reviews.update({
      where: { review_id: reviewId },
      data: { final_rating: final, is_locked: allIn, updated_at: new Date() },
    });
  }

  // ===========================================================================
  // Reopen (Admin, one review for one person) — BFD 5, 15.3
  // ===========================================================================

  async reopenReview(reviewId: number, dto: ReopenReviewDto, user: any) {
    const adminId = await this.access.assertAdmin(user);
    const r = await this.prisma.perf_reviews.findUnique({ where: { review_id: reviewId }, include: { perf_cycles: true } });
    if (!r) throw perfError('Review not found.', 'review_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const c = PART_COLS[dto.part];
    const status = (r as any)[c.status];
    const closed = cycleStatus(r.perf_cycles.review_start_date, r.perf_cycles.review_end_date) === 'CLOSED';
    if (status === 'REOPENED') throw perfError('This review is already open again.', 'part');
    if (status !== 'SUBMITTED' && !closed) {
      throw perfError('This review is not submitted yet and the review window is still open.', 'part');
    }
    await this.prisma.perf_reviews.update({
      where: { review_id: reviewId },
      data: {
        [c.status]: 'REOPENED',
        [c.at]: null,
        final_rating: null,
        is_locked: false,
        reopened_reason: `${PART_NAMES[dto.part]}: ${dto.reason.trim()}`,
        reopened_at: new Date(),
        reopened_by: adminId,
        updated_at: new Date(),
      },
    });
    const recipient = dto.part === 'SELF' ? r.emp_id : dto.part === 'MANAGER' ? r.manager_emp_id : r.admin_emp_id;
    if (recipient) {
      await this.notify({
        recipients: [recipient],
        kind: 'perf_review_reopened',
        title: 'Review opened again',
        body: `Admin has opened the ${dto.part === 'SELF' ? 'self review' : 'review'} for ${periodLabel(r.perf_cycles)} again. Reason: ${dto.reason.trim()}`,
        entityType: 'perf_reviews',
        entityId: reviewId,
        createdBy: adminId,
      });
    }
    return { success: true };
  }

  // ===========================================================================
  // Screen 8: Project Rating (Project Manager)
  // ===========================================================================

  async getMyProjects(user: any) {
    const empId = requireEmpId(user);
    return this.prisma.$queryRaw<any[]>`
      SELECT p.project_id, p.project_no, p.project_name, p.project_manager_id, m.name AS project_manager_name
      FROM projects p LEFT JOIN employees m ON m.emp_id = p.project_manager_id
      WHERE p.project_manager_id = ${empId} AND p.deleted_at IS NULL
      ORDER BY p.project_name;
    `;
  }

  async getProjectMembersForRating(projectId: number, cycleId: number, user: any) {
    const empId = requireEmpId(user);
    const project = await this.loadOwnProject(projectId, empId);
    const cycle = await this.prisma.perf_cycles.findUnique({ where: { cycle_id: cycleId } });
    if (!cycle) throw perfError('Please select the Cycle.', 'cycle_id');
    const members = await this.projectMembers(projectId, project.project_manager_id);
    const ratings = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, rating, comment, status, submitted_at
      FROM perf_project_ratings WHERE project_id = ${projectId} AND cycle_id = ${cycleId};
    `;
    const byEmp = new Map(ratings.map((r) => [Number(r.emp_id), r]));
    const submitted = ratings.length > 0 && ratings.every((r) => r.status === 'SUBMITTED') && members.every((m) => byEmp.has(m.emp_id));
    const status = cycleStatus(cycle.review_start_date, cycle.review_end_date);
    return {
      project: { project_id: project.project_id, project_name: project.project_name, project_manager_name: project.project_manager_name },
      cycle: this.cyclePayload(cycle, todayStr()),
      submitted,
      can_edit: status === 'REVIEW_OPEN' && !submitted,
      message:
        status === 'UPCOMING'
          ? `This review opens on ${fmtDate(cycle.review_start_date)}.`
          : status === 'CLOSED' && !submitted
            ? `The review window closed on ${fmtDate(cycle.review_end_date)}. Please contact Admin.`
            : submitted
              ? 'Ratings submitted.'
              : null,
      members: members.map((m) => {
        const r = byEmp.get(m.emp_id);
        return {
          emp_id: m.emp_id,
          name: m.name,
          role_in_project: m.role_in_project,
          rating: r ? Number(r.rating) : 0,
          comment: r?.comment || '',
          status: r?.status || null,
        };
      }),
    };
  }

  async submitBulkProjectRatings(dto: SubmitBulkProjectRatingsDto, user: any) {
    const empId = requireEmpId(user);
    const project = await this.loadOwnProject(dto.project_id, empId);
    const cycle = await this.prisma.perf_cycles.findUnique({ where: { cycle_id: dto.cycle_id } });
    if (!cycle) throw perfError('Please select the Cycle.', 'cycle_id');
    this.assertWindowOpen(cycle);
    const members = await this.projectMembers(dto.project_id, project.project_manager_id);
    const memberIds = new Set(members.map((m) => m.emp_id));
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT status FROM perf_project_ratings WHERE project_id = ${dto.project_id} AND cycle_id = ${dto.cycle_id} AND status = 'SUBMITTED' LIMIT 1;
    `;
    if (existing.length) throw perfError('These ratings are already submitted and cannot be changed.');
    for (const it of dto.ratings) {
      if (!memberIds.has(Number(it.emp_id))) throw perfError('You can rate only the members of your own project.', 'ratings');
    }
    const isDraft = Boolean(dto.is_draft);
    const given = new Map(dto.ratings.filter((i) => i.rating && i.rating >= 1).map((i) => [Number(i.emp_id), i]));
    if (!isDraft && members.some((m) => !given.has(m.emp_id))) {
      throw perfError('Please give a star rating for every member before you submit.', 'ratings');
    }
    const status = isDraft ? 'DRAFT' : 'SUBMITTED';
    await this.prisma.$transaction(async (tx) => {
      for (const it of given.values()) {
        await tx.$executeRaw`
          INSERT INTO perf_project_ratings (cycle_id, project_id, emp_id, project_manager_id, rating, comment, status, submitted_at)
          VALUES (${dto.cycle_id}, ${dto.project_id}, ${Number(it.emp_id)}, ${empId}, ${Number(it.rating)}, ${it.comment?.trim() || null},
                  ${status}, ${isDraft ? null : new Date()})
          ON CONFLICT (cycle_id, project_id, emp_id) DO UPDATE
          SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, status = EXCLUDED.status,
              submitted_at = EXCLUDED.submitted_at, project_manager_id = EXCLUDED.project_manager_id, updated_at = clock_timestamp();
        `;
      }
      // A cleared star on a draft removes the saved draft rating.
      const keep = Array.from(given.keys());
      await tx.$executeRaw`
        DELETE FROM perf_project_ratings
        WHERE project_id = ${dto.project_id} AND cycle_id = ${dto.cycle_id} AND status = 'DRAFT'
          AND NOT (emp_id = ANY(${keep}::int[]));
      `;
    });
    return { success: true, status };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async loadOwnProject(projectId: number, empId: number) {
    const [p] = await this.prisma.$queryRaw<any[]>`
      SELECT p.project_id, p.project_name, p.project_manager_id, m.name AS project_manager_name
      FROM projects p LEFT JOIN employees m ON m.emp_id = p.project_manager_id
      WHERE p.project_id = ${projectId} AND p.deleted_at IS NULL;
    `;
    if (!p) throw perfError('Please select the Project.', 'project_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (Number(p.project_manager_id) !== empId) {
      throw perfError('Only the Project Manager of this project can rate its members.', 'project_id', HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    return p;
  }

  private async projectMembers(projectId: number, pmId: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT ON (e.emp_id) e.emp_id, e.name, pm.role_in_project
      FROM project_members pm JOIN employees e ON e.emp_id = pm.employee_id
      WHERE pm.project_id = ${projectId} AND pm.deleted_at IS NULL
        AND e.deleted_at IS NULL AND e.status = 'Active' AND e.emp_id <> ${pmId}
      ORDER BY e.emp_id;
    `;
    return rows
      .map((r) => ({ emp_id: Number(r.emp_id), name: r.name, role_in_project: this.titleCase(r.role_in_project || 'member') }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Submitted project ratings only (drafts are not shown). */
  private async projectRatingsFor(cycleId: number, empIds: number[]) {
    const out = new Map<number, Array<{ project_id: number; project_name: string; rating: number }>>();
    if (!empIds.length) return out;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT r.emp_id, r.project_id, p.project_name, r.rating
      FROM perf_project_ratings r JOIN projects p ON p.project_id = r.project_id
      WHERE r.cycle_id = ${cycleId} AND r.status = 'SUBMITTED' AND r.emp_id = ANY(${empIds}::int[]);
    `;
    for (const r of rows) {
      const list = out.get(Number(r.emp_id)) || [];
      list.push({ project_id: Number(r.project_id), project_name: r.project_name, rating: Number(r.rating) });
      out.set(Number(r.emp_id), list);
    }
    return out;
  }

  private async roleFlags(empId: number) {
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXISTS (SELECT 1 FROM employees WHERE reporting_manager = ${empId} AND emp_id <> ${empId}
                AND status = 'Active' AND deleted_at IS NULL) AS is_manager,
        EXISTS (SELECT 1 FROM projects WHERE project_manager_id = ${empId} AND deleted_at IS NULL) AS is_pm;
    `;
    return { isManager: Boolean(row?.is_manager), isProjectManager: Boolean(row?.is_pm) };
  }

  /** The cycle asked for, else the open one, else the most recent one that has started its window, else the next. */
  private async pickCycle(cycleId: number | undefined, today: string) {
    if (cycleId) {
      const c = await this.prisma.perf_cycles.findUnique({ where: { cycle_id: Number(cycleId) } });
      if (!c) throw perfError('Cycle not found.', 'cycle_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
      return c;
    }
    const all = await this.prisma.perf_cycles.findMany({ orderBy: [{ review_start_date: 'desc' }, { cycle_type: 'desc' }] });
    return (
      all.find((c) => cycleStatus(c.review_start_date, c.review_end_date, today) === 'REVIEW_OPEN') ||
      all.find((c) => cycleStatus(c.review_start_date, c.review_end_date, today) === 'CLOSED') ||
      all[all.length - 1] ||
      null
    );
  }

  private cyclePayload(c: any, today: string) {
    const status = cycleStatus(c.review_start_date, c.review_end_date, today);
    return {
      cycle_id: c.cycle_id,
      cycle_name: c.cycle_name,
      cycle_type: c.cycle_type,
      period_label: periodLabel(c),
      start_date: toDateStr(c.start_date),
      end_date: toDateStr(c.end_date),
      review_start_date: toDateStr(c.review_start_date),
      review_end_date: toDateStr(c.review_end_date),
      window_label: `${fmtDayMonth(c.review_start_date)} – ${fmtDate(c.review_end_date)}`,
      status,
      days_left: status === 'REVIEW_OPEN' ? daysLeft(c.review_end_date, today) : null,
    };
  }

  private partState(r: any, part: ReviewPart, cycle: any, today: string): { canEdit: boolean; message: string | null } {
    const status = r[PART_COLS[part].status];
    if (status === 'SUBMITTED') return { canEdit: false, message: ALREADY_SUBMITTED };
    if (status === 'REOPENED') return { canEdit: true, message: 'Admin has opened this review again. Please submit it.' };
    const s = cycleStatus(cycle.review_start_date, cycle.review_end_date, today);
    if (s === 'UPCOMING') return { canEdit: false, message: `This review opens on ${fmtDate(cycle.review_start_date)}.` };
    if (s === 'CLOSED') return { canEdit: false, message: `The review window closed on ${fmtDate(cycle.review_end_date)}. Please contact Admin.` };
    return { canEdit: true, message: null };
  }

  private assertWindowOpen(cycle: any) {
    const s = cycleStatus(cycle.review_start_date, cycle.review_end_date);
    if (s === 'UPCOMING') throw perfError(`This review opens on ${fmtDate(cycle.review_start_date)}.`, 'cycle');
    if (s === 'CLOSED') throw perfError(`The review window closed on ${fmtDate(cycle.review_end_date)}. Please contact Admin.`, 'cycle');
  }

  private allSubmitted(r: any) {
    return r.self_status === 'SUBMITTED' && r.manager_status === 'SUBMITTED' && r.admin_status === 'SUBMITTED';
  }

  private empCode(empId: number) {
    return `EMP-${String(empId).padStart(4, '0')}`;
  }

  private titleCase(s: string) {
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }

  private async notify(n: Notice) {
    if (!this.createNotificationUseCase || !n.recipients.length) return;
    try {
      await this.createNotificationUseCase.executeMany(
        n.recipients.map((id) => ({
          recipient_id: id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          entity_type: n.entityType,
          entity_id: n.entityId,
          created_by: n.createdBy ?? null,
        })) as any,
      );
    } catch (e: any) {
      this.logger.warn(`Performance notification failed: ${e?.message}`);
    }
  }
}
