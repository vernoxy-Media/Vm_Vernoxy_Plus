import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreatePerfCycleDto, QueryPerfCyclesDto, UpdatePerfCycleDto } from '../../presentation/dto/performance.dto';
import { CycleType, cycleDates, cycleStatus, daysLeft, toDateStr, todayStr } from '../../domain/perf-rules';
import { perfError } from './performance-access.service';

const CYCLE_EXISTS = 'This cycle already exists. Please choose a different year, quarter or month.';

/** Cycle Master (BFD Sections 2, 3 and 7, Screens 1–2). */
@Injectable()
export class PerformanceCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Preview of what the system fills in (Screen 2, right panel). */
  preview(type: CycleType, year: number, quarter?: number, month?: number) {
    const d = this.dates(type, year, quarter, month);
    return {
      cycle_name: d.name,
      start_date: d.start,
      end_date: d.end,
      review_start_date: d.reviewStart,
      review_end_date: d.reviewEnd,
      status: cycleStatus(d.reviewStart, d.reviewEnd),
    };
  }

  async listCycles(query: QueryPerfCyclesDto) {
    const where: any = {};
    if (query.cycle_type) where.cycle_type = String(query.cycle_type).toUpperCase();
    if (query.year) where.year = Number(query.year);
    if (query.search?.trim()) where.cycle_name = { contains: query.search.trim(), mode: 'insensitive' };
    const rows = await this.prisma.perf_cycles.findMany({
      where,
      orderBy: [{ start_date: 'desc' }, { cycle_type: 'asc' }],
      include: { _count: { select: { perf_forms: true, perf_reviews: true } } },
    });
    const today = todayStr();
    return rows
      .map((c) => this.present(c, today))
      .filter((c) => !query.status || c.status === String(query.status).toUpperCase());
  }

  async getCycleById(cycleId: number) {
    const c = await this.prisma.perf_cycles.findUnique({
      where: { cycle_id: cycleId },
      include: { _count: { select: { perf_forms: true, perf_reviews: true } } },
    });
    if (!c) throw perfError('Cycle not found.', 'cycle_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return this.present(c, todayStr());
  }

  async createCycle(dto: CreatePerfCycleDto, userId: number) {
    const { quarter, month } = this.periodParts(dto);
    const d = this.dates(dto.cycle_type, dto.year, quarter, month);
    await this.assertUnique(dto.cycle_type, dto.year, quarter, month);
    try {
      const created = await this.prisma.perf_cycles.create({
        data: {
          cycle_name: d.name,
          cycle_type: dto.cycle_type,
          year: dto.year,
          quarter,
          month,
          start_date: new Date(d.start),
          end_date: new Date(d.end),
          review_start_date: new Date(d.reviewStart),
          review_end_date: new Date(d.reviewEnd),
          status: cycleStatus(d.reviewStart, d.reviewEnd),
          created_by: userId,
        },
      });
      return this.present({ ...created, _count: { perf_forms: 0, perf_reviews: 0 } }, todayStr());
    } catch (e: any) {
      if (e?.code === 'P2002') throw perfError(CYCLE_EXISTS, 'cycle_type', HttpStatus.CONFLICT, 'CYCLE_EXISTS');
      throw e;
    }
  }

  /** Edit is allowed only before the review window opens (Screen 1). Admin can change the type or period. */
  async updateCycle(cycleId: number, dto: UpdatePerfCycleDto, userId: number) {
    const c = await this.prisma.perf_cycles.findUnique({ where: { cycle_id: cycleId } });
    if (!c) throw perfError('Cycle not found.', 'cycle_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.assertNotOpened(c);
    const type = (dto.cycle_type ?? c.cycle_type) as CycleType;
    const year = dto.year ?? c.year;
    const { quarter, month } = this.periodParts({
      cycle_type: type,
      quarter: dto.quarter ?? c.quarter ?? undefined,
      month: dto.month ?? c.month ?? undefined,
    });
    const d = this.dates(type, year, quarter, month);
    if (cycleStatus(d.reviewStart, d.reviewEnd) !== 'UPCOMING') {
      throw perfError('The review window for this period has already opened. Please choose a later period.', 'year');
    }
    await this.assertUnique(type, year, quarter, month, cycleId);
    const updated = await this.prisma.perf_cycles.update({
      where: { cycle_id: cycleId },
      data: {
        cycle_name: d.name,
        cycle_type: type,
        year,
        quarter,
        month,
        start_date: new Date(d.start),
        end_date: new Date(d.end),
        review_start_date: new Date(d.reviewStart),
        review_end_date: new Date(d.reviewEnd),
        status: 'UPCOMING',
        updated_at: new Date(),
        updated_by: userId,
      },
      include: { _count: { select: { perf_forms: true, perf_reviews: true } } },
    });
    return this.present(updated, todayStr());
  }

  async deleteCycle(cycleId: number) {
    const c = await this.prisma.perf_cycles.findUnique({
      where: { cycle_id: cycleId },
      include: { _count: { select: { perf_reviews: true } } },
    });
    if (!c) throw perfError('Cycle not found.', 'cycle_id', HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.assertNotOpened(c);
    if (c._count.perf_reviews > 0) throw perfError('This cycle already has reviews and cannot be deleted.');
    await this.prisma.perf_cycles.delete({ where: { cycle_id: cycleId } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------

  present(c: any, today: string) {
    const status = cycleStatus(c.review_start_date, c.review_end_date, today);
    return {
      cycle_id: c.cycle_id,
      cycle_name: c.cycle_name,
      name: c.cycle_name,
      cycle_type: c.cycle_type,
      year: c.year,
      quarter: c.quarter,
      month: c.month,
      start_date: toDateStr(c.start_date),
      end_date: toDateStr(c.end_date),
      review_start_date: toDateStr(c.review_start_date),
      review_end_date: toDateStr(c.review_end_date),
      status,
      days_left: status === 'REVIEW_OPEN' ? daysLeft(c.review_end_date, today) : null,
      can_edit: status === 'UPCOMING',
      forms_count: c._count?.perf_forms ?? 0,
      reviews_count: c._count?.perf_reviews ?? 0,
      created_at: c.created_at,
    };
  }

  private dates(type: CycleType, year: number, quarter?: number | null, month?: number | null) {
    try {
      return cycleDates(type, year, quarter, month);
    } catch (e: any) {
      if (e?.message === 'QUARTER_REQUIRED') throw perfError('Please select the Quarter.', 'quarter');
      if (e?.message === 'MONTH_REQUIRED') throw perfError('Please select the Month.', 'month');
      throw perfError('Please select the Cycle Type.', 'cycle_type');
    }
  }

  /** Yearly keeps only Year; Quarterly keeps Quarter; Monthly keeps Month (Screen 2). */
  private periodParts(dto: { cycle_type: string; quarter?: number | null; month?: number | null }) {
    return {
      quarter: dto.cycle_type === 'QUARTERLY' ? (dto.quarter ?? null) : null,
      month: dto.cycle_type === 'MONTHLY' ? (dto.month ?? null) : null,
    };
  }

  private async assertUnique(type: string, year: number, quarter: number | null, month: number | null, exceptId?: number) {
    const existing = await this.prisma.perf_cycles.findFirst({
      where: { cycle_type: type, year, quarter, month, ...(exceptId ? { NOT: { cycle_id: exceptId } } : {}) },
      select: { cycle_id: true },
    });
    if (existing) throw perfError(CYCLE_EXISTS, 'cycle_type', HttpStatus.CONFLICT, 'CYCLE_EXISTS');
  }

  private assertNotOpened(c: { review_start_date: Date }) {
    if (todayStr() >= toDateStr(c.review_start_date)) {
      throw perfError('This cycle is already open for review and cannot be changed.');
    }
  }
}
