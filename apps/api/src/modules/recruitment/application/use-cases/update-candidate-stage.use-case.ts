import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';

@Injectable()
export class UpdateCandidateStageUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepository: ICandidateRepository,
  ) {}

  async execute(candidateId: number, stage: string, updatedBy?: number): Promise<CandidateProps> {
    const existing = await this.candidateRepository.findById(candidateId);
    if (!existing) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found.`);
    }

    const normTarget = stage.toLowerCase().trim();
    const currentStage = existing.stage.toLowerCase().trim();

    // Rule: Before Onboarding, candidate must be Selected first
    if (normTarget === 'onboarding') {
      if (currentStage !== 'selected' && !existing.convertedToEmpId) {
        throw new BadRequestException(
          'Candidate must be marked as Selected with offer details before moving to Onboarding.',
        );
      }
    }

    // Rule: Once converted to employee, cannot revert to earlier pipeline stages
    if (existing.convertedToEmpId && normTarget !== 'onboarding') {
      throw new BadRequestException(
        `Candidate has already been converted to employee ${existing.convertedToEmpCode || `EMP-${existing.convertedToEmpId}`}. Stage cannot be changed.`,
      );
    }

    return this.candidateRepository.updateStage(candidateId, stage, updatedBy);
  }
}
