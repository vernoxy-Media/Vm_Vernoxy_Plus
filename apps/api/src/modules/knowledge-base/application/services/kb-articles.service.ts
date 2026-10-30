import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ArchiveKbArticleDto,
  CreateKbArticleDto,
  DirectPublishKbArticleDto,
  KbFeedbackDto,
  QueryKbArticlesDto,
  ReviewKbArticleDto,
  SubmitKbArticleDto,
  UpdateKbArticleDraftDto,
} from '../../presentation/dto/kb-articles.dto';

interface RequestUser {
  emp_id?: number;
  sub?: number;
  email: string;
  role_id?: number;
  role_name?: string;
  dep_id?: number;
  department_id?: number;
  access?: {
    can_manage_organization?: boolean;
    [key: string]: any;
  };
}

@Injectable()
export class KbArticlesService {
  constructor(private readonly prisma: PrismaService) { }

  private getEmpId(user: RequestUser): number {
    return Number(user?.emp_id || user?.sub || 1);
  }

  private getDepId(user: RequestUser): number | undefined {
    return user?.dep_id || user?.department_id;
  }

  private isAdmin(user: RequestUser): boolean {
    if (user?.role_name?.toLowerCase().includes('admin') || user?.emp_id === 1) return true;
    return Boolean(user.access?.can_manage_organization);
  }

  /**
   * KPI Dashboard statistics
   */
  async getKpiStats(user: RequestUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [publishedCount, inReviewCount, openDraftsCount, reviewDueCount, overdueAckCount] =
      await Promise.all([
        // 1. Published articles
        this.prisma.kb_articles.count({
          where: {
            is_archived: false,
            current_published_version_id: { not: null },
          },
        }),
        // 2. Pending approvals
        this.prisma.kb_article_versions.count({
          where: { status: 'IN_REVIEW' },
        }),
        // 3. Open drafts
        this.isAdmin(user)
          ? this.prisma.kb_article_versions.count({ where: { status: 'DRAFT' } })
          : this.prisma.kb_article_versions.count({
            where: {
              status: 'DRAFT',
              created_by: this.getEmpId(user),
            },
          }),
        // 4. Articles due for review
        this.prisma.kb_articles.count({
          where: {
            is_archived: false,
            next_review_date: { lte: today },
          },
        }),
        // 5. Overdue acknowledgements for current employee
        this.prisma.kb_acknowledgements.count({
          where: {
            emp_id: this.getEmpId(user),
            status: { in: ['PENDING', 'OVERDUE'] },
            due_date: { lt: today },
          },
        }),
      ]);

    return {
      published_articles: publishedCount,
      pending_approvals: inReviewCount,
      open_drafts: openDraftsCount,
      review_due: reviewDueCount,
      overdue_acknowledgements: overdueAckCount,
    };
  }

  /**
   * List articles with filtering, search, pagination, and audience awareness
   */
  async listArticles(query: QueryKbArticlesDto, user: RequestUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Space filter
    if (query.space) {
      where.space = query.space;
    } else {
      where.space = 'INTERNAL';
    }

    // Category filter
    if (query.category_id) {
      where.category_id = Number(query.category_id);
    }

    // Mine filter
    if (query.mine) {
      where.owner_emp_id = this.getEmpId(user);
    }

    // Archive / Status filter
    if (query.status === 'ARCHIVED') {
      where.is_archived = true;
    } else {
      where.is_archived = false;

      if (query.status === 'REVIEW_DUE') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.next_review_date = { lte: today };
      } else if (query.status === 'PUBLISHED') {
        where.current_published_version_id = { not: null };
      } else if (query.status === 'DRAFT') {
        where.kb_article_versions_kb_article_versions_article_idTokb_articles = {
          some: { status: 'DRAFT' },
        };
      } else if (query.status === 'IN_REVIEW') {
        where.kb_article_versions_kb_article_versions_article_idTokb_articles = {
          some: { status: 'IN_REVIEW' },
        };
      }
    }

    // Acknowledgement only filter
    if (query.ack_only) {
      where.ack_required = true;
    }

