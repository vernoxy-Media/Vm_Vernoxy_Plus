import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { LicenseReportsService } from '../../application/services/license-reports.service';

@ApiTags('Software License Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('licenses/reports')
export class LicenseReportsController {
  constructor(private readonly reportsService: LicenseReportsService) {}

  @Get('register')
  @ApiOperation({ summary: 'Software Register report' })
  async getRegister() {
    return this.reportsService.getSoftwareRegisterReport();
  }

  @Get('renewals')
  @ApiOperation({ summary: 'Upcoming renewals report' })
  async getRenewals(@Query('days') days?: string) {
    return this.reportsService.getUpcomingRenewalsReport(days ? parseInt(days, 10) : 60);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Assignments by employee report' })
  async getAssignments(
    @Query('empId') empId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.reportsService.getAssignmentsByEmployeeReport(
      empId ? parseInt(empId, 10) : undefined,
      departmentId ? parseInt(departmentId, 10) : undefined,
    );
  }

  @Get('seat-utilization')
  @ApiOperation({ summary: 'Seat utilization and wastage report' })
  async getSeatUtilization() {
    return this.reportsService.getSeatUtilizationReport();
  }

  @Get('cost-breakdown')
  @ApiOperation({ summary: 'Cost breakdown by category and vendor' })
  async getCostBreakdown() {
    return this.reportsService.getCostBreakdownReport();
  }

  @Get('expired-discontinued')
  @ApiOperation({ summary: 'Expired and discontinued software report' })
  async getExpiredAndDiscontinued() {
    return this.reportsService.getExpiredAndDiscontinuedReport();
  }

  @Get('activity-logs')
  @ApiOperation({ summary: 'Audit and activity history report' })
  async getActivityLogs(@Query('limit') limit?: string) {
    return this.reportsService.getActivityLogsReport(limit ? parseInt(limit, 10) : 100);
  }
}

