import { Injectable, Inject } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';

@Injectable()
export class GetNextEmployeeCodeUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(): Promise<{ next_emp_id: number; next_emp_code: string }> {
    const res = await this.candidateRepo.getNextEmployeeCode();
    return {
      next_emp_id: res.nextEmpId,
      next_emp_code: res.nextEmpCode,
    };
  }
}
