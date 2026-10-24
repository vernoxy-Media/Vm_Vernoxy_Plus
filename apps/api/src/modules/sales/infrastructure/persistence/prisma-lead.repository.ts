import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  LeadRepositoryPort,
  LeadRecord,
  CreateLeadParams,
  UpdateLeadParams,
  UpdateLeadStageParams,
  ListLeadsParams,
  StageMetrics,
  LeadMastersResult,
} from '../../domain/ports/lead.repository.port';

@Injectable()
export class PrismaLeadRepository implements LeadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListLeadsParams): Promise<{ leads: LeadRecord[]; metrics: StageMetrics }> {
    const where: any = {
      deleted_at: null,
    };

    if (params.status && params.status.trim() !== '' && params.status !== 'all') {
      where.lead_stage = {
        equals: params.status,
        mode: 'insensitive',
      };
    }

    if (params.is_gidc !== undefined) {
      where.is_gidc = params.is_gidc;
    }

    if (params.gidc_name && params.gidc_name.trim() !== '') {
      where.gidc_name = params.gidc_name;
    }

    if (params.lead_source && params.lead_source.trim() !== '') {
      where.lead_source = params.lead_source;
    }

    if (params.lead_by_id) {
      where.lead_by_id = params.lead_by_id;
    }

    if (params.service_fit && params.service_fit.trim() !== '') {
      where.service_fit = params.service_fit;
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim();
      where.OR = [
        { company_name: { contains: term, mode: 'insensitive' } },
        { contact_person: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { mobile: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { gidc_name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const leads = (await this.prisma.leads.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        employees_leads_owner_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            mob: true,
            profile_picture: true,
          },
        },
        pipeline_stages: {
          select: {
            pipeline_stage_id: true,
            name: true,
            sort_order: true,
          },
        },
        companies: {
          select: {
            company_id: true,
            name: true,
          },
        },
      },
    })) as unknown as LeadRecord[];

    const allActiveLeads = await this.prisma.leads.findMany({
      where: { deleted_at: null },
      select: {
        lead_id: true,
        lead_stage: true,
        estimated_turnover: true,
        expected_value: true,
      },
    });

    const stageMetrics: Record<string, { count: number; totalValue: number }> = {
      New: { count: 0, totalValue: 0 },
      Contacted: { count: 0, totalValue: 0 },
      Qualified: { count: 0, totalValue: 0 },
      Converted: { count: 0, totalValue: 0 },
      Lost: { count: 0, totalValue: 0 },
      'On Hold': { count: 0, totalValue: 0 },
    };

    let totalPipelineValue = 0;
    let totalLeadsCount = 0;

    for (const l of allActiveLeads) {
      const stage = l.lead_stage || 'New';
      const val = Number(l.estimated_turnover || l.expected_value || 0);
      if (!stageMetrics[stage]) {
        stageMetrics[stage] = { count: 0, totalValue: 0 };
      }
      stageMetrics[stage].count += 1;
      stageMetrics[stage].totalValue += val;

      totalLeadsCount += 1;
      totalPipelineValue += val;
    }