    // Search query
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { article_code: { contains: term, mode: 'insensitive' } },
        {
          kb_article_versions_kb_article_versions_article_idTokb_articles: {
            some: {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { summary: { contains: term, mode: 'insensitive' } },
                { content: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    // Audience filtering for non-admins (for INTERNAL space)
    if (!this.isAdmin(user) && where.space === 'INTERNAL') {
      const audienceConditions: any[] = [
        { audience_scope: 'ALL' },
        { owner_emp_id: this.getEmpId(user) },
        { created_by: this.getEmpId(user) },
      ];

        const depId = this.getDepId(user);
        if (depId) {
          audienceConditions.push({
            audience_departments: { has: depId },
          });
        }
        if (user.role_id) {
          audienceConditions.push({
            audience_roles: { has: user.role_id },
          });
        }
        audienceConditions.push({
          audience_employees: { has: this.getEmpId(user) },
        });

        where.AND = [
          ...(where.AND || []),
          { OR: audienceConditions },
        ];
      }

      const [total, articles] = await Promise.all([
        this.prisma.kb_articles.count({ where }),
        this.prisma.kb_articles.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ is_pinned: 'desc' }, { updated_at: 'desc' }, { created_at: 'desc' }],
          include: {
            kb_categories: {
              select: {
                category_id: true,
                name: true,
                icon: true,
                space: true,
              },
            },
            employees_kb_articles_owner_emp_idToemployees: {
              select: {
                emp_id: true,
                name: true,
                email: true,
              },
            },
            kb_article_versions_kb_articles_current_published_version_idTokb_article_versions: {
              select: {
                version_id: true,
                version_number: true,
                title: true,
                summary: true,
                status: true,
                effective_from: true,
                published_at: true,
                tags: true,
              },
            },
            kb_article_versions_kb_article_versions_article_idTokb_articles: {
              where: {
                status: { in: ['DRAFT', 'IN_REVIEW'] },
              },
              take: 1,
              orderBy: { version_number: 'desc' },
              select: {
                version_id: true,
                version_number: true,
                title: true,
                summary: true,
                status: true,
                change_type: true,
                change_summary: true,
                created_by: true,
                submitted_at: true,
              },
            },
            kb_acknowledgements: {
              where: { emp_id: this.getEmpId(user) },
              take: 1,
              select: {
                status: true,
                due_date: true,
                acknowledged_at: true,
              },
            },
          },
        }),
      ]);

      const formattedArticles = articles.map((art: any) => {
        const live = art.kb_article_versions_kb_articles_current_published_version_idTokb_article_versions;
        const pendingVersion = art.kb_article_versions_kb_article_versions_article_idTokb_articles[0];
        const ack = art.kb_acknowledgements[0];

        return {
          article_id: art.article_id,
          article_code: art.article_code,
          space: art.space,
          category: art.kb_categories,
          owner: art.employees_kb_articles_owner_emp_idToemployees,
          content_type: art.content_type,
          is_pinned: art.is_pinned,
          is_archived: art.is_archived,
          ack_required: art.ack_required,
          ack_due_days: art.ack_due_days,
          next_review_date: art.next_review_date,
          views_count: art.views_count,
          downloads_count: art.downloads_count,
          created_at: art.created_at,
          updated_at: art.updated_at,
          title: live?.title || pendingVersion?.title || 'Untitled Article',
          summary: live?.summary || pendingVersion?.summary || '',
          live_version: live
            ? {
              version_id: live.version_id,
              version_number: live.version_number,
              effective_from: live.effective_from,
              published_at: live.published_at,
              tags: live.tags,
            }
            : null,
          pending_version: pendingVersion
            ? {
              version_id: pendingVersion.version_id,
              version_number: pendingVersion.version_number,
              status: pendingVersion.status,
              change_type: pendingVersion.change_type,
              change_summary: pendingVersion.change_summary,
            }
            : null,
          display_status: art.is_archived
            ? 'ARCHIVED'
            : pendingVersion
              ? `v${pendingVersion.version_number} ${pendingVersion.status}`
              : live
                ? 'PUBLISHED'
                : 'DRAFT',
          user_acknowledgement: ack
            ? {
              status: ack.status,
              due_date: ack.due_date,
              acknowledged_at: ack.acknowledged_at,
            }
            : null,
        };
      });

