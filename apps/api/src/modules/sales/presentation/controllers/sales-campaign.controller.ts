import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import { FieldValidationError } from '../../domain/errors/sales.errors';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { AssignInput, CampaignUseCases } from '../../application/use-cases/campaign.use-cases';
import {
  AddCompaniesBodyDto,
  AssignBodyDto,
  CampaignBodyDto,
  CompanySearchQueryDto,
  ListCampaignCompaniesQueryDto,
  ListCampaignsQueryDto,
  LogCampaignCallBodyDto,
  RemoveCompaniesBodyDto,
  TargetsBodyDto,
} from '../dto/sales-campaign.dto';

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw mapSalesErrorToHttpException(err);
  }
}

/** Campaign Management: the Admin builds and assigns campaigns, every Sales user works the companies given to them. */
@ApiTags('Sales - Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales/campaigns')
export class SalesCampaignController {
  constructor(private readonly campaigns: CampaignUseCases) {}

  // The fixed paths come before ':id' so that "masters" and "my" are not read as a campaign id.

  @Get('masters')
  @ApiOperation({ summary: 'Lists for the campaign form and filters: industries, categories, states, cities, Sales employees, not-received reasons' })
  masters(@CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.masters(actor));
  }

  @Get('my/dashboard')
  @ApiOperation({ summary: 'The signed-in Sales user: KPI cards and the My Campaigns table (Active campaigns are counted, Draft ones are hidden)' })
  myDashboard(@CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.myDashboard(actor));
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Admin: campaign performance KPIs and the employee-wise performance table' })
  overview(@CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.adminOverview(actor));
  }

  @Get('company-search')
  @ApiOperation({ summary: 'Admin: search the Company Database to choose companies for a campaign. Pass campaign_id to see which ones are already in it.' })
  search(@Query() q: CompanySearchQueryDto, @CurrentSalesActor() actor: SalesActor) {
    const { page, limit, campaign_id, ...filter } = q;
    return run(() => this.campaigns.searchCompanies(filter, campaign_id ?? null, page, limit, actor));
  }

  @Get()
  @ApiOperation({ summary: 'Campaign list. The Admin sees all; a Sales user sees the campaigns they have companies in.' })
  list(@Query() q: ListCampaignsQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.list(q, actor));
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create a campaign' })
  create(@Body() body: CampaignBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.create(body, actor));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One campaign. The Admin also gets every employee\'s workload; a Sales user gets their own numbers.' })
  get(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.get(id, actor));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: edit a campaign or change its status (Draft, Active, Paused, Completed)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: CampaignBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.update(id, body, actor));
  }

  @Get(':id/companies')
  @ApiOperation({ summary: 'The companies of a campaign with their calling status. A Sales user only sees the ones assigned to them.' })
  companies(@Param('id', ParseIntPipe) id: number, @Query() q: ListCampaignCompaniesQueryDto, @CurrentSalesActor() actor: SalesActor) {
    const assigned_to = q.assigned_to === undefined || q.assigned_to === 'me' || q.assigned_to === 'unassigned' ? q.assigned_to : Number(q.assigned_to);
    return run(() => this.campaigns.listCompanies(id, { ...q, assigned_to }, actor));
  }

  @Post(':id/companies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: add companies from the Company Database, either the ticked ones or all that match a filter. Companies already in the campaign are skipped.' })
  addCompanies(@Param('id', ParseIntPipe) id: number, @Body() body: AddCompaniesBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.addCompanies(id, body, actor));
  }

  @Post(':id/companies/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: take companies out of a campaign. A company that was already called stays, so the call history is kept.' })
  removeCompanies(@Param('id', ParseIntPipe) id: number, @Body() body: RemoveCompaniesBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.removeCompanies(id, body.campaign_company_ids, actor));
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: assign or reassign companies. manual = the chosen companies to one employee; equal = share evenly between employees.' })
  assign(@Param('id', ParseIntPipe) id: number, @Body() body: AssignBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.assign(id, this.toAssignInput(body), actor));
  }

  @Get(':id/workload')
  @ApiOperation({ summary: 'Admin: every Sales employee\'s assigned companies, calls and daily target in this campaign, and how many companies are unassigned' })
  workload(@Param('id', ParseIntPipe) id: number, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.workload(id, actor));
  }

  @Put(':id/targets')
  @ApiOperation({ summary: 'Admin: set the daily call target of each employee in this campaign' })
  targets(@Param('id', ParseIntPipe) id: number, @Body() body: TargetsBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.campaigns.setTargets(id, body.targets, actor));
  }

  @Get(':id/companies/:campaignCompanyId/calls')
  @ApiOperation({ summary: 'The calls made to one company in this campaign' })
  calls(
    @Param('id', ParseIntPipe) id: number,
    @Param('campaignCompanyId', ParseIntPipe) campaignCompanyId: number,
    @CurrentSalesActor() actor: SalesActor,
  ) {
    return run(() => this.campaigns.calls(id, campaignCompanyId, actor));
  }

  @Post(':id/companies/:campaignCompanyId/calls')
  @ApiOperation({
    summary:
      'Log a call to a company. It is saved in the campaign and in the company\'s own history, and the company\'s calling status moves on - all or nothing.',
  })
  logCall(
    @Param('id', ParseIntPipe) id: number,
    @Param('campaignCompanyId', ParseIntPipe) campaignCompanyId: number,
    @Body() body: LogCampaignCallBodyDto,
    @CurrentSalesActor() actor: SalesActor,
  ) {
    return run(() => this.campaigns.logCall(id, campaignCompanyId, body, actor));
  }

  private toAssignInput(b: AssignBodyDto): AssignInput {
    if (b.mode === 'manual') {
      if (!b.campaign_company_ids || b.campaign_company_ids.length === 0) {
        throw mapSalesErrorToHttpException(new FieldValidationError([{ field: 'campaign_company_ids', message: 'Choose at least one company.' }]));
      }
      if (b.emp_id === undefined) {
        throw mapSalesErrorToHttpException(new FieldValidationError([{ field: 'emp_id', message: 'Choose an employee.' }]));
      }
      return { mode: 'manual', campaign_company_ids: b.campaign_company_ids, emp_id: b.emp_id };
    }
    if (!b.emp_ids || b.emp_ids.length === 0) {
      throw mapSalesErrorToHttpException(new FieldValidationError([{ field: 'emp_ids', message: 'Choose at least one employee.' }]));
    }
    return { mode: 'equal', emp_ids: b.emp_ids, campaign_company_ids: b.campaign_company_ids };
  }
}