    return {
      leads,
      metrics: {
        totalLeadsCount,
        totalPipelineValue,
        stageMetrics,
      },
    };
  }

  async getById(id: number): Promise<LeadRecord | null> {
    const lead = await this.prisma.leads.findFirst({
      where: {
        lead_id: id,
        deleted_at: null,
      },
      include: {
        employees_leads_owner_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            mob: true,
            profile_picture: true,
          },
        },
        pipeline_stages: true,
        companies: true,
      },
    });

    return lead as unknown as LeadRecord | null;
  }

  async create(params: CreateLeadParams, currentEmpId: number): Promise<LeadRecord> {
    const stageName = params.status || 'New';

    let stage = await this.prisma.pipeline_stages.findFirst({
      where: {
        name: { equals: stageName, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    if (!stage) {
      stage = await this.prisma.pipeline_stages.findFirst({
        where: { deleted_at: null },
        orderBy: { sort_order: 'asc' },
      });
    }

    const assignedLeadById = params.lead_by_id || currentEmpId;

    const lead = await this.prisma.leads.create({
      data: {
        title: params.company_name,
        company_name: params.company_name,
        no_of_branches: params.no_of_branches ?? 0,
        no_of_plants: params.no_of_plants ?? 0,
        full_address: params.full_address,
        city: params.city,
        state: params.state,
        country: params.country || 'India',
        pin: params.pin,
        google_maps_url: params.google_maps_url,
        is_gidc: params.is_gidc ?? false,
        gidc_name: params.gidc_name,
        gidc_area_phase: params.gidc_area_phase,
        contact_person: params.contact_person,
        designation: params.designation,
        mobile: params.mobile,
        email: params.email,
        nature_of_business: params.nature_of_business,
        industry: params.industry,
        industry_id: params.industry_id,
        products_services: params.products_services,
        estimated_employees: params.estimated_employees,
        estimated_turnover: params.estimated_turnover,
        year_established: params.year_established,
        existing_major_clients: params.existing_major_clients,
        website: params.website,
        website_quality: params.website_quality,
        developed_by: params.developed_by,
        linkedin_url: params.linkedin_url,
        instagram_url: params.instagram_url,
        facebook_url: params.facebook_url,
        youtube_url: params.youtube_url,
        google_business_profile_url: params.google_business_profile_url,
        brochure_url: params.brochure_url,
        lead_source: params.lead_source || 'Cold calling',
        lead_by_id: assignedLeadById,
        service_fit: params.service_fit,
        lead_stage: stageName,
        pipeline_stage_id: stage ? stage.pipeline_stage_id : 1,
        owner_id: assignedLeadById,
        created_by: currentEmpId,
      },
      include: {
        employees_leads_owner_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return lead as unknown as LeadRecord;
  }

  async update(id: number, params: UpdateLeadParams, currentEmpId: number): Promise<LeadRecord> {
    const existing = await this.prisma.leads.findFirst({
      where: { lead_id: id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Lead #${id} not found`);
    }

    const stageName = params.status || existing.lead_stage || 'New';
    let stage = await this.prisma.pipeline_stages.findFirst({
      where: {
        name: { equals: stageName, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    const updated = await this.prisma.leads.update({
      where: { lead_id: id },
      data: {
        title: params.company_name || existing.title,
        company_name: params.company_name,
        no_of_branches: params.no_of_branches,
        no_of_plants: params.no_of_plants,
        full_address: params.full_address,
        city: params.city,
        state: params.state,
        country: params.country,
        pin: params.pin,
        google_maps_url: params.google_maps_url,
        is_gidc: params.is_gidc,
        gidc_name: params.gidc_name,
        gidc_area_phase: params.gidc_area_phase,
        contact_person: params.contact_person,
        designation: params.designation,
        mobile: params.mobile,
        email: params.email,
        nature_of_business: params.nature_of_business,
        industry: params.industry,
        industry_id: params.industry_id,
        products_services: params.products_services,
        estimated_employees: params.estimated_employees,
        estimated_turnover: params.estimated_turnover,
        year_established: params.year_established,
        existing_major_clients: params.existing_major_clients,
        website: params.website,
        website_quality: params.website_quality,
        developed_by: params.developed_by,
        linkedin_url: params.linkedin_url,
        instagram_url: params.instagram_url,
        facebook_url: params.facebook_url,
        youtube_url: params.youtube_url,
        google_business_profile_url: params.google_business_profile_url,
        brochure_url: params.brochure_url,
        lead_source: params.lead_source,
        lead_by_id: params.lead_by_id,
        service_fit: params.service_fit,
        lead_stage: stageName,
        pipeline_stage_id: stage ? stage.pipeline_stage_id : existing.pipeline_stage_id,
        updated_at: new Date(),
        updated_by: currentEmpId,
      },
      include: {
        employees_leads_owner_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updated as unknown as LeadRecord;
  }

  async updateStage(id: number, params: UpdateLeadStageParams, currentEmpId: number): Promise<LeadRecord> {
    const existing = await this.prisma.leads.findFirst({
      where: { lead_id: id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Lead #${id} not found`);
    }

    const stage = await this.prisma.pipeline_stages.findFirst({
      where: {
        name: { equals: params.status, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    const isWon = params.status.toLowerCase() === 'converted' || params.status.toLowerCase() === 'won';
    const isLost = params.status.toLowerCase() === 'lost';

    const data: any = {
      lead_stage: params.status,
      pipeline_stage_id: stage ? stage.pipeline_stage_id : existing.pipeline_stage_id,
      updated_at: new Date(),
      updated_by: currentEmpId,
    };

    if (isWon) {
      data.closed_at = new Date();
      if (params.actual_value !== undefined) {
        data.actual_value = params.actual_value;
      }
    } else if (isLost) {
      data.closed_at = new Date();
    } else {
      data.closed_at = null;
    }

    const updated = await this.prisma.leads.update({
      where: { lead_id: id },
      data,
      include: {
        employees_leads_owner_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updated as unknown as LeadRecord;
  }

  async convertToCompany(id: number, currentEmpId: number): Promise<{ message: string; company_id: number; company_name: string; lead: LeadRecord }> {
    const lead = await this.prisma.leads.findFirst({
      where: { lead_id: id, deleted_at: null },
    });

    if (!lead) {
      throw new NotFoundException(`Lead #${id} not found`);
    }

    if (lead.company_id) {
      return {
        message: 'Lead is already converted to a company',
        company_id: lead.company_id,
        company_name: lead.company_name || lead.title || 'Client',
        lead: lead as unknown as LeadRecord,
      };
    }

    const clientType = await this.prisma.customer_types.findFirst({
      where: {
        name: { in: ['Client', 'Lead'] },
        deleted_at: null,
      },
      orderBy: { customer_type_id: 'asc' },
    });

    const fallbackIndustry = await this.prisma.industries.findFirst({
      where: { deleted_at: null },
      orderBy: { industry_id: 'asc' },
    });

    const companyName = lead.company_name || lead.title || 'Unnamed Company';

    const company = await this.prisma.companies.create({
      data: {
        name: companyName,
        customer_type_id: clientType ? clientType.customer_type_id : 1,
        industry_id: lead.industry_id || (fallbackIndustry ? fallbackIndustry.industry_id : 5),
        address: lead.full_address,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        owner_id: lead.lead_by_id || currentEmpId,
        created_by: currentEmpId,
      },
    });

    if (lead.contact_person && lead.contact_person.trim() !== '') {
      const person = await this.prisma.persons.create({
        data: {
          name: lead.contact_person,
          email: lead.email,
          mobile: lead.mobile,
          linkedin_url: lead.linkedin_url,
          created_by: currentEmpId,
        },
      });

      await this.prisma.company_persons.create({
        data: {
          company_id: company.company_id,
          person_id: person.person_id,
          designation: lead.designation,
          is_primary: true,
          created_by: currentEmpId,
        },
      });
    }

    if (lead.website && lead.website.trim() !== '') {
      await this.prisma.company_channels.create({
        data: {
          company_id: company.company_id,
          channel_type: 'website',
          value: lead.website,
          is_primary: true,
          created_by: currentEmpId,
        },
      });
    }

    const updatedLead = await this.prisma.leads.update({
      where: { lead_id: id },
      data: {
        company_id: company.company_id,
        lead_stage: 'Converted',
        closed_at: new Date(),
        updated_at: new Date(),
        updated_by: currentEmpId,
      },
    });

    return {
      message: 'Lead successfully converted to Company and Client Contact',
      company_id: company.company_id,
      company_name: company.name,
      lead: updatedLead as unknown as LeadRecord,
    };
  }

  async delete(id: number, currentEmpId: number): Promise<void> {
    const existing = await this.prisma.leads.findFirst({
      where: { lead_id: id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Lead #${id} not found`);
    }

    await this.prisma.leads.update({
      where: { lead_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by: currentEmpId,
      },
    });
  }

  async getMasters(): Promise<LeadMastersResult> {
    const [
      lookups,
      industries,
      salesUsers,
      stages,
    ] = await Promise.all([
      this.prisma.master_lookup.findMany({
        where: {
          lookup_type: {
            in: [
              'lead_source',
              'service_fit',
              'nature_of_business',
              'gidc_name',
              'gidc_phase',
              'designation',
              'website_quality',
              'lost_reason',
            ],
          },
          deleted_at: null,
          is_active: true,
        },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.industries.findMany({
        where: { deleted_at: null },
        select: { industry_id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.employees.findMany({
        where: {
          deleted_at: null,
          status: 'Active',
        },
        select: {
          emp_id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.pipeline_stages.findMany({
        where: { deleted_at: null, is_active: true },
        orderBy: { sort_order: 'asc' },
      }),
    ]);

    const lead_sources = lookups
      .filter((l) => l.lookup_type === 'lead_source')
      .map((l) => ({ code: l.code, label: l.label }));

    const service_fits = lookups
      .filter((l) => l.lookup_type === 'service_fit')
      .map((l) => ({ code: l.code, label: l.label }));

    const nature_of_business = lookups
      .filter((l) => l.lookup_type === 'nature_of_business')
      .map((l) => ({ code: l.code, label: l.label }));

    const gidc_names = lookups
      .filter((l) => l.lookup_type === 'gidc_name')
      .map((l) => ({ code: l.code, label: l.label }));

    const gidc_phases = lookups
      .filter((l) => l.lookup_type === 'gidc_phase')
      .map((l) => ({ code: l.code, label: l.label }));

    const designations = lookups
      .filter((l) => l.lookup_type === 'designation')
      .map((l) => ({ code: l.code, label: l.label }));

    const website_qualities = lookups
      .filter((l) => l.lookup_type === 'website_quality')
      .map((l) => ({ code: l.code, label: l.label }));

    const lost_reasons = lookups
      .filter((l) => l.lookup_type === 'lost_reason')
      .map((l) => ({ code: l.code, label: l.label }));

    return {
      lead_sources,
      service_fits,
      nature_of_business,
      gidc_names,
      gidc_phases,
      designations,
      website_qualities,
      lost_reasons,
      industries,
      sales_users: salesUsers,
      stages: stages.map((s) => ({
        id: s.pipeline_stage_id,
        name: s.name,
        sort_order: s.sort_order,
      })),
    };
  }
}
