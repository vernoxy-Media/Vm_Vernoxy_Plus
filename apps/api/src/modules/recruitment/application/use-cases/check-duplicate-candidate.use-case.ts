import { Injectable, Inject } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
  CandidateDuplicateMatch,
} from '../ports/candidate.repository.port';

@Injectable()
export class CheckDuplicateCandidateUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(phone: string, email: string): Promise<CandidateDuplicateMatch[]> {
    return this.candidateRepo.checkDuplicates(phone, email);
  }
}
