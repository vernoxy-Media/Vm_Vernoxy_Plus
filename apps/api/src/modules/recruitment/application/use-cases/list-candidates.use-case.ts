import { Injectable, Inject } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
  CandidateFilterParams,
} from '../ports/candidate.repository.port';
import { CandidateListResponseDto } from '../../presentation/dto/candidate.dto';

@Injectable()
export class ListCandidatesUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(params: CandidateFilterParams): Promise<CandidateListResponseDto> {
    const [{ items, total }, stats] = await Promise.all([
      this.candidateRepo.findMany(params),
      this.candidateRepo.getStats(),
    ]);

    return {
      items: items.map((c) => ({
        candidate_id: c.candidateId!,
        candidate_code: c.candidateCode,
        name: c.name,
        phone: c.phone,
        email: c.email,
        gender_id: c.genderId || null,
        current_location: c.currentLocation || null,
        resume_url: c.resumeUrl || null,
        resume_filename: c.resumeFilename || null,
        role_id: c.roleId,
        role_name: c.roleName,
        dep_id: c.depId,
        department_name: c.departmentName,
        experience_type: c.experienceType,
        exp_years: c.expYears,
        exp_months: c.expMonths,
        current_company: c.currentCompany || null,
        current_designation: c.currentDesignation || null,
        current_ctc: c.currentCtc || null,
        expected_ctc: c.expectedCtc || null,
        notice_period: c.noticePeriod || null,
        key_skills: c.keySkills || [],
        source: c.source,
        source_portal: c.sourcePortal || null,
        referred_by_emp_id: c.referredByEmpId || null,
        referred_by_name: c.referredByName || null,
        stage: c.stage,
        created_at: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      })),
      total,
      stats,
    };
  }
}
