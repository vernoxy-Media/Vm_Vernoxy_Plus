import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';
import { CreateCandidateDto } from '../../presentation/dto/candidate.dto';
import { CandidateProps } from '../../domain/candidate.entity';

@Injectable()
export class CreateCandidateUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(dto: CreateCandidateDto, adminId?: number): Promise<CandidateProps> {
    // Basic business validation
    if (dto.experience_type === 'experienced') {
      const years = dto.exp_years ?? 0;
      const months = dto.exp_months ?? 0;
      if (years < 0 || years > 50 || months < 0 || months > 11) {
        throw new BadRequestException('Please enter a valid experience.');
      }
    }

    if (dto.source === 'job_portal' && !dto.source_portal) {
      throw new BadRequestException('Please select a job portal.');
    }

    if (dto.source === 'employee_referral' && !dto.referred_by_emp_id) {
      throw new BadRequestException('Please select the referring employee.');
    }

    if (dto.source === 'consultancy' && !dto.consultancy_name?.trim()) {
      throw new BadRequestException('Please enter the consultancy name.');
    }

    if (dto.source === 'campus' && !dto.college_name?.trim()) {
      throw new BadRequestException('Please enter the college name.');
    }

    if (dto.source === 'other' && !dto.source_details?.trim()) {
      throw new BadRequestException('Please specify the source details.');
    }

    const created = await this.candidateRepo.create({
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      email: dto.email.trim().toLowerCase(),
      genderId: dto.gender_id,
      currentLocation: dto.current_location?.trim() || null,
      resumeUrl: dto.resume_url || null,
      resumeFilename: dto.resume_filename || null,
      resumeSize: dto.resume_size || null,
      resumeMime: dto.resume_mime || null,
      roleId: dto.role_id,
      depId: dto.dep_id,
      experienceType: dto.experience_type,
      expYears: dto.experience_type === 'fresher' ? 0 : dto.exp_years || 0,
      expMonths: dto.experience_type === 'fresher' ? 0 : dto.exp_months || 0,
      currentCompany: dto.experience_type === 'fresher' ? null : dto.current_company?.trim() || null,
      currentDesignation: dto.experience_type === 'fresher' ? null : dto.current_designation?.trim() || null,
      currentCtc: dto.experience_type === 'fresher' ? null : dto.current_ctc || null,
      expectedCtc: dto.expected_ctc || null,
      noticePeriod: dto.experience_type === 'fresher' ? null : dto.notice_period || null,
      servingNoticeLwd: dto.serving_notice_lwd ? new Date(dto.serving_notice_lwd) : null,
      keySkills: dto.key_skills || [],
      source: dto.source,
      sourcePortal: dto.source_portal || null,
      referredByEmpId: dto.referred_by_emp_id || null,
      consultancyName: dto.consultancy_name?.trim() || null,
      collegeName: dto.college_name?.trim() || null,
      sourceDetails: dto.source_details?.trim() || null,
      notes: dto.notes?.trim() || null,
      stage: dto.stage?.trim().toLowerCase() || 'new',
      createdBy: adminId || null,
    });

    return created;
  }
}