      return {
        data: formattedArticles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

  /**
   * Get single article details by ID or Article Code
   */
  async getArticleByIdOrCode(identifier: string | number, user: RequestUser) {
      const isNumeric = !isNaN(Number(identifier));
      const whereClause: any = isNumeric
        ? { article_id: Number(identifier) }
        : { article_code: String(identifier).toUpperCase() };

      const article = await this.prisma.kb_articles.findFirst({
        where: whereClause,
        include: {
          kb_categories: true,
          employees_kb_articles_owner_emp_idToemployees: {
            select: { emp_id: true, name: true, email: true },
          },
          kb_article_versions_kb_articles_current_published_version_idTokb_article_versions: true,
          kb_article_versions_kb_article_versions_article_idTokb_articles: {
            where: { status: { in: ['DRAFT', 'IN_REVIEW'] } },
            take: 1,
            orderBy: { version_number: 'desc' },
          },
        },
      });

      if (!article) {
        throw new NotFoundException('Article not found');
      }

      // Audience Check
      if (!this.isAdmin(user) && article.space === 'INTERNAL') {
        const empId = this.getEmpId(user);
        const depId = this.getDepId(user);
        const allowed =
          article.audience_scope === 'ALL' ||
        article.owner_emp_id === empId ||
          article.created_by === empId ||
          (Boolean(depId) && article.audience_departments.includes(depId as number)) ||
          (Boolean(user.role_id) && article.audience_roles.includes(user.role_id as number)) ||
          article.audience_employees.includes(empId);

        if (!allowed) {
          throw new ForbiddenException('You do not have permission to view this article');
        }
      }

      const liveVersion = article.kb_article_versions_kb_articles_current_published_version_idTokb_article_versions;
      const pendingVersion = article.kb_article_versions_kb_article_versions_article_idTokb_articles[0];

      const primaryVersion = liveVersion || pendingVersion;

      let attachments: any[] = [];
      if (primaryVersion) {
        attachments = await this.prisma.attachments.findMany({
          where: {
            entity_type: 'KB_ARTICLE_VERSION',
            entity_id: primaryVersion.version_id,
            deleted_at: null,
          },
          orderBy: { display_order: 'asc' },
          select: {
            attachment_id: true,
            file_name: true,
            file_url: true,
            file_size_bytes: true,
            mime_type: true,
          },
        });
      }

      let userAck = null;
      if (article.ack_required && liveVersion) {
        userAck = await this.prisma.kb_acknowledgements.findUnique({
          where: {
            version_id_emp_id: {
              version_id: liveVersion.version_id,
              emp_id: this.getEmpId(user),
            },
          },
        });
      }

      let userFeedback = null;
      if (liveVersion) {
        userFeedback = await this.prisma.kb_feedback.findFirst({
          where: {
            version_id: liveVersion.version_id,
            emp_id: this.getEmpId(user),
          },
        });
      }

      let relatedArticles: any[] = [];
      if (primaryVersion?.related_article_ids?.length) {
        relatedArticles = await this.prisma.kb_articles.findMany({
          where: {
            article_id: { in: primaryVersion.related_article_ids },
            is_archived: false,
          },
          select: {
            article_id: true,
            article_code: true,
            kb_article_versions_kb_articles_current_published_version_idTokb_article_versions: {
              select: { title: true, summary: true },
            },
          },
        });
      }

      return {
        article_id: article.article_id,
        article_code: article.article_code,
        space: article.space,
        category: article.kb_categories,
        owner: article.employees_kb_articles_owner_emp_idToemployees,
        content_type: article.content_type,
        review_cycle_months: article.review_cycle_months,
        next_review_date: article.next_review_date,
        last_reviewed_at: article.last_reviewed_at,
        ack_required: article.ack_required,
        ack_due_days: article.ack_due_days,
        audience_scope: article.audience_scope,
        audience_departments: article.audience_departments,
        audience_roles: article.audience_roles,
        audience_employees: article.audience_employees,
        audience_companies: article.audience_companies,
        audience_projects: article.audience_projects,
        is_pinned: article.is_pinned,
        is_archived: article.is_archived,
        archived_at: article.archived_at,
        archive_reason: article.archive_reason,
        views_count: article.views_count,
        downloads_count: article.downloads_count,
        live_version: liveVersion,
        pending_version: pendingVersion,
        current_display_version: primaryVersion,
        attachments,
        user_acknowledgement: userAck,
        user_feedback: userFeedback,
        related_articles: relatedArticles.map((ra: any) => ({
          article_id: ra.article_id,
          article_code: ra.article_code,
          title:
            ra.kb_article_versions_kb_articles_current_published_version_idTokb_article_versions?.title ||
            'Article',
          summary:
            ra.kb_article_versions_kb_articles_current_published_version_idTokb_article_versions?.summary ||
            '',
        })),
      };
    }

  /**
   * Create a new article with initial v1 Draft
   */
  async createArticle(dto: CreateKbArticleDto, user: RequestUser) {
      const category = await this.prisma.kb_categories.findUnique({
        where: { category_id: dto.category_id },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      if (category.space !== dto.space) {
        throw new BadRequestException('Category space does not match requested space');
      }

      const counterResult: any[] = await this.prisma.$queryRawUnsafe(`
      INSERT INTO entity_counters (entity_type, counter_key, last_number)
      VALUES ('KB_ARTICLE', 'GLOBAL', 1)
      ON CONFLICT (entity_type, counter_key)
      DO UPDATE SET last_number = entity_counters.last_number + 1
      RETURNING last_number;
    `);

      const nextNum = Number(counterResult[0]?.last_number || 1);
      const articleCode = `KB-${String(nextNum).padStart(4, '0')}`;

      const ownerId = dto.owner_emp_id || category.default_owner_id || this.getEmpId(user);
      const ackRequired =
        dto.ack_required !== undefined ? dto.ack_required : category.default_ack_required;
      const reviewCycleMonths =
        dto.review_cycle_months !== undefined
          ? dto.review_cycle_months
          : category.default_review_cycle_months;

      const effectiveDate = dto.effective_from ? new Date(dto.effective_from) : null;

      const article = await this.prisma.kb_articles.create({
        data: {
          article_code: articleCode,
          space: dto.space,
          category_id: dto.category_id,
          owner_emp_id: ownerId,
          content_type: dto.content_type || 'WRITTEN',
          review_cycle_months: reviewCycleMonths,
          ack_required: ackRequired,
          ack_due_days: dto.ack_due_days || 7,
          audience_scope: dto.audience_scope || category.default_audience_scope,
          audience_departments: dto.audience_departments || category.default_audience_departments,
          audience_roles: dto.audience_roles || category.default_audience_roles,
          audience_employees: dto.audience_employees || category.default_audience_employees,
          audience_companies: dto.audience_companies || category.default_audience_companies,
          audience_projects: dto.audience_projects || category.default_audience_projects,
          created_by: this.getEmpId(user),
        },
      });

      const version = await this.prisma.kb_article_versions.create({
        data: {
          article_id: article.article_id,
          version_number: 1,
          status: 'DRAFT',
          title: dto.title,
          summary: dto.summary,
          content: dto.content || '',
          video_url: dto.video_url || null,
          effective_from: effectiveDate,
          tags: dto.tags || [],
          related_article_ids: dto.related_article_ids || [],
          created_by: this.getEmpId(user),
        },
      });

      if (dto.attachments && dto.attachments.length > 0) {
        for (let i = 0; i < dto.attachments.length; i++) {
          const att = dto.attachments[i];
          await this.prisma.attachments.create({
            data: {
              entity_type: 'KB_ARTICLE_VERSION',
              entity_id: version.version_id,
              file_name: att.file_name,
              file_url: att.file_url,
              file_size_bytes: BigInt(att.file_size_bytes),
              mime_type: att.mime_type,
              display_order: i + 1,
              created_by: this.getEmpId(user),
            },
          });
        }
      }

      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'KB_ARTICLE',
          entity_id: article.article_id,
          event: 'CREATED',
          summary: `Created draft v1 for "${dto.title}" (${articleCode})`,
          performed_by: this.getEmpId(user),
        },
      });

      return {
        article_id: article.article_id,
        article_code: article.article_code,
        version_id: version.version_id,
        version_number: version.version_number,
        status: version.status,
      };
    }

