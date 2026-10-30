import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';

@Injectable()
export class GetCandidateDetailUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(candidateId: number): Promise<CandidateProps> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID #${candidateId} not found.`);
    }
    return candidate;
  }
}
