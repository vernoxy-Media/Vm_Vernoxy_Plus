import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';
import { assertNoDuplicate } from '../services/duplicate-rules';
import { stripResumeUrl } from '../services/resume-url';

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '').slice(-10);
const lower = (v: unknown) => String(v ?? '').trim().toLowerCase();

@Injectable()
export class UpdateCandidateUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(candidateId: number, data: any, adminId?: number): Promise<CandidateProps> {
    const existing = await this.candidateRepo.findById(candidateId);
    if (!existing) {
      throw new NotFoundException(`Candidate #${candidateId} not found`);
    }

    // Duplicate check only when the phone or email actually changes, so an old record is never
    // blocked from unrelated edits. The record itself and the employee it became do not count.
    const phoneChanged = data.phone !== undefined && digits(data.phone) !== digits(existing.phone);
    const emailChanged = data.email !== undefined && lower(data.email) !== lower(existing.email);
    if (phoneChanged || emailChanged) {
      const matches = await this.candidateRepo.checkDuplicates(
        phoneChanged ? String(data.phone) : '',
        emailChanged ? String(data.email) : '',
        { excludeCandidateId: candidateId, excludeEmpId: existing.convertedToEmpId ?? null },
      );
      assertNoDuplicate(matches);
    }

    const payload = { ...data };
    if (payload.resume_url !== undefined) payload.resume_url = stripResumeUrl(payload.resume_url);

    return this.candidateRepo.update(candidateId, payload, adminId);
  }
}
