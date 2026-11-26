import { Controller, Get, Param, ParseIntPipe, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Response } from 'express';
import { COMPANY_CALL_SORTS, CompanyCallSort } from '../../domain/services/company-call-report.service';
import { OUTCOMES } from '../../domain/services/activity-validator.service';
import { OUTCOME_NOT_RECORDED } from '../../application/use-cases/sales-report.use-cases';
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

  @ApiPropertyOptional({ example: '3', description: '"all" or a campaign id: only the leads of the companies in that campaign' })
  @IsOptional() @Matches(/^(all|[1-9]\d{0,8})$/, { message: 'campaign_id must be "all" or a campaign id' }) campaign_id?: string;
}

export class SalesReportCallsQueryDto extends SalesReportQueryDto {
  @ApiProperty({ enum: [...OUTCOMES, OUTCOME_NOT_RECORDED] })
  @IsIn([...OUTCOMES, OUTCOME_NOT_RECORDED], { message: 'Choose a call outcome from the list.' }) outcome!: string;
}

export class CompanyCallsQueryDto extends SalesReportQueryDto {
  @ApiPropertyOptional({ description: 'Company name or contact person' }) @IsOptional() @IsString() @MaxLength(200) q?: string;

  @ApiPropertyOptional({ enum: COMPANY_CALL_SORTS }) @IsOptional() @IsIn([...COMPANY_CALL_SORTS]) sort?: CompanyCallSort;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
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

  @Get('received-calls')
  @ApiOperation({ summary: 'The received calls behind one outcome of the report, ordered by company. Takes the same filters as the summary.' })
  async receivedCalls(@Query() query: SalesReportCallsQueryDto, @CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.reports.receivedCalls(query, query.outcome, actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get('company-calls')
  @ApiOperation({ summary: 'One row per company with at least one received call, with search and sorting. Takes the same filters as the summary.' })
  async companyCalls(@Query() query: CompanyCallsQueryDto, @CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.reports.companyCalls(query, query, actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get('company-calls/export')
  @ApiOperation({ summary: 'The company-wise report as an Excel file, with the same filters, search and sorting' })
  async exportCompanyCalls(@Query() query: CompanyCallsQueryDto, @CurrentSalesActor() actor: SalesActor, @Res({ passthrough: true }) res: Response) {
    try {
      const file = await this.reports.exportCompanyCalls(query, query, actor);
      res.set({ 'Content-Type': file.contentType, 'Content-Disposition': `attachment; filename="${file.filename}"`, 'Cache-Control': 'no-store' });
      return new StreamableFile(file.buffer);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get('company-calls/:companyId/history')
  @ApiOperation({ summary: "A company's call history under the report filters. A Sales User only sees their own calls." })
  async companyCallHistory(@Param('companyId', ParseIntPipe) companyId: number, @Query() query: SalesReportQueryDto, @CurrentSalesActor() actor: SalesActor) {
    try {
      return await this.reports.companyCallHistory(query, companyId, actor);
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }
}
