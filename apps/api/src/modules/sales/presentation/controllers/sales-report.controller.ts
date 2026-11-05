import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { SalesReportUseCases } from '../../application/use-cases/sales-report.use-cases';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class SalesReportQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'First day of the period (leads added on or after it)' })
  @IsOptional() @Matches(DAY, { message: 'from must be YYYY-MM-DD' }) from?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Last day of the period (leads added on or before it)' })
  @IsOptional() @Matches(DAY, { message: 'to must be YYYY-MM-DD' }) to?: string;

  @ApiPropertyOptional({ example: 'all', description: '"me", "all" or an employee id. Only the Admin can look at other people.' })
  @IsOptional() @Matches(/^(me|all|\d+)$/, { message: 'lead_by must be "me", "all" or an employee id' }) lead_by?: string;
}

/** Sales Reports: pipeline, conversion, sources, people and lost reasons. */
@ApiTags('Sales - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/reports')
export class SalesReportController {
  constructor(private readonly reports: SalesReportUseCases) {}

  @Get('summary')
  @ApiOperation({ summary: 'One report with the totals, the pipeline by status, source, person and service, the lost reasons and a six-month trend' })
  async summary(@Query() query: SalesReportQueryDto, @CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.reports.summary(query, actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }
}
