import {
  ConflictSalesError,
  FieldError,
  FieldValidationError,
  ForbiddenSalesError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';
import {
  CALLING_FILTERS,
  CampaignInput,
  CallingFilter,
  splitEqually,
  validateCampaign,
  validateCampaignCall,
} from '../../domain/services/campaign.service';
import { SalesActor } from '../ports/sales-access-policy.port';
import {
  CampaignCompanyFilter,
  CampaignListFilter,
  CampaignSummary,
  CampaignWrite,
  CompanySearchFilter,
  EmployeeCampaignStats,
  SalesCampaignRepositoryPort,
  UserPerformanceScope,
} from '../ports/sales-campaign.repository.port';

export interface ListCampaignsInput extends CampaignListFilter {
  page?: number;
  limit?: number;
}

export interface CampaignBody extends CampaignInput {}

export interface AddCompaniesInput {
  company_ids?: number[];
  filter?: CompanySearchFilter;
}

export type AssignInput =
  | { mode: 'manual'; campaign_company_ids: number[]; emp_id: number | null }
  | { mode: 'equal'; emp_ids: number[]; campaign_company_ids?: number[] };

export interface LogCallInput {
  call_status?: string;
  not_received_reason?: string;
  outcome?: string;
  what_discussed?: string;
  call_duration_seconds?: number;
  next_follow_up_on?: Date;
}

export interface WorkloadRow {
  emp_id: number;
  name: string;
  assigned: number;
  called: number;
  pending: number;
  call_attempts: number;
  connected: number;
  not_received: number;
  interested: number;
  follow_ups_due: number;
  meetings_scheduled: number;
  meetings_completed: number;
  daily_target: number;
  calls_today: number;
}

const clampPage = (page?: number) => Math.max(1, page ?? 1);
const clampLimit = (limit?: number, fallback = 10) => Math.min(100, Math.max(1, limit ?? fallback));

const nullIfBlank = (v: string | null | undefined) => (v === undefined || v === null || v.trim() === '' ? null : v.trim());

/** Campaign Management (calling). The Admin builds and assigns campaigns; every Sales user works the companies given to them. */
export class CampaignUseCases {
  constructor(private readonly repo: SalesCampaignRepositoryPort) {}

  // ------------------------------------------------------------ guards ----

  private requireAdmin(actor: SalesActor) {
    if (!actor.is_admin) throw new ForbiddenSalesError('Only the Admin can manage campaigns.');
  }

  private async mustFind(id: number): Promise<CampaignSummary> {
    const c = await this.repo.getCampaign(id);
    if (!c) throw new NotFoundSalesError('This campaign was not found.', 'CAMPAIGN_NOT_FOUND');
    return c;
  }

  // --------------------------------------------------------- campaigns ----

  async list(q: ListCampaignsInput, actor: SalesActor) {
    const page = clampPage(q.page);
    const limit = clampLimit(q.limit);
    const { page: _p, limit: _l, ...filter } = q;
    const { items, total } = await this.repo.listCampaigns(filter, page, limit, actor.is_admin ? null : actor.emp_id);
    return { items, total, page, limit };
  }

  async masters(actor: SalesActor) {
    const masters = await this.repo.getMasters();
    return {
      ...masters,
      can_manage: actor.is_admin,
    };
  }

  async create(body: CampaignBody, actor: SalesActor) {
    this.requireAdmin(actor);
    const errors = validateCampaign(body, { partial: false });
    if (errors.length) throw new FieldValidationError(errors);
    const id = await this.repo.createCampaign(this.toWrite(body), actor.emp_id);
    return this.mustFind(id);
  }

  async update(id: number, body: CampaignBody, actor: SalesActor) {
    this.requireAdmin(actor);
    const current = await this.mustFind(id);
    const errors = validateCampaign(body, { partial: true });
    // The date order depends on both dates, so check it against what is stored when only one of them is sent.
    const start = body.start_date ?? current.start_date;
    const end = body.end_date ?? current.end_date;
    if (!errors.some((e) => e.field === 'end_date') && (body.start_date !== undefined || body.end_date !== undefined) && end < start) {
      errors.push({ field: 'end_date', message: 'The end date cannot be before the start date.' });
    }
    if (errors.length) throw new FieldValidationError(errors);
    await this.repo.updateCampaign(id, this.toPartialWrite(body), actor.emp_id);
    return this.mustFind(id);
  }

  /** One campaign. The Admin also gets every employee's workload; a Sales user gets their own numbers. */
  async get(id: number, actor: SalesActor) {
    const campaign = await this.mustFind(id);
    if (actor.is_admin) {
      return { campaign, ...(await this.workloadRows(id)), unassigned_companies: await this.repo.unassignedCount(id) };
    }
    const mine = await this.repo.employeeStats({ campaign_id: id, emp_id: actor.emp_id });
    if (campaign.status === 'Draft' || mine.length === 0) {
      throw new NotFoundSalesError('This campaign was not found.', 'CAMPAIGN_NOT_FOUND');
    }
    return { campaign, mine: mine[0] };
  }

  private toWrite(b: CampaignBody): CampaignWrite {
    return {
      name: b.name!.trim(),
      campaign_type: b.campaign_type ?? 'Calling',
      target_cities: (b.target_cities ?? []).map((c) => c.trim()).filter(Boolean),
      target_state: nullIfBlank(b.target_state),
      industry_id: b.industry_id ?? null,
      start_date: b.start_date!,
      end_date: b.end_date!,
      objective: nullIfBlank(b.objective),
      description: nullIfBlank(b.description),
      status: b.status ?? 'Draft',
    };
  }

  private toPartialWrite(b: CampaignBody): Partial<CampaignWrite> {
    const w: Partial<CampaignWrite> = {};
    if (b.name !== undefined) w.name = (b.name ?? '').trim();
    if (b.campaign_type !== undefined && b.campaign_type !== null) w.campaign_type = b.campaign_type;
    if (b.target_cities !== undefined) w.target_cities = (b.target_cities ?? []).map((c) => c.trim()).filter(Boolean);
    if (b.target_state !== undefined) w.target_state = nullIfBlank(b.target_state);
    if (b.industry_id !== undefined) w.industry_id = b.industry_id;
    if (b.start_date !== undefined && b.start_date !== null) w.start_date = b.start_date;
    if (b.end_date !== undefined && b.end_date !== null) w.end_date = b.end_date;
    if (b.objective !== undefined) w.objective = nullIfBlank(b.objective);
    if (b.description !== undefined) w.description = nullIfBlank(b.description);
    if (b.status !== undefined && b.status !== null) w.status = b.status;
    return w;
  }

  // --------------------------------------------- choosing the companies ----

  async searchCompanies(filter: CompanySearchFilter, campaignId: number | null, page: number | undefined, limit: number | undefined, actor: SalesActor) {
    this.requireAdmin(actor);
    const p = clampPage(page);
    const l = clampLimit(limit, 20);
    const { items, total } = await this.repo.searchCompanies(filter, campaignId, p, l);
    return { items, total, page: p, limit: l };
  }

  async addCompanies(campaignId: number, body: AddCompaniesInput, actor: SalesActor) {
    this.requireAdmin(actor);
    const campaign = await this.mustFind(campaignId);
    if (campaign.status === 'Completed') throw new ConflictSalesError('This campaign is completed. Companies can no longer be added.', 'CAMPAIGN_COMPLETED');

    const ids = body.company_ids ?? [];
    if (ids.length === 0 && !body.filter) {
      throw new FieldValidationError([{ field: 'company_ids', message: 'Choose at least one company.' }]);
    }
    if (ids.length > 5000) throw new FieldValidationError([{ field: 'company_ids', message: 'Add up to 5000 companies at a time.' }]);
    return this.repo.addCompanies(campaignId, ids.length > 0 ? { company_ids: ids } : { filter: body.filter! }, actor.emp_id);
  }

  async removeCompanies(campaignId: number, campaignCompanyIds: number[], actor: SalesActor) {
    this.requireAdmin(actor);
    await this.mustFind(campaignId);
    if (campaignCompanyIds.length === 0) throw new FieldValidationError([{ field: 'campaign_company_ids', message: 'Choose at least one company.' }]);
    return this.repo.removeCompanies(campaignId, campaignCompanyIds, actor.emp_id);
  }

  // -------------------------------------------------------- assignment ----

  async listCompanies(
    campaignId: number,
    q: { assigned_to?: number | 'unassigned' | 'me'; calling?: string; q?: string; page?: number; limit?: number },
    actor: SalesActor,
  ) {
    const campaign = await this.mustFind(campaignId);
    const filter: CampaignCompanyFilter = { q: q.q };

    if (q.calling !== undefined) {
      if (!(CALLING_FILTERS as readonly string[]).includes(q.calling)) {
        throw new FieldValidationError([{ field: 'calling', message: `Choose one of: ${CALLING_FILTERS.join(', ')}.` }]);
      }
      filter.calling = q.calling as CallingFilter;
    }

    if (actor.is_admin) {
      filter.assigned_to = q.assigned_to === 'me' ? actor.emp_id : q.assigned_to;
    } else {
      // A Sales user only ever sees the companies given to them, and not before the campaign has started.
      if (campaign.status === 'Draft') throw new NotFoundSalesError('This campaign was not found.', 'CAMPAIGN_NOT_FOUND');
      filter.assigned_to = actor.emp_id;
    }

    const page = clampPage(q.page);
    const limit = clampLimit(q.limit, 20);
    const { items, total } = await this.repo.listCampaignCompanies(campaignId, filter, page, limit);
    return { items, total, page, limit };
  }

  async assign(campaignId: number, body: AssignInput, actor: SalesActor) {
    this.requireAdmin(actor);
    const campaign = await this.mustFind(campaignId);
    if (campaign.status === 'Completed') throw new ConflictSalesError('This campaign is completed. Companies can no longer be assigned.', 'CAMPAIGN_COMPLETED');

    if (body.mode === 'manual') {
      if (body.campaign_company_ids.length === 0) throw new FieldValidationError([{ field: 'campaign_company_ids', message: 'Choose at least one company.' }]);
      if (body.emp_id !== null) await this.mustBeEligible(body.emp_id, 'emp_id');
      const changed = await this.repo.assign(campaignId, [{ emp_id: body.emp_id, campaign_company_ids: body.campaign_company_ids }], actor.emp_id);
      return { assigned: changed };
    }

    const empIds = [...new Set(body.emp_ids)];
    if (empIds.length === 0) throw new FieldValidationError([{ field: 'emp_ids', message: 'Choose at least one employee.' }]);
    for (const id of empIds) await this.mustBeEligible(id, 'emp_ids');

    const ids = body.campaign_company_ids && body.campaign_company_ids.length > 0 ? body.campaign_company_ids : await this.repo.unassignedIds(campaignId);
    if (ids.length === 0) throw new ConflictSalesError('There are no companies to share out.', 'NOTHING_TO_ASSIGN');
    const plan = splitEqually(ids, empIds).map((p) => ({ emp_id: p.emp_id, campaign_company_ids: p.ids })).filter((p) => p.campaign_company_ids.length > 0);
    const changed = await this.repo.assign(campaignId, plan, actor.emp_id);
    return { assigned: changed };
  }

  async setTargets(campaignId: number, targets: { emp_id: number; daily_target: number }[], actor: SalesActor) {
    this.requireAdmin(actor);
    await this.mustFind(campaignId);
    const errors: FieldError[] = [];
    for (const t of targets) {
      if (!Number.isInteger(t.daily_target) || t.daily_target < 0 || t.daily_target > 1000) {
        errors.push({ field: 'daily_target', message: 'Enter a daily target between 0 and 1000.' });
        break;
      }
    }
    if (errors.length) throw new FieldValidationError(errors);
    for (const t of targets) await this.mustBeEligible(t.emp_id, 'targets');
    await this.repo.setTargets(campaignId, targets, actor.emp_id);
    return await this.workloadRows(campaignId);
  }

  async workload(campaignId: number, actor: SalesActor) {
    this.requireAdmin(actor);
    await this.mustFind(campaignId);
    return { ...(await this.workloadRows(campaignId)), unassigned_companies: await this.repo.unassignedCount(campaignId) };
  }

  private async mustBeEligible(empId: number, field: string) {
    if (!(await this.repo.isEligibleEmployee(empId))) {
      throw new FieldValidationError([{ field, message: 'Choose an active Sales employee.' }]);
    }
  }

  /**
   * Every Sales employee, with zeros for those who have nothing assigned yet, so the Admin can hand work to them.
   * Only people from the Sales department are listed. If companies are still held by someone who is not (for example an
   * Admin who was given some earlier), they are not listed but counted in `other_assigned`, so the Admin can move them.
   */
  private async workloadRows(campaignId: number): Promise<{ workload: WorkloadRow[]; other_assigned: number }> {
    const [masters, stats, targets] = await Promise.all([
      this.repo.getMasters(),
      this.repo.employeeStats({ campaign_id: campaignId }),
      this.repo.listTargets(campaignId),
    ]);
    const byEmp = new Map<number, EmployeeCampaignStats>(stats.map((s) => [s.emp_id, s]));
    const target = new Map(targets.map((t) => [t.emp_id, t.daily_target]));
    const names = new Map(masters.employees.map((e) => [e.emp_id, e.name]));
    const other_assigned = stats.filter((s) => !names.has(s.emp_id)).reduce((n, s) => n + s.assigned, 0);

    const workload = [...names.keys()]
      .map((emp_id): WorkloadRow => {
        const s = byEmp.get(emp_id);
        return {
          emp_id,
          name: s?.emp_name ?? names.get(emp_id) ?? `Employee ${emp_id}`,
          assigned: s?.assigned ?? 0,
          called: s?.called ?? 0,
          pending: s?.pending ?? 0,
          call_attempts: s?.call_attempts ?? 0,
          connected: s?.connected ?? 0,
          not_received: s?.not_received ?? 0,
          interested: s?.interested ?? 0,
          follow_ups_due: s?.follow_ups_due ?? 0,
          meetings_scheduled: s?.meetings_scheduled ?? 0,
          meetings_completed: s?.meetings_completed ?? 0,
          daily_target: target.get(emp_id) ?? s?.daily_target ?? 0,
          calls_today: s?.calls_today ?? 0,
        };
      })
      .sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name));

    return { workload, other_assigned };
  }

  // ----------------------------------------------------- calling work ----

  async logCall(campaignId: number, campaignCompanyId: number, body: LogCallInput, actor: SalesActor) {
    const ctx = await this.repo.getCampaignCompany(campaignId, campaignCompanyId);
    if (!ctx) throw new NotFoundSalesError('This company is not in the campaign.', 'CAMPAIGN_COMPANY_NOT_FOUND');
    if (!actor.is_admin && ctx.assigned_to !== actor.emp_id) {
      throw new ForbiddenSalesError('This company is assigned to someone else.');
    }
    if (ctx.campaign_status !== 'Active') {
      throw new ConflictSalesError(`This campaign is ${ctx.campaign_status.toLowerCase()}, so calls cannot be logged now.`, 'CAMPAIGN_NOT_ACTIVE');
    }

    const input = {
      call_status: body.call_status ?? null,
      not_received_reason: nullIfBlank(body.not_received_reason),
      outcome: nullIfBlank(body.outcome),
      what_discussed: nullIfBlank(body.what_discussed),
      call_duration_seconds: body.call_duration_seconds ?? null,
      next_follow_up_on: body.next_follow_up_on ?? null,
    };
    const errors = validateCampaignCall(input, new Date());
    if (errors.length) throw new FieldValidationError(errors);

    await this.repo.logCall({
      campaign_company_id: ctx.campaign_company_id,
      campaign_id: ctx.campaign_id,
      company_id: ctx.company_id,
      campaign_name: ctx.campaign_name,
      contact_person: ctx.contact_person,
      actor_emp_id: actor.emp_id,
      call_status: input.call_status!,
      not_received_reason: input.not_received_reason,
      outcome: input.outcome,
      what_discussed: input.what_discussed,
      call_duration_seconds: input.call_duration_seconds,
      next_follow_up_on: input.next_follow_up_on,
    });

    const [row, stats] = await Promise.all([
      this.repo.getCampaignCompanyRow(campaignId, campaignCompanyId),
      this.repo.employeeStats({ campaign_id: campaignId, emp_id: ctx.assigned_to ?? actor.emp_id }),
    ]);
    return { company: row, progress: stats[0] ?? null };
  }

  async calls(campaignId: number, campaignCompanyId: number, actor: SalesActor) {
    const ctx = await this.repo.getCampaignCompany(campaignId, campaignCompanyId);
    if (!ctx) throw new NotFoundSalesError('This company is not in the campaign.', 'CAMPAIGN_COMPANY_NOT_FOUND');
    if (!actor.is_admin && ctx.assigned_to !== actor.emp_id) throw new ForbiddenSalesError('This company is assigned to someone else.');
    return { items: await this.repo.listCalls(campaignCompanyId) };
  }

  // -------------------------------------------------------- dashboards ----

  /** "My Campaigns" and the KPI cards of the signed-in Sales user. Campaigns still in Draft are not shown, and only Active ones are counted. */
  async myDashboard(actor: SalesActor) {
    const stats = await this.repo.employeeStats({ emp_id: actor.emp_id, exclude_draft: true });
    const active = stats.filter((s) => s.campaign_status === 'Active');
    const sum = (f: (s: EmployeeCampaignStats) => number) => active.reduce((n, s) => n + f(s), 0);
    return {
      kpis: {
        active_campaigns: active.length,
        total_assigned: sum((s) => s.assigned),
        pending_calls: sum((s) => s.pending),
        calls_attempted: sum((s) => s.call_attempts),
        calls_completed: sum((s) => s.called),
        connected_calls: sum((s) => s.connected),
        not_received: sum((s) => s.not_received),
        interested: sum((s) => s.interested),
        follow_ups_due: sum((s) => s.follow_ups_due),
        meetings_scheduled: sum((s) => s.meetings_scheduled),
        meetings_completed: sum((s) => s.meetings_completed),
        calls_today: sum((s) => s.calls_today),
        daily_target: sum((s) => s.daily_target),
      },
      campaigns: stats.map((s) => ({
        campaign_id: s.campaign_id,
        name: s.campaign_name,
        status: s.campaign_status,
        assigned: s.assigned,
        called: s.called,
        pending: s.pending,
        meetings: s.meetings_scheduled,
        daily_target: s.daily_target,
        calls_today: s.calls_today,
      })),
    };
  }

  /** Overall campaign performance and the employee-wise table (BFD 6.1 and 7.2). */
  async adminOverview(actor: SalesActor) {
    this.requireAdmin(actor);
    const [kpis, rows] = await Promise.all([this.repo.adminOverview(), this.repo.employeeStats({})]);
    return {
      kpis,
      employees: rows.map((s) => ({
        emp_id: s.emp_id,
        employee: s.emp_name,
        campaign_id: s.campaign_id,
        campaign: s.campaign_name,
        assigned: s.assigned,
        calls: s.call_attempts,
        meetings: s.meetings_scheduled,
        pending: s.pending,
        daily_target: s.daily_target,
        calls_today: s.calls_today,
      })),
    };
  }

  // ------------------------------------------------ campaign performance ----

  /** Admin: every user. A Sales user: only their own row (whatever emp_id is sent). */
  private performanceScope(q: { from?: string; to?: string; emp_id?: number }, actor: SalesActor): UserPerformanceScope {
    if (q.from && q.to && q.to < q.from) {
      throw new FieldValidationError([{ field: 'to', message: 'The To date cannot be before the From date.' }]);
    }
    return {
      from: q.from || undefined,
      to: q.to || undefined,
      emp_id: actor.is_admin ? q.emp_id : actor.emp_id,
      exclude_draft: !actor.is_admin,
    };
  }

  async userPerformance(q: { from?: string; to?: string; emp_id?: number }, actor: SalesActor) {
    const scope = this.performanceScope(q, actor);
    const items = await this.repo.userPerformance(scope);
    return { from: scope.from ?? null, to: scope.to ?? null, items };
  }

  async userCalls(q: { from?: string; to?: string; emp_id?: number }, actor: SalesActor) {
    const scope = this.performanceScope(q, actor);
    if (scope.emp_id === undefined) throw new FieldValidationError([{ field: 'emp_id', message: 'Choose a user.' }]);
    const items = await this.repo.userCalls({ ...scope, emp_id: scope.emp_id });
    return { items };
  }

  async positiveLeads(q: { from?: string; to?: string; emp_id?: number }, actor: SalesActor) {
    const scope = this.performanceScope(q, actor);
    if (scope.emp_id === undefined) throw new FieldValidationError([{ field: 'emp_id', message: 'Choose a user.' }]);
    const items = await this.repo.positiveLeads({ ...scope, emp_id: scope.emp_id });
    return { items };
  }
}
