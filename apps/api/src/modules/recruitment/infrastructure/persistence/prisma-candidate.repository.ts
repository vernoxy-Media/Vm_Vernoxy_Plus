import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ICandidateRepository,
  CandidateFilterParams,
  CandidateStats,
  CandidateDuplicateMatch,
} from '../../application/ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';

@Injectable()
export class PrismaCandidateRepository implements ICandidateRepository {
  private readonly logger = new Logger(PrismaCandidateRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getNextCandidateCode(): Promise<string> {
    const counter = await this.prisma.candidate_counters.findUnique({
      where: { counter_name: 'candidate_code' },
    });
    const nextNum = (counter?.last_number || 0) + 1;
    return `CAN-${String(nextNum).padStart(4, '0')}`;
  }

  async create(
    data: Omit<CandidateProps, 'candidateId' | 'candidateCode' | 'createdAt' | 'updatedAt'>,
  ): Promise<CandidateProps> {
    return this.prisma.$transaction(
      async (tx) => {
        // Increment atomic counter
        const counter = await tx.candidate_counters.upsert({
          where: { counter_name: 'candidate_code' },
          update: { last_number: { increment: 1 } },
          create: { counter_name: 'candidate_code', last_number: 1 },
        });

        const code = `CAN-${String(counter.last_number).padStart(4, '0')}`;

        const created = await tx.candidates.create({
          data: {
            candidate_code: code,
            name: data.name,
            phone: data.phone,
            email: data.email.toLowerCase(),
            gender_id: data.genderId || null,
            current_location: data.currentLocation || null,
            resume_url: data.resumeUrl || null,
            resume_filename: data.resumeFilename || null,
            resume_size: data.resumeSize || null,
            resume_mime: data.resumeMime || null,
            role_id: data.roleId,
            dep_id: data.depId,
            experience_type: data.experienceType,
            exp_years: data.expYears || 0,
            exp_months: data.expMonths || 0,
            current_company: data.currentCompany || null,
            current_designation: data.currentDesignation || null,
            current_ctc: data.currentCtc ? Number(data.currentCtc) : null,
            expected_ctc: data.expectedCtc ? Number(data.expectedCtc) : null,
            notice_period: data.noticePeriod || null,
            serving_notice_lwd: data.servingNoticeLwd || null,
            key_skills: data.keySkills || [],
            source: data.source,
            source_portal: data.sourcePortal || null,
            referred_by_emp_id: data.referredByEmpId || null,
            consultancy_name: data.consultancyName || null,
            college_name: data.collegeName || null,
            source_details: data.sourceDetails || null,
            notes: data.notes || null,
            stage: data.stage || 'new',
            created_by: data.createdBy || null,
          },
        });

        return this.mapToDomain(created);
      },
      { timeout: 15000 },
    );
  }

  private readonly candidateInclude = {
    roles: { select: { role_name: true } },
    departments: { select: { name: true } },
    master_lookup: { select: { label: true } },
    employees_candidates_referred_by_emp_idToemployees: { select: { name: true } },
  };

  async findById(candidateId: number): Promise<CandidateProps | null> {
    const row = await this.prisma.candidates.findUnique({
      where: { candidate_id: candidateId },
      include: this.candidateInclude,
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findMany(params: CandidateFilterParams): Promise<{ items: CandidateProps[]; total: number }> {
    const where: any = {};

    if (params.q) {
      const q = params.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { candidate_code: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.roleId) {
      where.role_id = params.roleId;
    }

    if (params.depId) {
      where.dep_id = params.depId;
    }

    if (params.source) {
      where.source = params.source;
    }

    if (params.stage && params.stage !== 'All') {
      if (params.stage === 'Open') {
        where.stage = { in: ['new', 'screening', 'interviewing', 'on_hold', 'selected', 'onboarding'] };
      } else {
        where.stage = params.stage.toLowerCase();
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.candidates.findMany({
        where,
        include: this.candidateInclude,
        orderBy: { candidate_id: 'desc' },
        skip: params.offset || 0,
        take: params.limit || 10,
      }),
      this.prisma.candidates.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapToDomain(r)),
      total,
    };
  }

  async getStats(): Promise<CandidateStats> {
    const [total, interviewing, selected, onboarding] = await Promise.all([
      this.prisma.candidates.count(),
      this.prisma.candidates.count({ where: { stage: 'interviewing' } }),
      this.prisma.candidates.count({ where: { stage: 'selected' } }),
      this.prisma.candidates.count({ where: { stage: 'onboarding' } }),
    ]);

    return {
      total,
      interviewing,
      selected,
      onboarding,
    };
  }

  async checkDuplicates(phone: string, email: string): Promise<CandidateDuplicateMatch[]> {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanEmail = email.trim().toLowerCase();

    const matches: CandidateDuplicateMatch[] = [];

    // Check existing candidates
    const candMatch = await this.prisma.candidates.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { phone: { contains: cleanPhone } },
        ],
      },
    });

    if (candMatch) {
      matches.push({
        type: 'candidate',
        id: candMatch.candidate_id,
        code: candMatch.candidate_code,
        name: candMatch.name,
        email: candMatch.email,
        phone: candMatch.phone,
        stage: candMatch.stage,
      });
    }

    // Check existing employees
    const empMatch = await this.prisma.employees.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { email: cleanEmail },
          { office_email: cleanEmail },
          { personal_email: cleanEmail },
          { mob: { contains: cleanPhone } },
        ],
      },
    });

    if (empMatch) {
      matches.push({
        type: 'employee',
        id: empMatch.emp_id,
        code: `EMP-${String(empMatch.emp_id).padStart(4, '0')}`,
        name: empMatch.name,
        email: empMatch.email,
        phone: empMatch.mob || '',
        stage: empMatch.status,
      });
    }

    return matches;
  }

  private mapToDomain(row: any): CandidateProps {
    return {
      candidateId: row.candidate_id,
      candidateCode: row.candidate_code,
      name: row.name,
      phone: row.phone,
      email: row.email,
      genderId: row.gender_id,
      currentLocation: row.current_location,
      resumeUrl: row.resume_url,
      resumeFilename: row.resume_filename,
      resumeSize: row.resume_size,
      resumeMime: row.resume_mime,
      roleId: row.role_id,
      depId: row.dep_id,
      experienceType: row.experience_type,
      expYears: row.exp_years,
      expMonths: row.exp_months,
      currentCompany: row.current_company,
      currentDesignation: row.current_designation,
      currentCtc: row.current_ctc ? Number(row.current_ctc) : null,
      expectedCtc: row.expected_ctc ? Number(row.expected_ctc) : null,
      noticePeriod: row.notice_period,
      servingNoticeLwd: row.serving_notice_lwd,
      keySkills: Array.isArray(row.key_skills) ? row.key_skills : [],
      source: row.source,
      sourcePortal: row.source_portal,
      referredByEmpId: row.referred_by_emp_id,
      consultancyName: row.consultancy_name,
      collegeName: row.college_name,
      sourceDetails: row.source_details,
      notes: row.notes,
      stage: row.stage,
      rejectionReason: row.rejection_reason,
      rejectionNotes: row.rejection_notes,
      convertedToEmpId: row.converted_to_emp_id,
      roleName: row.roles?.role_name,
      departmentName: row.departments?.name,
      genderLabel: row.master_lookup?.label,
      referredByName: row.employees_candidates_referred_by_emp_idToemployees?.name,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
