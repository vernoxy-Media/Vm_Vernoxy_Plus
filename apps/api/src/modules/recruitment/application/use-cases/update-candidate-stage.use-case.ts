import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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

    return this.candidateRepository.updateStage(candidateId, stage, updatedBy);
  }
}