  /**
   * Update article content / draft.
   */
  async updateArticleDraft(articleId: number, dto: UpdateKbArticleDraftDto, user: RequestUser) {
      const article = await this.prisma.kb_articles.findUnique({
        where: { article_id: articleId },
        include: {
          kb_article_versions_kb_article_versions_article_idTokb_articles: {
            orderBy: { version_number: 'desc' },
            take: 1,
          },
        },
      });

      if (!article) {
        throw new NotFoundException('Article not found');
      }

      const latestVersion =
        article.kb_article_versions_kb_article_versions_article_idTokb_articles[0];

      const articleUpdateData: any = {};
      if (dto.category_id) articleUpdateData.category_id = dto.category_id;
      if (dto.owner_emp_id) articleUpdateData.owner_emp_id = dto.owner_emp_id;
      if (dto.content_type) articleUpdateData.content_type = dto.content_type;
      if (dto.review_cycle_months !== undefined)
        articleUpdateData.review_cycle_months = dto.review_cycle_months;
      if (dto.ack_required !== undefined) articleUpdateData.ack_required = dto.ack_required;
      if (dto.ack_due_days !== undefined) articleUpdateData.ack_due_days = dto.ack_due_days;
      if (dto.audience_scope) articleUpdateData.audience_scope = dto.audience_scope;
      if (dto.audience_departments)
        articleUpdateData.audience_departments = dto.audience_departments;
      if (dto.audience_roles) articleUpdateData.audience_roles = dto.audience_roles;
      if (dto.audience_employees) articleUpdateData.audience_employees = dto.audience_employees;
      if (dto.audience_companies) articleUpdateData.audience_companies = dto.audience_companies;
      if (dto.audience_projects) articleUpdateData.audience_projects = dto.audience_projects;

      if (Object.keys(articleUpdateData).length > 0) {
        await this.prisma.kb_articles.update({
          where: { article_id: articleId },
          data: {
            ...articleUpdateData,
            updated_at: new Date(),
            updated_by: this.getEmpId(user),
          },
        });
      }

      let targetVersionId: number;

      if (latestVersion && latestVersion.status === 'DRAFT') {
        const updateData: any = {};
        if (dto.title) updateData.title = dto.title;
        if (dto.summary) updateData.summary = dto.summary;
        if (dto.content !== undefined) updateData.content = dto.content;
        if (dto.video_url !== undefined) updateData.video_url = dto.video_url;
        if (dto.effective_from) updateData.effective_from = new Date(dto.effective_from);
        if (dto.tags) updateData.tags = dto.tags;
        if (dto.related_article_ids) updateData.related_article_ids = dto.related_article_ids;

        updateData.updated_at = new Date();
        updateData.updated_by = this.getEmpId(user);

        await this.prisma.kb_article_versions.update({
          where: { version_id: latestVersion.version_id },
          data: updateData,
        });
        targetVersionId = latestVersion.version_id;
      } else {
        const nextVersionNum = (latestVersion?.version_number || 0) + 1;
        const newVersion = await this.prisma.kb_article_versions.create({
          data: {
            article_id: articleId,
            version_number: nextVersionNum,
            status: 'DRAFT',
            title: dto.title || latestVersion?.title || 'Untitled',
            summary: dto.summary || latestVersion?.summary || '',
            content: dto.content !== undefined ? dto.content : latestVersion?.content || '',
            video_url: dto.video_url !== undefined ? dto.video_url : latestVersion?.video_url,
            effective_from: dto.effective_from
              ? new Date(dto.effective_from)
              : latestVersion?.effective_from,
            tags: dto.tags || latestVersion?.tags || [],
            related_article_ids: dto.related_article_ids || latestVersion?.related_article_ids || [],
            created_by: this.getEmpId(user),
          },
        });
        targetVersionId = newVersion.version_id;
      }

      if (dto.attachments) {
        await this.prisma.attachments.updateMany({
          where: {
            entity_type: 'KB_ARTICLE_VERSION',
            entity_id: targetVersionId,
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
            deleted_by: this.getEmpId(user),
          },
        });

        for (let i = 0; i < dto.attachments.length; i++) {
          const att = dto.attachments[i];
          await this.prisma.attachments.create({
            data: {
              entity_type: 'KB_ARTICLE_VERSION',
              entity_id: targetVersionId,
              file_name: att.file_name,
              file_url: att.file_url,
              file_size_bytes: BigInt(att.file_size_bytes),
              mime_type: att.mime_type,
              display_order: i + 1,
              created_by: this.getEmpId(user),
            },
          });
        }
      }

      return {
        article_id: articleId,
        version_id: targetVersionId,
        message: 'Draft updated successfully',
      };
    }

