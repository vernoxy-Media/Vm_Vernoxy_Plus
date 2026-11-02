import { Inject, Injectable } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';

@Injectable()
export class UpdateCandidateUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(candidateId: number, data: any, adminId?: number): Promise<CandidateProps> {
    return this.candidateRepo.update(candidateId, data, adminId);
  }
}

