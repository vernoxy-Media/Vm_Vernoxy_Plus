import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ICandidateRepository,
  CandidateFilterParams,
  CandidateStats,
  CandidateDuplicateMatch,
  MarkDecisionParams,
} from '../../application/ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';
import { CleanCandidate, DuplicateHit } from '../../domain/candidate-input-rules';

/** Stages a candidate leaves the pipeline with; "Open" means every stage except these */
const FINISHED_STAGES = ['rejected', 'joined', 'did_not_join'];

/** The candidate columns written from a cleaned candidate, the same for adding and editing */
function candidateColumns(c: CleanCandidate) {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    gender_id: c.genderId,
    current_location: c.currentLocation,
    resume_url: c.resumeUrl,
    resume_filename: c.resumeFilename,
    resume_size: c.resumeSize,
    resume_mime: c.resumeMime,
    role_id: c.roleId,
    dep_id: c.depId,
    experience_type: c.experienceType,
    exp_years: c.expYears,
    exp_months: c.expMonths,
    current_company: c.currentCompany,
    current_designation: c.currentDesignation,
    current_ctc: c.currentCtc,
    expected_ctc: c.expectedCtc,
    notice_period: c.noticePeriod,
    serving_notice_lwd: c.servingNoticeLwd,
    key_skills: c.keySkills,
    source: c.source,
    source_portal: c.sourcePortal,
    referred_by_emp_id: c.referredByEmpId,
    consultancy_name: c.consultancyName,
    college_name: c.collegeName,
    source_details: c.sourceDetails,
    notes: c.notes,
    assigned_to_emp_id: c.assignedToEmpId,
  };
}

