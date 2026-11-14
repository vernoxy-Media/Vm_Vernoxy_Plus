import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { LicenseReportsService, ReportFilters, ReportScope } from '../../application/services/license-reports.service';
import { LicenseAccessService } from '../../application/services/license-access.service';
import { LicenseSettingsService } from '../../application/services/license-settings.service';

const int = (v?: string) => (v && /^\d+$/.test(v) ? parseInt(v, 10) : undefined);
const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined);

/**
 * BFD 12 License Reports. "Who sees what": Admin, License Managers and Accounts see every report;
 * a Software Owner sees the reports for the software they own; a Reporting Manager sees
 * Assignments by Employee for their team only, without costs; employees see no reports.
 */
@ApiTags('Software License Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('licenses/reports')
export class LicenseReportsController {
  constructor(
    private readonly reportsService: LicenseReportsService,
    private readonly access: LicenseAccessService,
    private readonly settings: LicenseSettingsService,
  ) {}

  private async scope(req: any, report: string): Promise<ReportScope> {
    const v = await this.access.viewer(Number(req.user?.emp_id));
    if (this.access.canViewAll(v)) return {};
    if (report === 'assignments' && v.isReportingManager && !v.isOwner) return { teamOf: v.empId, hideCosts: true };
    if (v.isOwner) return { ownerId: v.empId };
    if (report === 'assignments' && v.isReportingManager) return { teamOf: v.empId, hideCosts: true };
    throw new ForbiddenException('You do not have access to this report.');
  }

  private filters(q: Record<string, string | undefined>): ReportFilters {
    return {
      category_id: int(q.category_id),
      vendor_id: int(q.vendor_id),
      owner_id: int(q.owner_id),
      department_id: int(q.department_id ?? q.departmentId),
      emp_id: int(q.emp_id ?? q.empId),
      software_id: int(q.software_id),
      performed_by: int(q.performed_by),
      status: q.status || undefined,
      event: q.event || undefined,
      from: date(q.from),
      to: date(q.to),
      days: int(q.days),
      limit: int(q.limit),
    };
  }

  @Get('register')
  @ApiOperation({ summary: 'Software Register report' })
  async getRegister(@Req() req: any, @Query() q: Record<string, string>) {
    return this.reportsService.getSoftwareRegisterReport(await this.scope(req, 'register'), this.filters(q));
  }

  @Get('renewals')
  @ApiOperation({ summary: 'Upcoming renewals report (next 30, 60 or 90 days, or a date range)' })
  async getRenewals(@Req() req: any, @Query() q: Record<string, string>) {
    return this.reportsService.getUpcomingRenewalsReport(await this.scope(req, 'renewals'), this.filters(q));
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Assignments by employee, current and past' })
  async getAssignments(@Req() req: any, @Query() q: Record<string, string>) {
    return this.reportsService.getAssignmentsByEmployeeReport(await this.scope(req, 'assignments'), {
      ...this.filters(q),
      include_past: q.include_past !== 'false',
    });
  }

  @Get('seat-utilization')
  @ApiOperation({ summary: 'Seat Use: free, free 90+ days, cost of free seats' })
  async getSeatUtilization(@Req() req: any, @Query() q: Record<string, string>) {
    const s = await this.settings.getSettings();
    return this.reportsService.getSeatUtilizationReport(await this.scope(req, 'seats'), this.filters(q), s.unused_seat_flag_days ?? 90);
  }

  @Get('cost-breakdown')
  @ApiOperation({ summary: 'Yearly cost by category, vendor and department; one-time purchases' })
  async getCostBreakdown(@Req() req: any, @Query() q: Record<string, string>) {
    return this.reportsService.getCostBreakdownReport(await this.scope(req, 'cost'), this.filters(q));
  }

  @Get('expired-discontinued')
  @ApiOperation({ summary: 'Expired and discontinued software' })
  async getExpiredAndDiscontinued(@Req() req: any, @Query() q: Record<string, string>) {
    return this.reportsService.getExpiredAndDiscontinuedReport(await this.scope(req, 'expired'), this.filters(q));
  }

  @Get('activity-logs')
  @ApiOperation({ summary: 'History Log of every software in a date range' })
  async getActivityLogs(@Req() req: any, @Query() q: Record<string, string>) {
    return this.reportsService.getActivityLogsReport(await this.scope(req, 'history'), this.filters(q));
  }
}
