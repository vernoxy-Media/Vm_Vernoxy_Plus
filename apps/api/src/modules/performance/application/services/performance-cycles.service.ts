import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreatePerfCycleDto,
  PerfCycleType,
  PerfCycleStatus,
  QueryPerfCyclesDto,
  UpdatePerfCycleDto,
} from '../../presentation/dto/performance.dto';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Injectable()
export class PerformanceCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to calculate start, end and review window dates per BFD Section 2
   */
  calculateCycleDates(type: PerfCycleType, year: number, quarter?: number, month?: number) {
    let startDate: Date;
    let endDate: Date;
    let reviewStartDate: Date;
    let reviewEndDate: Date;
    let defaultName: string;

    if (type === PerfCycleType.YEARLY) {
      startDate = new Date(Date.UTC(year, 0, 1));
      endDate = new Date(Date.UTC(year, 11, 31));
      reviewStartDate = new Date(Date.UTC(year + 1, 0, 1));
      reviewEndDate = new Date(Date.UTC(year + 1, 0, 10));
      defaultName = `${year} Yearly Review`;
    } else if (type === PerfCycleType.QUARTERLY) {
      if (!quarter || quarter < 1 || quarter > 4) {
        throw new BadRequestException('Quarter (1-4) is required for Quarterly cycle');
      }
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 2;
      startDate = new Date(Date.UTC(year, startMonth, 1));
      // Last day of endMonth
      const lastDay = new Date(Date.UTC(year, endMonth + 1, 0)).getUTCDate();
      endDate = new Date(Date.UTC(year, endMonth, lastDay));

      if (quarter === 4) {
        reviewStartDate = new Date(Date.UTC(year + 1, 0, 1));
        reviewEndDate = new Date(Date.UTC(year + 1, 0, 10));
      } else {
        reviewStartDate = new Date(Date.UTC(year, endMonth + 1, 1));
        reviewEndDate = new Date(Date.UTC(year, endMonth + 1, 10));
      }
      defaultName = `Q${quarter} ${year} Review (${MONTH_NAMES[startMonth].slice(0, 3)} - ${MONTH_NAMES[endMonth].slice(0, 3)})`;
    } else if (type === PerfCycleType.MONTHLY) {
      if (!month || month < 1 || month > 12) {
        throw new BadRequestException('Month (1-12) is required for Monthly cycle');
      }
      startDate = new Date(Date.UTC(year, month - 1, 1));
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      endDate = new Date(Date.UTC(year, month - 1, lastDay));

      if (month === 12) {
        reviewStartDate = new Date(Date.UTC(year + 1, 0, 1));
        reviewEndDate = new Date(Date.UTC(year + 1, 0, 10));
      } else {
        reviewStartDate = new Date(Date.UTC(year, month, 1));
        reviewEndDate = new Date(Date.UTC(year, month, 10));
      }
      defaultName = `${MONTH_NAMES[month - 1]} ${year} Review`;
    } else {
      throw new BadRequestException('Invalid cycle type');
    }

    // Determine initial status based on current date
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const revStartStr = reviewStartDate.toISOString().slice(0, 10);
    const revEndStr = reviewEndDate.toISOString().slice(0, 10);

    let status = PerfCycleStatus.UPCOMING;
    if (todayStr >= revStartStr && todayStr <= revEndStr) {
      status = PerfCycleStatus.REVIEW_OPEN;
    } else if (todayStr > revEndStr) {
      status = PerfCycleStatus.CLOSED;
    }

    return {
      startDate,
      endDate,
      reviewStartDate,
      reviewEndDate,
      defaultName,
      status,
    };
  }

  async listCycles(query: QueryPerfCyclesDto) {
    const where: any = {};

    if (query.cycle_type) {
      where.cycle_type = query.cycle_type;
    }
    if (query.year) {
      where.year = Number(query.year);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search?.trim()) {
      where.cycle_name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const cycles = await this.prisma.perf_cycles.findMany({
      where,
      orderBy: [{ year: 'desc' }, { start_date: 'desc' }],
      include: {
        _count: {
          select: {
            perf_forms: true,
            perf_reviews: true,
          },
        },
      },
    });

    return cycles.map((c) => ({
      ...c,
      name: c.cycle_name,
      forms_count: c._count.perf_forms,
      reviews_count: c._count.perf_reviews,
    }));
  }

  async getCycleById(cycleId: number) {
    const cycle = await this.prisma.perf_cycles.findUnique({
      where: { cycle_id: cycleId },
      include: {
        perf_forms: true,
        _count: {
          select: {
            perf_reviews: true,
            perf_project_ratings: true,
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Performance cycle #${cycleId} not found`);
    }

    return {
      ...cycle,
      name: cycle.cycle_name,
      reviews_count: cycle._count.perf_reviews,
      project_ratings_count: cycle._count.perf_project_ratings,
    };
  }

  async createCycle(dto: CreatePerfCycleDto, userId?: number) {
    const { startDate, endDate, reviewStartDate: defRevStart, reviewEndDate: defRevEnd, defaultName } =
      this.calculateCycleDates(dto.cycle_type, dto.year, dto.quarter, dto.month);

    // Check duplicate cycle
    const existing = await this.prisma.perf_cycles.findFirst({
      where: {
        cycle_type: dto.cycle_type,
        year: dto.year,
        quarter: dto.quarter ?? null,
        month: dto.month ?? null,
      },
    });

    if (existing) {
      throw new ConflictException('This cycle already exists. Please choose a different year, quarter or month.');
    }

    const cycleName = dto.cycle_name?.trim() || defaultName;

    const finalRevStart = dto.review_start_date ? new Date(dto.review_start_date) : defRevStart;
    const finalRevEnd = dto.review_end_date ? new Date(dto.review_end_date) : defRevEnd;

    if (finalRevStart > finalRevEnd) {
      throw new BadRequestException('Review Window start date cannot be after end date.');
    }

    // Determine status from the configured review window
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const revStartStr = finalRevStart.toISOString().slice(0, 10);
    const revEndStr = finalRevEnd.toISOString().slice(0, 10);

    let status = PerfCycleStatus.UPCOMING;
    if (todayStr >= revStartStr && todayStr <= revEndStr) {
      status = PerfCycleStatus.REVIEW_OPEN;
    } else if (todayStr > revEndStr) {
      status = PerfCycleStatus.CLOSED;
    }

    const created = await this.prisma.perf_cycles.create({
      data: {
        cycle_name: cycleName,
        cycle_type: dto.cycle_type,
        year: dto.year,
        quarter: dto.quarter ?? null,
        month: dto.month ?? null,
        start_date: startDate,
        end_date: endDate,
        review_start_date: finalRevStart,
        review_end_date: finalRevEnd,
        status,
        created_by: userId ?? null,
      },
    });

    return created;
  }

  async updateCycle(cycleId: number, dto: UpdatePerfCycleDto, userId?: number) {
    const cycle = await this.prisma.perf_cycles.findUnique({
      where: { cycle_id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException(`Performance cycle #${cycleId} not found`);
    }

    const updateData: any = {
      updated_at: new Date(),
      updated_by: userId ?? null,
    };

    if (dto.cycle_name?.trim()) {
      updateData.cycle_name = dto.cycle_name.trim();
    }
    if (dto.review_start_date) {
      updateData.review_start_date = new Date(dto.review_start_date);
    }
    if (dto.review_end_date) {
      updateData.review_end_date = new Date(dto.review_end_date);
    }
    if (updateData.review_start_date && updateData.review_end_date) {
      if (updateData.review_start_date > updateData.review_end_date) {
        throw new BadRequestException('Review Window start date cannot be after end date.');
      }
    } else if (updateData.review_start_date && cycle.review_end_date) {
      if (updateData.review_start_date > cycle.review_end_date) {
        throw new BadRequestException('Review Window start date cannot be after end date.');
      }
    } else if (updateData.review_end_date && cycle.review_start_date) {
      if (cycle.review_start_date > updateData.review_end_date) {
        throw new BadRequestException('Review Window start date cannot be after end date.');
      }
    }

    if (dto.status) {
      updateData.status = dto.status;
    }

    return this.prisma.perf_cycles.update({
      where: { cycle_id: cycleId },
      data: updateData,
    });
  }

  async deleteCycle(cycleId: number) {
    const cycle = await this.prisma.perf_cycles.findUnique({
      where: { cycle_id: cycleId },
      include: {
        _count: { select: { perf_reviews: true } },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Performance cycle #${cycleId} not found`);
    }

    if (cycle._count.perf_reviews > 0) {
      throw new BadRequestException('Cannot delete cycle with submitted reviews');
    }

    await this.prisma.perf_cycles.delete({
      where: { cycle_id: cycleId },
    });

    return { success: true, message: `Cycle #${cycleId} deleted successfully` };
  }
}

