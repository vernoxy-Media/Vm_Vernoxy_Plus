import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import {
  ReopenReviewDto,
  SubmitBulkProjectRatingsDto,
  SubmitProjectRatingDto,
  SubmitReviewRatingsDto,
} from '../../presentation/dto/performance.dto';

interface RequestUser {
  emp_id?: number;
  sub?: number;
  email: string;
  role_name?: string;
  access?: {
    can_manage_organization?: boolean;
    [key: string]: any;
  };
}

@Injectable()
export class PerformanceReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly createNotificationUseCase?: CreateNotificationUseCase,
  ) {}

  private getEmpId(user: RequestUser): number {
    return Number(user?.emp_id || user?.sub || 1);
  }

  private isAdmin(user: RequestUser): boolean {
    if (user?.role_name?.toLowerCase().includes('admin') || user?.emp_id === 1) return true;
    return Boolean(user.access?.can_manage_organization);
  }

  /**
   * Calculate average rating (1 decimal place) from ratings object
   */
  private calculateAverage(ratings: Record<string, number> = {}): number | null {
    const values = Object.values(ratings).filter((v) => typeof v === 'number' && v >= 1 && v <= 5);
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Find or auto-initialize a review record for an employee in a given cycle
   */
  async getOrCreateReview(cycleId: number, employeeId: number) {
    let review = await this.prisma.perf_reviews.findUnique({
      where: {
        cycle_id_emp_id: {
          cycle_id: cycleId,
          emp_id: employeeId,
        },
      },
      include: {
        perf_cycles: true,
        perf_forms: true,
        employees_perf_reviews_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true, dep_id: true, reporting_manager: true },
        },
        employees_perf_reviews_manager_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_perf_reviews_admin_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
    });

    if (review) {
      return review;
    }

    // Lookup employee details
    const emp = await this.prisma.employees.findUnique({
      where: { emp_id: employeeId },
      select: { emp_id: true, name: true, dep_id: true, reporting_manager: true },
    });

    if (!emp) {
      throw new NotFoundException(`Employee #${employeeId} not found`);
    }

    // Determine form: Department specific form first, fallback to All departments form
    const forms = await this.prisma.perf_forms.findMany({
      where: { cycle_id: cycleId, is_published: true },
      orderBy: { created_at: 'desc' },
    });

    let targetForm = forms.find(
      (f) => Array.isArray(f.department_ids) && emp.dep_id && f.department_ids.includes(emp.dep_id),
    );
    if (!targetForm) {
      targetForm = forms.find((f) => !f.department_ids || f.department_ids.length === 0);
    }
    if (!targetForm && forms.length > 0) {
      targetForm = forms[0];
    }

    if (!targetForm) {
      throw new BadRequestException(
        `No review form is published for department #${emp.dep_id || 0} in cycle #${cycleId}`,
      );
    }

    const created = await this.prisma.perf_reviews.create({
      data: {
        cycle_id: cycleId,
        form_id: targetForm.form_id,
        emp_id: employeeId,
        manager_emp_id: emp.reporting_manager || null,
        self_status: 'PENDING',
        manager_status: 'PENDING',
        admin_status: 'PENDING',
      },
      include: {
        perf_cycles: true,
        perf_forms: true,
        employees_perf_reviews_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true, dep_id: true, reporting_manager: true },
        },
        employees_perf_reviews_manager_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_perf_reviews_admin_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
    });

    return created;
  }

  /**
   * 1. Detailed Self Review for current logged in employee & active/specified cycle
   */
  async getMyReviewDetail(user: RequestUser, cycleId?: number) {
    const empId = this.getEmpId(user);
    const isAdmin = this.isAdmin(user);

    // 1. Determine cycle
    let cycle: any = null;
    if (cycleId) {
      cycle = await this.prisma.perf_cycles.findUnique({
        where: { cycle_id: Number(cycleId) },
      });
    }
    if (!cycle) {
      cycle = await this.prisma.perf_cycles.findFirst({
        where: { status: 'REVIEW_OPEN' },
        orderBy: { cycle_id: 'desc' },
      });
    }
    if (!cycle) {
      cycle = await this.prisma.perf_cycles.findFirst({
        orderBy: { cycle_id: 'desc' },
      });
    }

    if (!cycle) {
      return {
        cycle: null,
        form: null,
        review: null,
        is_window_open: false,
        role: isAdmin ? 'ADMIN' : 'EMPLOYEE',
        can_review_self: false,
        can_review_team: false,
        can_view_summary: false,
      };
    }

    // 2. Window Open check (1st-10th or REVIEW_OPEN)
    const now = new Date();
    const isWindowOpen =
      cycle.status === 'REVIEW_OPEN' ||
      (cycle.review_start_date &&
        cycle.review_end_date &&
        now >= new Date(cycle.review_start_date) &&
        now <= new Date(cycle.review_end_date));

    // 3. Manager check: does anyone report to this employee?
    const directReportsCount = await this.prisma.employees.count({
      where: { reporting_manager: empId },
    });
    const isManager = directReportsCount > 0 || isAdmin;

    // 3b. Project Manager check: does this user manage any projects?
    const managedProjectsCount = await this.prisma.projects.count({
      where: isAdmin ? {} : { project_manager_id: empId },
    });
    const isProjectManager = managedProjectsCount > 0 || isAdmin;

    // 4. Get or auto-init review for current employee
    let review: any = null;
    try {
      review = await this.getOrCreateReview(cycle.cycle_id, empId);
    } catch {
      review = null;
    }

    // 5. Query Project Ratings for current employee in this cycle (BFD Section 6 & 11)
    const projectRatings = await this.prisma.perf_project_ratings.findMany({
      where: {
        cycle_id: cycle.cycle_id,
        emp_id: empId,
      },
      include: {
        projects: {
          select: {
            project_id: true,
            project_name: true,
            project_no: true,
          },
        },
      },
    });

    const projectAvgRating =
      projectRatings.length > 0
        ? Math.round(
            (projectRatings.reduce((acc, curr) => acc + Number(curr.rating), 0) / projectRatings.length) * 10,
          ) / 10
        : null;

    const role = isAdmin ? 'ADMIN' : isManager ? 'MANAGER' : 'EMPLOYEE';

    return {
      cycle,
      form: review?.perf_forms || null,
      review: review
        ? {
            ...review,
            status: review.self_status === 'SUBMITTED' ? 'SELF_SUBMITTED' : 'PENDING',
          }
        : null,
      project_avg_rating: projectAvgRating,
      project_ratings: projectRatings.map((p) => ({
        project_id: p.project_id,
        project_name: p.projects?.project_name,
        project_code: p.projects?.project_no,
        rating: Number(p.rating),
        feedback: p.comment,
      })),
      is_window_open: Boolean(isWindowOpen),
      role,
      is_admin: isAdmin,
      is_manager: isManager,
      is_project_manager: isProjectManager,
      can_review_self: true,
      can_review_team: isManager || isAdmin,
      can_rate_projects: isProjectManager,
      can_view_summary: isAdmin,
    };
  }

  /**
   * 1b. Self Reviews List (all historical cycles for current logged in employee)
   */
  async getMyReviews(user: RequestUser) {
    const empId = this.getEmpId(user);

    const reviews = await this.prisma.perf_reviews.findMany({
      where: { emp_id: empId },
      include: {
        perf_cycles: true,
        perf_forms: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return reviews.map((r) => ({
      review_id: r.review_id,
      cycle: r.perf_cycles,
      form_name: r.perf_forms.form_name,
      self_status: r.self_status,
      self_submitted_at: r.self_submitted_at,
      self_avg_rating: r.self_avg_rating,
      final_rating: r.final_rating,
      is_locked: r.is_locked,
    }));
  }

  /**
   * 2. Team Reviews List (for Reporting Manager & Admin)
   */
  async getTeamReviews(user: RequestUser, cycleId?: number) {
    const managerId = this.getEmpId(user);
    const isAdmin = this.isAdmin(user);

    // Identify team members
    const teamEmployees = await this.prisma.employees.findMany({
      where: isAdmin ? {} : { reporting_manager: managerId },
      select: { emp_id: true, name: true, email: true, dep_id: true },
    });

    if (cycleId && teamEmployees.length > 0) {
      // Ensure reviews are initialized for team members so manager/admin can review them
      for (const emp of teamEmployees) {
        try {
          await this.getOrCreateReview(Number(cycleId), emp.emp_id);
        } catch {}
      }
    }

    const where: any = {};
    if (!isAdmin) {
      where.employees_perf_reviews_emp_idToemployees = {
        reporting_manager: managerId,
      };
    }

    if (cycleId) {
      where.cycle_id = Number(cycleId);
    }

    const reviews = await this.prisma.perf_reviews.findMany({
      where,
      include: {
        perf_cycles: true,
        perf_forms: true,
        employees_perf_reviews_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true, dep_id: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reviews.map((r) => ({
      review_id: r.review_id,
      cycle_id: r.cycle_id,
      emp_id: r.emp_id,
      cycle: r.perf_cycles,
      perf_forms: r.perf_forms,
      employee: r.employees_perf_reviews_emp_idToemployees,
      self_status: r.self_status,
      self_ratings: r.self_ratings,
      self_comment: r.self_comment,
      self_avg_rating: r.self_avg_rating,
      manager_status: r.manager_status,
      manager_ratings: r.manager_ratings,
      manager_comment: r.manager_comment,
      manager_avg_rating: r.manager_avg_rating,
      admin_status: r.admin_status,
      admin_avg_rating: r.admin_avg_rating,
      final_rating: r.final_rating,
      status:
        r.manager_status === 'SUBMITTED'
          ? 'MANAGER_REVIEWED'
          : r.self_status === 'SUBMITTED'
          ? 'SELF_SUBMITTED'
          : 'PENDING',
      is_locked: r.is_locked,
    }));
  }

  /**
   * 3. Admin Rating Summary (Screen 7 - Admin sees all reviews and final ratings)
   */
  async getAdminReviewsSummary(user: RequestUser, cycleId?: number, departmentId?: number) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can access the Rating Summary');
    }

    // Auto-initialize reviews for all active employees eligible in this cycle (BFD Section 11 & 13)
    if (cycleId) {
      const cycle = await this.prisma.perf_cycles.findUnique({
        where: { cycle_id: Number(cycleId) },
      });

      if (cycle) {
        const activeEmployees = await this.prisma.employees.findMany({
          where: {
            status: 'Active',
            deleted_at: null,
            OR: [
              { joining_date: { lte: new Date(cycle.end_date) } },
            ],
          },
          select: { emp_id: true },
        });

        const existingReviews = await this.prisma.perf_reviews.findMany({
          where: { cycle_id: Number(cycleId) },
          select: { emp_id: true },
        });
        const existingEmpIds = new Set(existingReviews.map((r) => r.emp_id));

        for (const emp of activeEmployees) {
          if (!existingEmpIds.has(emp.emp_id)) {
            try {
              await this.getOrCreateReview(cycle.cycle_id, emp.emp_id);
            } catch {
              // Ignore if no form is published yet for department
            }
          }
        }
      }
    }

    const where: any = {};
    if (cycleId) {
      where.cycle_id = Number(cycleId);
    }
    if (departmentId) {
      where.employees_perf_reviews_emp_idToemployees = {
        dep_id: Number(departmentId),
      };
    }

    const reviews = await this.prisma.perf_reviews.findMany({
      where,
      include: {
        perf_cycles: true,
        perf_forms: true,
        employees_perf_reviews_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
            reporting_manager: true,
            departments_employees_dep_idTodepartments: { select: { name: true } },
          },
        },
        employees_perf_reviews_manager_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
      orderBy: [{ cycle_id: 'desc' }, { created_at: 'desc' }],
    });

    const projRatings = await this.prisma.perf_project_ratings.findMany({
      where: cycleId ? { cycle_id: Number(cycleId) } : {},
      select: { emp_id: true, rating: true },
    });
    const projRatingMap = new Map<number, number[]>();
    for (const pr of projRatings) {
      const list = projRatingMap.get(pr.emp_id) || [];
      list.push(pr.rating);
      projRatingMap.set(pr.emp_id, list);
    }

    // Query active employees missing an assigned Reporting Manager (BFD Section 10 & 14)
    const missingManagerEmployees = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
        reporting_manager: null,
      },
      select: {
        emp_id: true,
        name: true,
        email: true,
        departments_employees_dep_idTodepartments: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mappedReviews = reviews.map((r) => {
      const pList = projRatingMap.get(r.emp_id);
      const projectAvg =
        pList && pList.length > 0
          ? Math.round((pList.reduce((a, b) => a + b, 0) / pList.length) * 10) / 10
          : null;

      const emp = r.employees_perf_reviews_emp_idToemployees;
      const deptName = emp?.departments_employees_dep_idTodepartments?.name || 'Unassigned';

      return {
        review_id: r.review_id,
        cycle: r.perf_cycles,
        name: emp?.name || `Employee #${r.emp_id}`,
        email: emp?.email || '',
        department_name: deptName,
        designation: '',
        employee: {
          emp_id: emp?.emp_id,
          name: emp?.name,
          email: emp?.email,
          dep_id: emp?.dep_id,
          department_name: deptName,
        },
        manager: r.employees_perf_reviews_manager_emp_idToemployees,
        self_status: r.self_status,
        self_avg: r.self_avg_rating,
        self_avg_rating: r.self_avg_rating,
        manager_status: r.manager_status,
        manager_avg: r.manager_avg_rating,
        manager_avg_rating: r.manager_avg_rating,
        admin_status: r.admin_status,
        admin_avg: r.admin_avg_rating,
        admin_avg_rating: r.admin_avg_rating,
        project_avg: projectAvg,
        final_rating: r.final_rating,
        status: r.final_rating
          ? 'FINALIZED'
          : r.manager_status === 'SUBMITTED'
          ? 'MANAGER_REVIEWED'
          : r.self_status === 'SUBMITTED'
          ? 'SELF_SUBMITTED'
          : 'PENDING',
        is_locked: r.is_locked,
        has_missing_manager: !emp?.reporting_manager,
      };
    });

    const mappedMissingManagers = missingManagerEmployees.map((m) => ({
      emp_id: m.emp_id,
      name: m.name,
      email: m.email,
      department_name: m.departments_employees_dep_idTodepartments?.name || 'Unassigned',
    }));

    return {
      data: mappedReviews,
      items: mappedReviews,
      missing_manager_employees: mappedMissingManagers,
    };
  }

  /**
   * Get single review detail
   */
  async getReviewById(reviewId: number, user: RequestUser) {
    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
      include: {
        perf_cycles: true,
        perf_forms: true,
        employees_perf_reviews_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true, dep_id: true, reporting_manager: true },
        },
        employees_perf_reviews_manager_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_perf_reviews_admin_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review #${reviewId} not found`);
    }

    const empId = this.getEmpId(user);
    const isAdmin = this.isAdmin(user);
    const isEmployee = review.emp_id === empId;
    const isManager = review.manager_emp_id === empId;

    if (!isAdmin && !isEmployee && !isManager) {
      throw new ForbiddenException('You do not have permission to view this review');
    }

    // Privacy rule (BFD Section 9 & 15.2):
    // Employee sees only their own ratings and comments. Manager and Admin ratings are hidden from employee.
    if (isEmployee && !isAdmin && !isManager) {
      return {
        ...review,
        manager_ratings: {},
        manager_comment: null,
        manager_avg_rating: null,
        admin_ratings: {},
        admin_comment: null,
        admin_avg_rating: null,
        final_rating: review.final_rating,
      };
    }

    return review;
  }

  /**
   * Submit Self Review (Employee)
   */
  async submitSelfReview(reviewId: number, dto: SubmitReviewRatingsDto, user: RequestUser) {
    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
      include: { perf_cycles: true },
    });

    if (!review) throw new NotFoundException('Review not found');

    const empId = this.getEmpId(user);
    if (review.emp_id !== empId && !this.isAdmin(user)) {
      throw new ForbiddenException('You can only submit your own self-review');
    }

    if (review.self_status === 'SUBMITTED' && review.is_locked && !this.isAdmin(user)) {
      throw new BadRequestException('This review is already submitted and cannot be changed.');
    }

    const isDraft = Boolean(dto.is_draft);
    const avgRating = this.calculateAverage(dto.ratings || {});

    const updateData: any = {
      self_ratings: dto.ratings || {},
      self_answers: dto.answers || {},
      self_comment: dto.comment?.trim() || null,
      self_avg_rating: avgRating,
      self_status: isDraft ? 'PENDING' : 'SUBMITTED',
      self_submitted_at: isDraft ? null : new Date(),
      is_locked: isDraft ? false : true,
      updated_at: new Date(),
    };

    const updated = await this.prisma.perf_reviews.update({
      where: { review_id: reviewId },
      data: updateData,
    });

    if (!isDraft && this.createNotificationUseCase) {
      try {
        const emp = await this.prisma.employees.findUnique({
          where: { emp_id: review.emp_id },
          select: { name: true, reporting_manager: true },
        });

        const admins = await this.prisma.employees.findMany({
          where: {
            OR: [
              { emp_id: 1 },
              { roles_employees_role_idToroles: { role_name: { contains: 'admin', mode: 'insensitive' } } },
            ],
          },
          select: { emp_id: true },
        });

        const recipientIds = new Set<number>();
        if (emp?.reporting_manager) recipientIds.add(emp.reporting_manager);
        for (const a of admins) {
          if (a.emp_id !== review.emp_id) recipientIds.add(a.emp_id);
        }

        const cycleName = review.perf_cycles?.cycle_name || 'Evaluation Cycle';
        const notifs = Array.from(recipientIds).map((rid) => ({
          recipient_id: rid,
          kind: 'perf_review_submitted',
          title: 'Self-Review Submitted',
          body: `${emp?.name || 'An employee'} has submitted the self review for ${cycleName}.`,
          entity_type: 'perf_review',
          entity_id: reviewId,
          created_by: empId,
        }));

        if (notifs.length > 0) {
          await this.createNotificationUseCase.executeMany(notifs);
        }
      } catch {}
    }

    await this.tryComputeFinalRating(reviewId);
    return updated;
  }

  /**
   * Submit Manager Review (Reporting Manager)
   */
  async submitManagerReview(reviewId: number, dto: SubmitReviewRatingsDto, user: RequestUser) {
    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
      include: { perf_cycles: true },
    });

    if (!review) throw new NotFoundException('Review not found');

    const empId = this.getEmpId(user);
    if (review.manager_emp_id !== empId && !this.isAdmin(user)) {
      throw new ForbiddenException('Only the assigned reporting manager or Admin can submit manager ratings');
    }

    const isDraft = Boolean(dto.is_draft);
    const avgRating = this.calculateAverage(dto.ratings || {});

    const updated = await this.prisma.perf_reviews.update({
      where: { review_id: reviewId },
      data: {
        manager_ratings: dto.ratings || {},
        manager_answers: dto.answers || {},
        manager_comment: dto.comment?.trim() || null,
        manager_avg_rating: avgRating,
        manager_status: isDraft ? 'PENDING' : 'SUBMITTED',
        manager_submitted_at: isDraft ? null : new Date(),
        updated_at: new Date(),
      },
    });

    if (!isDraft && this.createNotificationUseCase) {
      try {
        const mgr = await this.prisma.employees.findUnique({
          where: { emp_id: empId },
          select: { name: true },
        });
        const targetEmp = await this.prisma.employees.findUnique({
          where: { emp_id: review.emp_id },
          select: { name: true },
        });
        const admins = await this.prisma.employees.findMany({
          where: {
            OR: [
              { emp_id: 1 },
              { roles_employees_role_idToroles: { role_name: { contains: 'admin', mode: 'insensitive' } } },
            ],
          },
          select: { emp_id: true },
        });

        const cycleName = review.perf_cycles?.cycle_name || 'Evaluation Cycle';
        const notifs = admins
          .filter((a) => a.emp_id !== empId)
          .map((a) => ({
            recipient_id: a.emp_id,
            kind: 'perf_manager_review_submitted',
            title: 'Manager Evaluation Submitted',
            body: `${mgr?.name || 'Manager'} has submitted evaluation for ${targetEmp?.name || 'employee'} in ${cycleName}.`,
            entity_type: 'perf_review',
            entity_id: reviewId,
            created_by: empId,
          }));

        if (notifs.length > 0) {
          await this.createNotificationUseCase.executeMany(notifs);
        }
      } catch {}
    }

    await this.tryComputeFinalRating(reviewId);
    return updated;
  }

  /**
   * Submit Admin Review (Admin / HR)
   */
  async submitAdminReview(reviewId: number, dto: SubmitReviewRatingsDto, user: RequestUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can submit admin reviews');
    }

    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
      include: { perf_cycles: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const avgRating = this.calculateAverage(dto.ratings || {});
    const directFinalRating = dto.final_rating !== undefined && dto.final_rating !== null ? Number(dto.final_rating) : undefined;
    const adminComments = dto.admin_comments || dto.comment?.trim() || null;

    const updated = await this.prisma.perf_reviews.update({
      where: { review_id: reviewId },
      data: {
        admin_emp_id: this.getEmpId(user),
        admin_ratings: dto.ratings || {},
        admin_answers: dto.answers || {},
        admin_comment: adminComments,
        admin_avg_rating: avgRating || directFinalRating || null,
        final_rating: directFinalRating,
        admin_status: 'SUBMITTED',
        admin_submitted_at: new Date(),
        is_locked: directFinalRating !== undefined ? true : review.is_locked,
        updated_at: new Date(),
      },
    });

    if (directFinalRating !== undefined && this.createNotificationUseCase) {
      try {
        const cycleName = review.perf_cycles?.cycle_name || 'Evaluation Cycle';
        await this.createNotificationUseCase.execute({
          recipient_id: review.emp_id,
          kind: 'perf_review_completed',
          title: 'Evaluation Completed',
          body: `Your official performance review for ${cycleName} has been finalized. Final Rating: ${directFinalRating} ★.`,
          entity_type: 'perf_review',
          entity_id: reviewId,
          created_by: this.getEmpId(user),
        });
      } catch {}
    } else {
      await this.tryComputeFinalRating(reviewId);
    }

    return updated;
  }

  /**
   * Calculate and save Final Rating once Self, Manager and Admin reviews are all SUBMITTED (BFD Section 2)
   */
  private async tryComputeFinalRating(reviewId: number) {
    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
    });

    if (
      review &&
      review.self_status === 'SUBMITTED' &&
      review.manager_status === 'SUBMITTED' &&
      review.admin_status === 'SUBMITTED' &&
      review.self_avg_rating &&
      review.manager_avg_rating &&
      review.admin_avg_rating
    ) {
      const sum =
        Number(review.self_avg_rating) +
        Number(review.manager_avg_rating) +
        Number(review.admin_avg_rating);
      const finalRating = Math.round((sum / 3) * 10) / 10;

      await this.prisma.perf_reviews.update({
        where: { review_id: reviewId },
        data: {
          final_rating: finalRating,
          is_locked: true,
          updated_at: new Date(),
        },
      });

      if (this.createNotificationUseCase) {
        try {
          const cycle = await this.prisma.perf_cycles.findUnique({
            where: { cycle_id: review.cycle_id },
            select: { cycle_name: true },
          });

          await this.createNotificationUseCase.execute({
            recipient_id: review.emp_id,
            kind: 'perf_review_completed',
            title: 'Evaluation Completed',
            body: `Your official performance review for ${cycle?.cycle_name || 'Evaluation Cycle'} has been finalized. Final Rating: ${finalRating} ★.`,
            entity_type: 'perf_review',
            entity_id: reviewId,
          });
        } catch {}
      }
    }
  }

  /**
   * Reopen Review (Admin only)
   */
  async reopenReview(reviewId: number, dto: ReopenReviewDto, user: RequestUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can reopen a locked review');
    }

    const review = await this.prisma.perf_reviews.findUnique({
      where: { review_id: reviewId },
      include: { perf_cycles: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.perf_reviews.update({
      where: { review_id: reviewId },
      data: {
        is_locked: false,
        self_status: 'REOPENED',
        reopened_reason: dto.reason.trim(),
        reopened_at: new Date(),
        reopened_by: this.getEmpId(user),
        updated_at: new Date(),
      },
    });

    if (this.createNotificationUseCase) {
      try {
        const cycleName = review.perf_cycles?.cycle_name || 'Evaluation Cycle';
        await this.createNotificationUseCase.execute({
          recipient_id: review.emp_id,
          kind: 'perf_review_reopened',
          title: 'Review Reopened',
          body: `Your performance review for ${cycleName} has been reopened by Administrator. Reason: ${dto.reason.trim()}`,
          entity_type: 'perf_review',
          entity_id: reviewId,
          created_by: this.getEmpId(user),
        });
      } catch {}
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // PROJECT RATINGS (Screen 8 - Project Manager)
  // ---------------------------------------------------------------------------
  async listProjectRatings(cycleId: number, projectId?: number, user?: RequestUser) {
    const where: any = { cycle_id: Number(cycleId) };
    if (projectId) where.project_id = Number(projectId);

    // If PM, restrict to projects they manage (unless Admin)
    if (user && !this.isAdmin(user)) {
      where.project_manager_id = this.getEmpId(user);
    }

    return this.prisma.perf_project_ratings.findMany({
      where,
      include: {
        projects: { select: { project_id: true, project_name: true } },
        employees_perf_project_ratings_emp_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
        employees_perf_project_ratings_project_manager_idToemployees: {
          select: { emp_id: true, name: true },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });
  }

  async submitProjectRating(dto: SubmitProjectRatingDto, user: RequestUser) {
    const pmId = this.getEmpId(user);

    // Verify project exists and caller is PM or Admin
    const project = await this.prisma.projects.findUnique({
      where: { project_id: dto.project_id },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (project.project_manager_id !== pmId && !this.isAdmin(user)) {
      throw new ForbiddenException('Only the Project Manager of this project or Admin can submit project ratings');
    }

    return this.prisma.perf_project_ratings.upsert({
      where: {
        cycle_id_project_id_emp_id: {
          cycle_id: dto.cycle_id,
          project_id: dto.project_id,
          emp_id: dto.emp_id,
        },
      },
      create: {
        cycle_id: dto.cycle_id,
        project_id: dto.project_id,
        emp_id: dto.emp_id,
        project_manager_id: pmId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      update: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async getMyProjects(user: RequestUser) {
    const empId = this.getEmpId(user);
    const isAdmin = this.isAdmin(user);

    return this.prisma.projects.findMany({
      where: isAdmin ? {} : { project_manager_id: empId },
      select: {
        project_id: true,
        project_no: true,
        project_name: true,
        project_manager_id: true,
        employees_projects_project_manager_idToemployees: {
          select: { emp_id: true, name: true },
        },
      },
      orderBy: { project_name: 'asc' },
    });
  }

  async getProjectMembersForRating(projectId: number, cycleId: number, user: RequestUser) {
    const empId = this.getEmpId(user);
    const isAdmin = this.isAdmin(user);

    const project = await this.prisma.projects.findUnique({
      where: { project_id: projectId },
      include: {
        employees_projects_project_manager_idToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (!isAdmin && project.project_manager_id !== empId) {
      throw new ForbiddenException('Only the assigned Project Manager or Admin can rate project members');
    }

    const members = await this.prisma.project_members.findMany({
      where: { project_id: projectId },
      include: {
        employees_project_members_employee_idToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
    });

    const existingRatings = await this.prisma.perf_project_ratings.findMany({
      where: { project_id: projectId, cycle_id: cycleId },
    });

    const ratingMap = new Map<number, any>();
    for (const r of existingRatings) {
      ratingMap.set(r.emp_id, r);
    }

    return {
      project: {
        project_id: project.project_id,
        project_name: project.project_name,
        project_no: project.project_no,
        project_manager: project.employees_projects_project_manager_idToemployees,
      },
      members: members.map((m) => {
        const er = ratingMap.get(m.employee_id);
        return {
          member_id: m.member_id,
          emp_id: m.employee_id,
          name: m.employees_project_members_employee_idToemployees?.name || 'Member',
          email: m.employees_project_members_employee_idToemployees?.email,
          role_in_project: m.role_in_project || 'Member',
          rating: er?.rating || 0,
          comment: er?.comment || '',
          submitted_at: er?.submitted_at || null,
        };
      }),
    };
  }

  async submitBulkProjectRatings(dto: SubmitBulkProjectRatingsDto, user: RequestUser) {
    const pmId = this.getEmpId(user);
    const isAdmin = this.isAdmin(user);

    const project = await this.prisma.projects.findUnique({
      where: { project_id: dto.project_id },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.project_manager_id !== pmId && !isAdmin) {
      throw new ForbiddenException('Only the Project Manager of this project or Admin can submit project ratings');
    }

    const results: any[] = [];
    for (const item of dto.ratings) {
      if (item.rating >= 1 && item.rating <= 5) {
        const upserted = await this.prisma.perf_project_ratings.upsert({
          where: {
            cycle_id_project_id_emp_id: {
              cycle_id: dto.cycle_id,
              project_id: dto.project_id,
              emp_id: item.emp_id,
            },
          },
          create: {
            cycle_id: dto.cycle_id,
            project_id: dto.project_id,
            emp_id: item.emp_id,
            project_manager_id: pmId,
            rating: item.rating,
            comment: item.comment?.trim() || null,
          },
          update: {
            rating: item.rating,
            comment: item.comment?.trim() || null,
            submitted_at: new Date(),
            updated_at: new Date(),
          },
        });
        results.push(upserted);
      }
    }

    if (results.length > 0 && this.createNotificationUseCase) {
      try {
        const notifs = results.map((res) => ({
          recipient_id: res.emp_id,
          kind: 'perf_project_rated',
          title: 'Project Performance Rated',
          body: `You received a project performance rating (${res.rating} ★) for ${project.project_name || 'your project'}.`,
          entity_type: 'project',
          entity_id: dto.project_id,
          created_by: pmId,
        }));
        await this.createNotificationUseCase.executeMany(notifs);
      } catch {}
    }

    return results;
  }
}