@Injectable()
export class PrismaCandidateRepository implements ICandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getNextCandidateCode(): Promise<string> {
    const counter = await this.prisma.entity_counters.findUnique({
      where: {
        entity_type_counter_key: {
          entity_type: 'CANDIDATE',
          counter_key: 'candidate_code',
        },
      },
    });
    const nextNum = (counter?.last_number || 0) + 1;
    return `CAN-${String(nextNum).padStart(4, '0')}`;
  }

  async create(data: CleanCandidate, createdBy?: number | null): Promise<CandidateProps> {
    return this.prisma.$transaction(
      async (tx) => {
        // Increment atomic counter
        const counter = await tx.entity_counters.upsert({
          where: {
            entity_type_counter_key: {
              entity_type: 'CANDIDATE',
              counter_key: 'candidate_code',
            },
          },
          update: { last_number: { increment: 1 } },
          create: { entity_type: 'CANDIDATE', counter_key: 'candidate_code', last_number: 1 },
        });

        const code = `CAN-${String(counter.last_number).padStart(4, '0')}`;

        const created = await tx.candidates.create({
          data: {
            candidate_code: code,
            ...candidateColumns(data),
            stage: data.stage,
            created_by: createdBy ?? null,
          },
          include: this.candidateInclude,
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
    employees_candidates_converted_to_emp_idToemployees: { select: { employee_code: true } },
    employees_candidates_assigned_to_emp_idToemployees: { select: { name: true } },
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
        { roles: { role_name: { contains: q, mode: 'insensitive' } } },
        { departments: { name: { contains: q, mode: 'insensitive' } } },
        { source: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.experienceType && params.experienceType.toLowerCase() !== 'all') {
      where.experience_type = { equals: params.experienceType.toLowerCase(), mode: 'insensitive' };
    }

    if (params.startDate || params.endDate) {
      where.created_at = {};
      if (params.startDate) {
        where.created_at.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
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
        // Every stage still in the pipeline, also the ones added in Master Data
        where.stage = { notIn: FINISHED_STAGES };
      } else {
        where.stage = params.stage.toLowerCase();
      }
    }

    if (params.assignedTo) {
      where.assigned_to_emp_id = params.assignedTo;
    }

    const dir = params.sortDir === 'asc' ? 'asc' : 'desc';
    const orderBy: any[] = (() => {
      switch (params.sortBy) {
        case 'candidate_code':
          return [{ candidate_id: dir }];
        case 'name':
          return [{ name: dir }];
        case 'position':
          return [{ roles: { role_name: dir } }];
        case 'department':
          return [{ departments: { name: dir } }];
        case 'experience':
          return [{ exp_years: dir }, { exp_months: dir }];
        case 'source':
          return [{ source: dir }];
        case 'stage':
          return [{ stage: dir }];
        case 'applied_date':
        default:
          return [{ created_at: dir }];
      }
    })();
    // The same order every time, also between equal values, so paging never repeats or skips a candidate
    orderBy.push({ candidate_id: dir });

    const [rows, total] = await Promise.all([
      this.prisma.candidates.findMany({
        where,
        include: this.candidateInclude,
        orderBy,
        skip: params.offset || 0,
        take: Math.min(Math.max(params.limit || 10, 1), 10000),
      }),
      this.prisma.candidates.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapToDomain(r)),
      total,
    };
  }

  async getStats(assignedTo?: number): Promise<CandidateStats> {
    const scope = assignedTo ? { assigned_to_emp_id: assignedTo } : {};
    const [total, interviewing, selected, onboarding] = await Promise.all([
      this.prisma.candidates.count({ where: scope }),
      this.prisma.candidates.count({ where: { ...scope, stage: 'interviewing' } }),
      this.prisma.candidates.count({ where: { ...scope, stage: 'selected' } }),
      this.prisma.candidates.count({ where: { ...scope, stage: 'onboarding' } }),
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
        code: empMatch.employee_code ?? `EMP-${String(empMatch.emp_id).padStart(4, '0')}`,
        name: empMatch.name,
        email: empMatch.email,
        phone: empMatch.mob || '',
        stage: empMatch.status,
      });
    }

    return matches;
  }

  async findDuplicate(email: string, phone: string, excludeCandidateId?: number): Promise<DuplicateHit | null> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    const cand = await this.prisma.candidates.findFirst({
      where: {
        ...(excludeCandidateId ? { candidate_id: { not: excludeCandidateId } } : {}),
        OR: [{ email: { equals: cleanEmail, mode: 'insensitive' } }, ...(cleanPhone ? [{ phone: { endsWith: cleanPhone } }] : [])],
      },
      select: { candidate_code: true, name: true, email: true, stage: true },
      orderBy: { candidate_id: 'desc' },
    });
    if (cand) {
      return {
        type: 'candidate',
        matchedOn: cand.email.toLowerCase() === cleanEmail ? 'email' : 'phone',
        code: cand.candidate_code,
        name: cand.name,
        stage: cand.stage,
      };
    }

    // A former (Inactive) employee may apply again; a current or joining employee is already on the team
    const emp = await this.prisma.employees.findFirst({
      where: {
        deleted_at: null,
        status: { in: ['Active', 'Onboarding'] },
        OR: [
          { email: { equals: cleanEmail, mode: 'insensitive' } },
          { office_email: { equals: cleanEmail, mode: 'insensitive' } },
          { personal_email: { equals: cleanEmail, mode: 'insensitive' } },
          ...(cleanPhone ? [{ mob: { endsWith: cleanPhone } }] : []),
        ],
      },
      select: { emp_id: true, employee_code: true, name: true, email: true, office_email: true, personal_email: true, status: true },
    });
    if (emp) {
      const emails = [emp.email, emp.office_email, emp.personal_email].filter(Boolean).map((e) => String(e).toLowerCase());
      return {
        type: 'employee',
        matchedOn: emails.includes(cleanEmail) ? 'email' : 'phone',
        code: emp.employee_code ?? `EMP-${String(emp.emp_id).padStart(4, '0')}`,
        name: emp.name,
        stage: emp.status,
      };
    }
    return null;
  }

  async roleBelongsToDepartment(roleId: number, depId: number): Promise<boolean> {
    const role = await this.prisma.roles.findFirst({ where: { role_id: roleId, dep_id: depId, deleted_at: null }, select: { role_id: true } });
    return Boolean(role);
  }

  async isActiveEmployee(empId: number): Promise<boolean> {
    const emp = await this.prisma.employees.findFirst({ where: { emp_id: empId, deleted_at: null, status: 'Active' }, select: { emp_id: true } });
    return Boolean(emp);
  }

  async activeStageCodes(): Promise<string[]> {
    const rows = await this.prisma.master_lookup.findMany({
      where: { lookup_type: 'candidate_stage', is_active: true, deleted_at: null },
      select: { code: true },
    });
    return rows.map((r) => r.code.toLowerCase());
  }

  async setAssignee(candidateId: number, empId: number | null, _updatedBy?: number | null): Promise<CandidateProps> {
    const updated = await this.prisma.candidates.update({
      where: { candidate_id: candidateId },
      data: { assigned_to_emp_id: empId, updated_at: new Date() },
      include: this.candidateInclude,
    });
    return this.mapToDomain(updated);
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

  async update(candidateId: number, data: CleanCandidate, _updatedBy?: number | null): Promise<CandidateProps> {
    const existing = await this.prisma.candidates.findUnique({ where: { candidate_id: candidateId }, select: { candidate_id: true } });
    if (!existing) {
      throw new NotFoundException(`Candidate #${candidateId} not found`);
    }

    // Every column is written from the cleaned candidate; the stage is left alone (it has its own actions)
    const updated = await this.prisma.candidates.update({
      where: { candidate_id: candidateId },
      data: { ...candidateColumns(data), updated_at: new Date() },
      include: this.candidateInclude,
    });

    return this.mapToDomain(updated);
  }

  async getNextEmployeeCode(): Promise<{ nextEmpId: number; nextEmpCode: string }> {
    const result = await this.prisma.employees.aggregate({
      _max: { emp_id: true },
    });
    const nextId = (result._max.emp_id || 0) + 1;
    // The Employee ID comes from its own counter, not from the internal id: it has no holes
    const [counter] = await this.prisma.$queryRaw<Array<{ last_number: number }>>`
      SELECT last_number FROM entity_counters WHERE entity_type = 'EMPLOYEE' AND counter_key = 'all'
    `;
    const nextCode = `EMP-${String((counter?.last_number ?? 0) + 1).padStart(4, '0')}`;
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
        `Candidate has already been converted to employee ${(candidate as any).employees_candidates_converted_to_emp_idToemployees?.employee_code ?? `EMP-${String(candidate.converted_to_emp_id).padStart(4, '0')}`}.`,
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
        `Office email "${officeEmail}" is already in use by employee ${existingEmployee.name} (${existingEmployee.employee_code ?? `EMP-${String(existingEmployee.emp_id).padStart(4, '0')}`}).`,
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
          notice_period: candidate.notice_period || null,
          probation_period: '3 Months',
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

      // 3. The designation, the way every other employee keeps it (employee_roles), so lists and profiles show it
      await tx.employee_roles.upsert({
        where: { emp_id_role_id: { emp_id: createdEmployee.emp_id, role_id: finalRoleId } },
        create: {
          emp_id: createdEmployee.emp_id,
          role_id: finalRoleId,
          dep_id: finalDepId,
          is_primary: true,
          created_by: adminId || null,
        },
        update: { dep_id: finalDepId, is_primary: true },
      });

      // 4. Update candidate
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
          employee_code: createdEmployee.employee_code ?? `EMP-${String(createdEmployee.emp_id).padStart(4, '0')}`,
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
      convertedToEmpCode: row.converted_to_emp_id
        ? row.employees_candidates_converted_to_emp_idToemployees?.employee_code ?? `EMP-${String(row.converted_to_emp_id).padStart(4, '0')}`
        : null,
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
      assignedToEmpId: row.assigned_to_emp_id ?? null,
      assignedToName: row.employees_candidates_assigned_to_emp_idToemployees?.name ?? null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
