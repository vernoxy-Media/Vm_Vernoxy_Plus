import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import { ConvertToLeadBodyDto, LeadBoardQueryDto, LeadFiltersQueryDto, ListLeadsQueryDto } from '../dto/sales-lead.dto';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { LeadByParam, LeadQuery, ListLeadsUseCase, GetLeadBoardUseCase } from '../../application/use-cases/list-leads.use-case';
import { GetLeadUseCase, GetLeadMastersUseCase } from '../../application/use-cases/get-lead.use-case';
import { GetLeadFormUseCase } from '../../application/use-cases/get-lead-form.use-case';
import { ConvertCompanyToLeadUseCase } from '../../application/use-cases/convert-company-to-lead.use-case';
import { StatusFilter } from '../../application/ports/sales-lead.repository.port';

export function toQuery(dto: LeadFiltersQueryDto): LeadQuery {
  const { lead_by, status, ...rest } = dto;
  const leadBy: LeadByParam | undefined = lead_by === undefined ? undefined : /^\d+$/.test(lead_by) ? Number(lead_by) : (lead_by as 'me' | 'all');
  return { ...rest, status: status as StatusFilter | undefined, lead_by: leadBy };
}

/** Leads: List view, Kanban view, Lead Details (BFD section 6, Parts 3 to 5). */
@ApiTags('Sales - Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/leads')
export class SalesLeadController {
  constructor(
    private readonly listUseCase: ListLeadsUseCase,
    private readonly boardUseCase: GetLeadBoardUseCase,
    private readonly getUseCase: GetLeadUseCase,
    private readonly mastersUseCase: GetLeadMastersUseCase,
  ) {}

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Leads List view: filters, sort (next follow-up first), 10 per page, status counters and follow-ups due today',
  })
  list(@Query() query: ListLeadsQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return this.run(() => this.listUseCase.execute({ ...toQuery(query), page: query.page, limit: query.limit }, actor));
  }

  @Get('board')
  @ApiOperation({ summary: 'Leads Kanban view: one column per status (New, Contacted, Qualified, On Hold, Converted, Lost)' })
  board(@Query() query: LeadBoardQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return this.run(() => this.boardUseCase.execute({ ...toQuery(query), per_column: query.per_column }, actor));
  }

  @Get('masters')
  @ApiOperation({ summary: 'Statuses, Lead Sources, Service Fits, Lost reasons and the users a lead can be given to' })
  masters() {
    return this.run(() => this.mastersUseCase.execute());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lead Details header, summary and counts' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.run(() => this.getUseCase.execute(id));
  }
}

/** The "Convert to Lead" popup (BFD section 6, Part 1). */
@ApiTags('Sales - Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/companies')
export class SalesConvertToLeadController {
  constructor(
    private readonly formUseCase: GetLeadFormUseCase,
    private readonly convertUseCase: ConvertCompanyToLeadUseCase,
  ) {}

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw mapSalesErrorToHttpException(err);
    }
  }

  @Get(':id/lead-form')
  @ApiOperation({ summary: 'Data for the Convert to Lead popup: company strip, defaults and dropdown values' })
  form(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return this.run(() => this.formUseCase.execute(id, actor));
  }

  @Post(':id/convert-to-lead')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Convert a company to a lead (status New). 409 OPEN_LEAD_EXISTS carries the existing lead in errors[0].lead.',
  })
  convert(@Param('id', ParseIntPipe) id: number, @Body() body: ConvertToLeadBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return this.run(() =>
      this.convertUseCase.execute({
        company_id: id,
        lead_source: body.lead_source,
        lead_by_id: body.lead_by_id,
        service_fit: body.service_fit,
        first_note: body.first_note,
        actor,
      }),
    );
  }
}
