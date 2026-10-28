import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ICandidateRepository,
  CandidateFilterParams,
  CandidateStats,
  CandidateDuplicateMatch,
  MarkDecisionParams,
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
    roles_candidates_final_role_idToroles: { select: { role_name: true } },
    departments_candidates_final_dep_idTodepartments: { select: { name: true } },
    employees_candidates_reporting_manager_idToemployees: { select: { name: true } },
    employees_candidates_decision_byToemployees: { select: { name: true } },
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

  async updateStage(candidateId: number, stage: string, updatedBy?: number): Promise<CandidateProps> {
    const updated = await this.prisma.candidates.update({
      where: { candidate_id: candidateId },
      data: {
        stage,
        updated_at: new Date(),
      },
      include: this.candidateInclude,
    });
    return this.mapToDomain(updated);
  }

  async markDecision(
    candidateId: number,
    data: MarkDecisionParams,
    decisionBy?: number,
  ): Promise<CandidateProps> {
    const updatePayload: any = {
      stage: data.decision,
      decision_date: new Date(),
      decision_by: decisionBy || null,
      updated_at: new Date(),
    };

    if (data.decision === 'selected') {
      updatePayload.final_role_id = data.finalRoleId || null;
      updatePayload.final_dep_id = data.finalDepId || null;
      updatePayload.offered_ctc = data.offeredCtc ? Number(data.offeredCtc) : null;
      updatePayload.expected_joining_date = data.expectedJoiningDate || null;
      updatePayload.reporting_manager_id = data.reportingManagerId || null;
      updatePayload.employment_type = data.employmentType || null;
      updatePayload.decision_notes = data.notes || null;
      // Reset rejection & on hold
      updatePayload.on_hold_review_date = null;
      updatePayload.on_hold_notes = null;
      updatePayload.rejection_reason = null;
      updatePayload.rejection_notes = null;
      updatePayload.send_regret_email = false;
    } else if (data.decision === 'on_hold') {
      updatePayload.on_hold_review_date = data.onHoldReviewDate || null;
      updatePayload.on_hold_notes = data.onHoldNotes || data.notes || null;
      // Reset rejection
      updatePayload.rejection_reason = null;
      updatePayload.rejection_notes = null;
      updatePayload.send_regret_email = false;
    } else if (data.decision === 'rejected') {
      updatePayload.rejection_reason = data.rejectionReason || null;
      updatePayload.rejection_notes = data.rejectionNotes || data.notes || null;
      updatePayload.send_regret_email = Boolean(data.sendRegretEmail);
      // Reset on hold
      updatePayload.on_hold_review_date = null;
      updatePayload.on_hold_notes = null;
    }

    const updated = await this.prisma.candidates.update({
      where: { candidate_id: candidateId },
      data: updatePayload,
      include: this.candidateInclude,
    });

    return this.mapToDomain(updated);
  }

  async getNextEmployeeCode(): Promise<{ nextEmpId: number; nextEmpCode: string }> {
    const result = await this.prisma.employees.aggregate({
      _max: { emp_id: true },
    });
    const nextId = (result._max.emp_id || 0) + 1;
    const nextCode = `EMP-${String(nextId).padStart(4, '0')}`;
    return { nextEmpId: nextId, nextEmpCode: nextCode };
  }

  async convertToEmployee(
    candidateId: number,
    officeEmail: string,
    adminId?: number,
  ): Promise<{ employee: { emp_id: number; name: string; email: string; employee_code: string }; candidate: CandidateProps }> {
    const candidate = await this.prisma.candidates.findUnique({
      where: { candidate_id: candidateId },
      include: this.candidateInclude,
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found.`);
    }

    if (candidate.converted_to_emp_id) {
      throw new BadRequestException(
        `Candidate has already been converted to employee EMP-${String(candidate.converted_to_emp_id).padStart(4, '0')}.`,
      );
    }

    const normalizedEmail = officeEmail.trim().toLowerCase();
    const existingEmployee = await this.prisma.employees.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { office_email: { equals: normalizedEmail, mode: 'insensitive' } },
        ],
        deleted_at: null,
      },
    });

    if (existingEmployee) {
      throw new BadRequestException(
        `Office email "${officeEmail}" is already in use by employee ${existingEmployee.name} (EMP-${String(existingEmployee.emp_id).padStart(4, '0')}).`,
      );
    }

    const finalRoleId = candidate.final_role_id || candidate.role_id;
    const finalDepId = candidate.final_dep_id || candidate.dep_id;
    const joiningDate = candidate.expected_joining_date || new Date();
    const salary = candidate.offered_ctc ? Number(candidate.offered_ctc) : candidate.expected_ctc ? Number(candidate.expected_ctc) : 0;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create employee
      const createdEmployee = await tx.employees.create({
        data: {
          name: candidate.name,
          email: normalizedEmail,
          office_email: normalizedEmail,
          mob: candidate.phone,
          personal_email: candidate.email,
          gender_id: candidate.gender_id,
          dep_id: finalDepId,
          role_id: finalRoleId,
          reporting_manager: candidate.reporting_manager_id || null,
          joining_date: joiningDate,
          salary: salary,
          status: 'Onboarding' as any,
          created_by: adminId || null,
        },
      });

      // 2. Set employee_departments
      await tx.employee_departments.upsert({
        where: {
          emp_id_dep_id: { emp_id: createdEmployee.emp_id, dep_id: finalDepId },
        },
        create: {
          emp_id: createdEmployee.emp_id,
          dep_id: finalDepId,
          is_primary: true,
          created_by: adminId || null,
        },
        update: {
          is_primary: true,
        },
      });

      // 3. Update candidate
      const updatedCandidate = await tx.candidates.update({
        where: { candidate_id: candidateId },
        data: {
          stage: 'onboarding',
          converted_to_emp_id: createdEmployee.emp_id,
          updated_at: new Date(),
        },
        include: this.candidateInclude,
      });

      return {
        employee: {
          emp_id: createdEmployee.emp_id,
          name: createdEmployee.name,
          email: createdEmployee.email,
          employee_code: `EMP-${String(createdEmployee.emp_id).padStart(4, '0')}`,
        },
        candidate: this.mapToDomain(updatedCandidate),
      };
    });

    return result;
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
      convertedToEmpCode: row.converted_to_emp_id ? `EMP-${String(row.converted_to_emp_id).padStart(4, '0')}` : null,
      roleName: row.roles?.role_name,
      departmentName: row.departments?.name,
      genderLabel: row.master_lookup?.label,
      referredByName: row.employees_candidates_referred_by_emp_idToemployees?.name,
      finalRoleId: row.final_role_id,
      finalRoleName: row.roles_candidates_final_role_idToroles?.role_name,
      finalDepId: row.final_dep_id,
      finalDepartmentName: row.departments_candidates_final_dep_idTodepartments?.name,
      offeredCtc: row.offered_ctc ? Number(row.offered_ctc) : null,
      expectedJoiningDate: row.expected_joining_date,
      reportingManagerId: row.reporting_manager_id,
      reportingManagerName: row.employees_candidates_reporting_manager_idToemployees?.name,
      employmentType: row.employment_type,
      decisionNotes: row.decision_notes,
      onHoldReviewDate: row.on_hold_review_date,
      onHoldNotes: row.on_hold_notes,
      sendRegretEmail: Boolean(row.send_regret_email),
      decisionDate: row.decision_date,
      decisionBy: row.decision_by,
      decisionByName: row.employees_candidates_decision_byToemployees?.name,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
