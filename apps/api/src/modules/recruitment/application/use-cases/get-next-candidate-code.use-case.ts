import { Injectable, Inject } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';

@Injectable()
export class GetNextCandidateCodeUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(): Promise<{ candidate_code: string }> {
    const code = await this.candidateRepo.getNextCandidateCode();
    return { candidate_code: code };
  }
}