  /**
   * Submit draft for approval
   */
  async submitForApproval(articleId: number, dto: SubmitKbArticleDto, user: RequestUser) {
      const draft = await this.prisma.kb_article_versions.findFirst({
        where: {
          article_id: articleId,
          status: 'DRAFT',
        },
        orderBy: { version_number: 'desc' },
      });

      if (!draft) {
        throw new BadRequestException('No draft version found to submit');
      }

      await this.prisma.kb_article_versions.update({
        where: { version_id: draft.version_id },
        data: {
          status: 'IN_REVIEW',
          change_type: dto.change_type,
          change_summary: dto.change_summary,
          submitted_at: new Date(),
          submitted_by: this.getEmpId(user),
        },
      });

      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'KB_ARTICLE',
          entity_id: articleId,
          event: 'SUBMITTED',
          summary: `Submitted v${draft.version_number} for review (${dto.change_type}: ${dto.change_summary})`,
          performed_by: this.getEmpId(user),
        },
      });

      return {
        message: `Version v${draft.version_number} submitted for review`,
        version_id: draft.version_id,
      };
    }

  /**
   * Withdraw submission back to DRAFT
   */
  async withdrawSubmission(articleId: number, user: RequestUser) {
      const inReview = await this.prisma.kb_article_versions.findFirst({
        where: {
          article_id: articleId,
          status: 'IN_REVIEW',
        },
        orderBy: { version_number: 'desc' },
      });

      if (!inReview) {
        throw new BadRequestException('No version currently in review to withdraw');
      }

      await this.prisma.kb_article_versions.update({
        where: { version_id: inReview.version_id },
        data: {
          status: 'DRAFT',
          submitted_at: null,
        },
      });

      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'KB_ARTICLE',
          entity_id: articleId,
          event: 'WITHDRAWN',
          summary: `Withdrew version v${inReview.version_number} back to Draft`,
          performed_by: this.getEmpId(user),
        },
      });

      return { message: 'Version withdrawn to Draft' };
    }

  /**
   * Review approval decision (Approve / Reject) by Admin
   */
  async reviewVersion(
      articleId: number,
      versionId: number,
      dto: ReviewKbArticleDto,
      user: RequestUser,
    ) {
      if (!this.isAdmin(user)) {
        throw new ForbiddenException('Only administrators can approve or reject articles');
      }

      const version = await this.prisma.kb_article_versions.findUnique({
        where: { version_id: versionId },
        include: {
          kb_articles_kb_article_versions_article_idTokb_articles: true,
        },
      });

      if (!version || version.article_id !== articleId) {
        throw new NotFoundException('Version not found for this article');
      }
      if (version.status !== 'IN_REVIEW') {
        throw new BadRequestException(`Version status is "${version.status}", cannot review`);
      }

      const article = version.kb_articles_kb_article_versions_article_idTokb_articles;

      if (dto.action === 'REJECT') {
        if (!dto.comment?.trim()) {
          throw new BadRequestException('Rejection requires a comment for the author');
        }

        await this.prisma.kb_article_versions.update({
          where: { version_id: versionId },
          data: {
            status: 'DRAFT',
            decided_at: new Date(),
            decided_by: this.getEmpId(user),
            decision_comment: dto.comment,
          },
        });

        await this.prisma.activity_logs.create({
          data: {
            entity_type: 'KB_ARTICLE',
            entity_id: articleId,
            event: 'REJECTED',
            summary: `Rejected v${version.version_number}: ${dto.comment}`,
            performed_by: this.getEmpId(user),
          },
        });

        return { message: 'Version rejected and returned to Draft' };
      }

      // APPROVE & PUBLISH
      const now = new Date();

      if (article.current_published_version_id) {
        await this.prisma.kb_article_versions.update({
          where: { version_id: article.current_published_version_id },
          data: {
            status: 'RETIRED',
          },
        });
      }

      await this.prisma.kb_article_versions.update({
        where: { version_id: versionId },
        data: {
          status: 'PUBLISHED',
          decided_at: now,
          decided_by: this.getEmpId(user),
          decision_comment: dto.comment || 'Approved',
          published_at: now,
          published_by: this.getEmpId(user),
        },
      });

      let nextReviewDate: Date | null = null;
      if (article.review_cycle_months) {
        nextReviewDate = new Date();
        nextReviewDate.setMonth(nextReviewDate.getMonth() + article.review_cycle_months);
      }

      await this.prisma.kb_articles.update({
        where: { article_id: articleId },
        data: {
          current_published_version_id: versionId,
          last_reviewed_at: now,
          last_reviewed_by: this.getEmpId(user),
          next_review_date: nextReviewDate,
          updated_at: now,
          updated_by: this.getEmpId(user),
        },
      });

      if (article.ack_required && article.space === 'INTERNAL') {
        await this.generateAcknowledgements(article, versionId);
      }

      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'KB_ARTICLE',
          entity_id: articleId,
          event: 'PUBLISHED',
          summary: `Approved and published v${version.version_number} (${article.article_code})`,
          performed_by: this.getEmpId(user),
        },
      });

      return { message: 'Article version published successfully' };
    }

  /**
   * Direct publish without review (Admin only)
   */
  async directPublish(articleId: number, dto: DirectPublishKbArticleDto, user: RequestUser) {
      if (!this.isAdmin(user)) {
        throw new ForbiddenException('Only administrators can publish articles directly');
      }

      const draft = await this.prisma.kb_article_versions.findFirst({
        where: {
          article_id: articleId,
          status: { in: ['DRAFT', 'IN_REVIEW'] },
        },
        orderBy: { version_number: 'desc' },
      });

      if (!draft) {
        throw new BadRequestException('No pending or draft version found to publish');
      }

      const now = new Date();
      const article = await this.prisma.kb_articles.findUnique({
        where: { article_id: articleId },
      });
      if (!article) throw new NotFoundException('Article not found');

      if (article.current_published_version_id) {
        await this.prisma.kb_article_versions.update({
          where: { version_id: article.current_published_version_id },
          data: { status: 'RETIRED' },
        });
      }

      await this.prisma.kb_article_versions.update({
        where: { version_id: draft.version_id },
        data: {
          status: 'PUBLISHED',
          change_type: dto.change_type || 'MINOR',
          change_summary: dto.change_summary || 'Directly published by administrator',
          decided_at: now,
          decided_by: this.getEmpId(user),
          decision_comment: dto.reason || 'Self-approved by administrator',
          is_self_approved: true,
          published_at: now,
          published_by: this.getEmpId(user),
        },
      });

      let nextReviewDate: Date | null = null;
      if (article.review_cycle_months) {
        nextReviewDate = new Date();
        nextReviewDate.setMonth(nextReviewDate.getMonth() + article.review_cycle_months);
      }

      await this.prisma.kb_articles.update({
        where: { article_id: articleId },
        data: {
          current_published_version_id: draft.version_id,
          last_reviewed_at: now,
          last_reviewed_by: this.getEmpId(user),
          next_review_date: nextReviewDate,
          updated_at: now,
          updated_by: this.getEmpId(user),
        },
      });

      if (article.ack_required && article.space === 'INTERNAL') {
        await this.generateAcknowledgements(article, draft.version_id);
      }

      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'KB_ARTICLE',
          entity_id: articleId,
          event: 'PUBLISHED',
          summary: `Directly published v${draft.version_number} (${dto.reason})`,
          performed_by: this.getEmpId(user),
        },
      });

      return { message: 'Article published directly' };
    }

  /**
   * Helper to generate policy acknowledgement records for audience employees
   */
  private async generateAcknowledgements(article: any, versionId: number) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (article.ack_due_days || 7));

    const empWhere: any = {};
    if (article.audience_scope !== 'ALL') {
      const orList: any[] = [];
      if (article.audience_departments?.length) {
        orList.push({ dep_id: { in: article.audience_departments } });
      }
      if (article.audience_roles?.length) {
        orList.push({ role_id: { in: article.audience_roles } });
      }
      if (article.audience_employees?.length) {
        orList.push({ emp_id: { in: article.audience_employees } });
      }
      if (orList.length > 0) {
        empWhere.OR = orList;
      }
    }

    const employees = await this.prisma.employees.findMany({
      where: empWhere,
      select: { emp_id: true },
    });

    for (const emp of employees) {
      await this.prisma.kb_acknowledgements.upsert({
        where: {
          version_id_emp_id: {
            version_id: versionId,
            emp_id: emp.emp_id,
          },
        },
        create: {
          article_id: article.article_id,
          version_id: versionId,
          emp_id: emp.emp_id,
          status: 'PENDING',
          due_date: dueDate,
        },
        update: {
          due_date: dueDate,
          status: 'PENDING',
        },
      });
    }
  }

  /**
   * Employee acknowledges policy ("I have read and understood")
   */
  async acknowledgeArticle(articleId: number, user: RequestUser) {
    const article = await this.prisma.kb_articles.findUnique({
      where: { article_id: articleId },
    });
    if (!article || !article.current_published_version_id) {
      throw new NotFoundException('Published article version not found');
    }

    const versionId = article.current_published_version_id;

    const ack = await this.prisma.kb_acknowledgements.upsert({
      where: {
        version_id_emp_id: {
          version_id: versionId,
          emp_id: this.getEmpId(user),
        },
      },
      create: {
        article_id: articleId,
        version_id: versionId,
        emp_id: this.getEmpId(user),
        status: 'ACKNOWLEDGED',
        due_date: new Date(),
        acknowledged_at: new Date(),
      },
      update: {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date(),
      },
    });

    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'KB_ARTICLE',
        entity_id: articleId,
        event: 'ACKNOWLEDGED',
        summary: `Acknowledged policy (${article.article_code})`,
        performed_by: this.getEmpId(user),
      },
    });

    return {
      message: 'Policy successfully acknowledged',
      acknowledged_at: ack.acknowledged_at,
    };
  }

  /**
   * Reader feedback: Was this helpful? Yes/No + optional comment
   */
  async submitFeedback(articleId: number, dto: KbFeedbackDto, user: RequestUser) {
    const article = await this.prisma.kb_articles.findUnique({
      where: { article_id: articleId },
    });
    if (!article || !article.current_published_version_id) {
      throw new NotFoundException('Article not found');
    }

    const versionId = article.current_published_version_id;

    const existing = await this.prisma.kb_feedback.findFirst({
      where: {
        article_id: articleId,
        version_id: versionId,
        emp_id: this.getEmpId(user),
      },
    });

    if (existing) {
      await this.prisma.kb_feedback.update({
        where: { feedback_id: existing.feedback_id },
        data: {
          is_helpful: dto.is_helpful,
          comment: dto.comment,
        },
      });
    } else {
      await this.prisma.kb_feedback.create({
        data: {
          article_id: articleId,
          version_id: versionId,
          is_helpful: dto.is_helpful,
          comment: dto.comment,
          emp_id: this.getEmpId(user),
        },
      });
    }

    return { message: 'Thank you for your feedback!' };
  }

  /**
   * Archive article
   */
  async archiveArticle(articleId: number, dto: ArchiveKbArticleDto, user: RequestUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can archive articles');
    }

    await this.prisma.kb_articles.update({
      where: { article_id: articleId },
      data: {
        is_archived: true,
        archived_at: new Date(),
        archived_by: this.getEmpId(user),
        archive_reason: dto.archive_reason,
        replacement_article_id: dto.replacement_article_id,
        is_pinned: false,
      },
    });

    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'KB_ARTICLE',
        entity_id: articleId,
        event: 'ARCHIVED',
        summary: `Archived article: ${dto.archive_reason}`,
        performed_by: this.getEmpId(user),
      },
    });

    return { message: 'Article archived successfully' };
  }

  /**
   * Restore archived article
   */
  async restoreArticle(articleId: number, user: RequestUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can restore archived articles');
    }

    await this.prisma.kb_articles.update({
      where: { article_id: articleId },
      data: {
        is_archived: false,
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      },
    });

    await this.prisma.activity_logs.create({
      data: {
        entity_type: 'KB_ARTICLE',
        entity_id: articleId,
        event: 'RESTORED',
        summary: 'Restored article from archive',
        performed_by: this.getEmpId(user),
      },
    });

    return { message: 'Article restored successfully' };
  }

  /**
   * List pending approvals
   */
  async listPendingApprovals(user: RequestUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only administrators can view approvals');
    }

    const pending = await this.prisma.kb_article_versions.findMany({
      where: { status: 'IN_REVIEW' },
      orderBy: { submitted_at: 'desc' },
      include: {
        kb_articles_kb_article_versions_article_idTokb_articles: {
          select: {
            article_id: true,
            article_code: true,
            space: true,
            ack_required: true,
            kb_categories: {
              select: { name: true, icon: true },
            },
          },
        },
        employees_kb_article_versions_submitted_byToemployees: {
          select: { emp_id: true, name: true, email: true },
        },
      },
    });

    return pending.map((v: any) => ({
      version_id: v.version_id,
      article_id: v.article_id,
      article_code: v.kb_articles_kb_article_versions_article_idTokb_articles.article_code,
      space: v.kb_articles_kb_article_versions_article_idTokb_articles.space,
      category_name: v.kb_articles_kb_article_versions_article_idTokb_articles.kb_categories.name,
      version_number: v.version_number,
      title: v.title,
      summary: v.summary,
      change_type: v.change_type,
      change_summary: v.change_summary,
      submitted_at: v.submitted_at,
      submitted_by: v.employees_kb_article_versions_submitted_byToemployees,
      ack_required: v.kb_articles_kb_article_versions_article_idTokb_articles.ack_required,
    }));
  }

  /**
   * Version history for an article
   */
  async getVersionHistory(articleId: number) {
    const versions = await this.prisma.kb_article_versions.findMany({
      where: { article_id: articleId },
      orderBy: { version_number: 'desc' },
      include: {
        employees_kb_article_versions_created_byToemployees: {
          select: { emp_id: true, name: true },
        },
        employees_kb_article_versions_decided_byToemployees: {
          select: { emp_id: true, name: true },
        },
        employees_kb_article_versions_published_byToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    return versions.map((v: any) => ({
      version_id: v.version_id,
      version_number: v.version_number,
      status: v.status,
      title: v.title,
      summary: v.summary,
      change_type: v.change_type,
      change_summary: v.change_summary,
      is_self_approved: v.is_self_approved,
      effective_from: v.effective_from,
      published_at: v.published_at,
      created_at: v.created_at,
      created_by: v.employees_kb_article_versions_created_byToemployees?.name,
      decided_by: v.employees_kb_article_versions_decided_byToemployees?.name,
      decision_comment: v.decision_comment,
    }));
  }

  /**
   * Increment view counter
   */
  async incrementView(articleId: number) {
    await this.prisma.kb_articles.update({
      where: { article_id: articleId },
      data: {
        views_count: { increment: 1 },
      },
    });
    return { success: true };
  }
}
