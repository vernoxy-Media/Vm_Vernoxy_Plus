import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY,
  ICandidateRepository,
} from '../ports/candidate.repository.port';
import { CandidateProps } from '../../domain/candidate.entity';

@Injectable()
export class ConvertCandidateToEmployeeUseCase {
  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
  ) {}

  async execute(
    candidateId: number,
    officeEmail: string,
    adminId?: number,
  ): Promise<{
    employee: {
      emp_id: number;
      name: string;
      email: string;
      employee_code: string;
    };
    candidate: CandidateProps;
  }> {
    if (!officeEmail || !officeEmail.trim()) {
      throw new BadRequestException('Office email is required.');
    }

    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found.`);
    }

    if (candidate.convertedToEmpId) {
      throw new BadRequestException(
        `Candidate has already been converted to employee ${candidate.convertedToEmpCode || `EMP-${candidate.convertedToEmpId}`}.`,
      );
    }

    return this.candidateRepo.convertToEmployee(candidateId, officeEmail.trim(), adminId);
  }
}
